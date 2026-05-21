/**
 * POST /api/tools/check-availability
 *
 * Called by ElevenLabs during a live call when the AI invokes the checkAvailability tool.
 *
 * ElevenLabs sends the parameters directly as the JSON body (no wrapper):
 * {
 *   "org_id": "uuid",
 *   "date": "2024-12-20"
 * }
 *
 * We respond with:
 * { "result": "Available times are: 9:00 AM, 11:00 AM, 2:00 PM. Which works best?" }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";
import {
  getValidAccessToken,
  queryFreeBusy,
  localToUTC,
  type CalendarConnection,
} from "@/lib/google-calendar";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function addMinutes(date: Date, mins: number): Date {
  return new Date(date.getTime() + mins * 60_000);
}

function toHHMM(date: Date, timezone: string): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  });
}

function respond(result: string) {
  return NextResponse.json({ result }, { status: 200 });
}

/** Add N calendar days to a YYYY-MM-DD string, returning a new YYYY-MM-DD string. */
function addDays(isoDate: string, n: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/**
 * Normalise a date string (or natural-language keyword) into YYYY-MM-DD.
 * The LLM may send:
 *   - "today" / "tomorrow" / "day after tomorrow"
 *   - "next Monday" / "this Friday"
 *   - "2026-05-22", "05/22/2026", "May 22, 2026", etc.
 * Returns null if we can't parse it.
 */
function normaliseDateString(raw: string, timezone: string): string | null {
  const s = raw.trim().toLowerCase();
  const todayISO = new Date().toLocaleDateString("en-CA", { timeZone: timezone });

  // Natural-language keywords
  if (s === "today") return todayISO;
  if (s === "tomorrow") return addDays(todayISO, 1);
  if (s === "day after tomorrow" || s === "day after") return addDays(todayISO, 2);

  // "next <weekday>" or "this <weekday>"
  const DAY_MAP: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  const weekdayMatch = s.match(/(?:next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
  if (weekdayMatch) {
    const targetDow = DAY_MAP[weekdayMatch[1]];
    const [ty, tm, td] = todayISO.split("-").map(Number);
    const todayDow = new Date(Date.UTC(ty, tm - 1, td)).getUTCDay();
    let diff = targetDow - todayDow;
    if (diff <= 0) diff += 7; // always forward
    return addDays(todayISO, diff);
  }

  // Already YYYY-MM-DD
  const uppered = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(uppered)) return uppered;

  // MM/DD/YYYY or MM-DD-YYYY
  const mdy = uppered.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // DD.MM.YYYY
  const dmy = uppered.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Try native Date.parse for "May 22, 2026" or "22 May 2026"
  const parsed = new Date(uppered);
  if (!isNaN(parsed.getTime())) {
    const utc = new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
    return utc.toISOString().slice(0, 10);
  }

  return null;
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "check-availability (ElevenLabs)" });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return respond("I couldn't process that request. Please try again.");
  }

  const orgId = (body.org_id as string | undefined) ?? null;
  const dateArg = (body.date as string | undefined) ?? null;

  console.log("[check-availability] Request:", { orgId, rawDate: dateArg });

  if (!orgId) {
    return respond("I'm unable to identify your organisation. Please try again.");
  }

  const supabase = getSupabaseService();

  // Parse & normalise date — fall back to today in the configured timezone
  const timezone = process.env.DEFAULT_TIMEZONE ?? "UTC";
  const todayISO = new Date().toLocaleDateString("en-CA", { timeZone: timezone }); // YYYY-MM-DD in local tz
  const nowLocal = new Date(); // used for past-slot filtering

  let targetDate: string;
  if (dateArg) {
    const normalised = normaliseDateString(dateArg, timezone);
    if (normalised) {
      targetDate = normalised;
    } else {
      console.warn("[check-availability] Could not parse date:", dateArg, "— falling back to today");
      targetDate = todayISO;
    }
  } else {
    targetDate = todayISO;
  }

  console.log("[check-availability] Resolved date:", targetDate, "timezone:", timezone);

  const [year, month, day] = targetDate.split("-").map(Number);
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  const dayName = DAY_NAMES[dateObj.getUTCDay()];

  // Fetch calendar connection + availability settings
  const { data: calConn, error: connErr } = await supabase
    .from("organisation_calendar_connections")
    .select("access_token, refresh_token, token_expiry, calendar_id, availability_settings")
    .eq("organisation_id", orgId)
    .maybeSingle();

  if (connErr) {
    console.error("[check-availability] DB error:", connErr);
  }

  if (!calConn) {
    return respond("Appointment booking isn't set up yet. Please call back later.");
  }

  const rawConn = calConn as Record<string, unknown>;
  const storedSettings = rawConn.availability_settings as Record<string, unknown> | null | undefined;

  // Build avail with per-field fallbacks so missing fields don't cause NaN math
  const avail = {
    days: Array.isArray(storedSettings?.days) ? (storedSettings!.days as string[]) : ["Mon", "Tue", "Wed", "Thu", "Fri"],
    startHour: typeof storedSettings?.startHour === "number" ? storedSettings.startHour : 9,
    endHour: typeof storedSettings?.endHour === "number" ? storedSettings.endHour : 17,
    appointmentDuration: typeof storedSettings?.appointmentDuration === "number" ? storedSettings.appointmentDuration : 30,
    bufferTime: typeof storedSettings?.bufferTime === "number" ? storedSettings.bufferTime : 0,
  };

  console.log("[check-availability] Availability settings:", avail, "dayName:", dayName);

  if (!avail.days.includes(dayName)) {
    return respond(
      `We're not available on ${dayName}s. Our available days are: ${avail.days.join(", ")}. What other date works for you?`
    );
  }

  // Convert availability hours from local (business owner's timezone) to UTC
  const dayStart = localToUTC(year, month, day, avail.startHour, 0, timezone);
  const dayEnd   = localToUTC(year, month, day, avail.endHour, 0, timezone);

  console.log("[check-availability] Window UTC:", dayStart.toISOString(), "→", dayEnd.toISOString());

  // Query Google Calendar free/busy
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  let busySlots: { start: string; end: string }[] = [];

  if (clientId && clientSecret) {
    const calendarId = (rawConn.calendar_id as string | null) ?? "primary";
    const conn: CalendarConnection = {
      organisation_id: orgId,
      access_token: rawConn.access_token as string | null,
      refresh_token: rawConn.refresh_token as string | null,
      token_expiry: rawConn.token_expiry as string | null,
      calendar_id: calendarId,
    };
    try {
      const accessToken = await getValidAccessToken(conn, clientId, clientSecret, async (newToken, newExpiry) => {
        await supabase
          .from("organisation_calendar_connections")
          .update({ access_token: newToken, token_expiry: newExpiry } as never)
          .eq("organisation_id", orgId);
      });
      if (accessToken) {
        const freebusy = await queryFreeBusy(accessToken, calendarId, dayStart.toISOString(), dayEnd.toISOString());
        busySlots = freebusy.busy;
        console.log("[check-availability] Busy slots from calendar:", busySlots.length);
      }
    } catch (e) {
      console.error("[check-availability] Calendar query failed (showing all slots):", e);
      // Calendar query failed — still show slots based on availability settings alone
    }
  }

  // Build available slots
  // Ensure slotStep is always a positive integer to prevent infinite loops or NaN math
  const duration = Math.max(1, avail.appointmentDuration);
  const slotStep = duration + Math.max(0, avail.bufferTime);

  // Only filter out past slots when checking TODAY — future dates always show full day
  const isToday = targetDate === todayISO;

  const availableSlots: string[] = [];
  let cursor = new Date(dayStart);

  while (addMinutes(cursor, duration) <= dayEnd) {
    const slotEnd = addMinutes(cursor, duration);

    // Skip slots already in the past — only applies to today
    const isPast = isToday && slotEnd <= nowLocal;

    if (!isPast) {
      const isBusy = busySlots.some(
        (b) => cursor < new Date(b.end) && slotEnd > new Date(b.start)
      );
      if (!isBusy) {
        availableSlots.push(toHHMM(cursor, timezone));
      }
    }
    cursor = addMinutes(cursor, slotStep);
  }

  console.log("[check-availability] Available slots:", availableSlots.length, "isToday:", isToday);

  const friendlyDate = dateObj.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", timeZone: "UTC",
  });

  if (availableSlots.length === 0) {
    if (busySlots.length > 0) {
      return respond(
        `There are no available slots on ${friendlyDate} — the calendar is fully booked. Would you like to check another date?`
      );
    }
    if (isToday) {
      return respond(
        `There are no more available slots today. Would you like to check tomorrow or another date?`
      );
    }
    return respond(
      `There are no available slots on ${friendlyDate}. Would you like to check another date?`
    );
  }

  const slotList = availableSlots.slice(0, 8).join(", ");
  return respond(
    `On ${friendlyDate}, available ${duration}-minute slots are: ${slotList}. Which time works best for you?`
  );
}
