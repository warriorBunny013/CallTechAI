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

  console.log("[check-availability] Request:", { orgId, date: dateArg });

  if (!orgId) {
    return respond("I'm unable to identify your organisation. Please try again.");
  }

  const supabase = getSupabaseService();

  // Default to today if no date given
  const targetDate =
    typeof dateArg === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateArg)
      ? dateArg
      : new Date().toISOString().slice(0, 10);

  const [year, month, day] = targetDate.split("-").map(Number);
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  const dayName = DAY_NAMES[dateObj.getUTCDay()];

  // Fetch calendar connection + availability settings
  const { data: calConn } = await supabase
    .from("organisation_calendar_connections")
    .select("access_token, refresh_token, token_expiry, calendar_id, availability_settings")
    .eq("organisation_id", orgId)
    .maybeSingle();

  if (!calConn) {
    return respond("Appointment booking isn't set up yet. Please call back later.");
  }

  const rawConn = calConn as Record<string, unknown>;
  const availability = rawConn.availability_settings as {
    days: string[];
    startHour: number;
    endHour: number;
    appointmentDuration: number;
    bufferTime: number;
  } | null;

  const avail = availability ?? {
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    startHour: 9,
    endHour: 17,
    appointmentDuration: 30,
    bufferTime: 15,
  };

  if (!avail.days.includes(dayName)) {
    return respond(
      `We're not available on ${dayName}s. Our available days are: ${avail.days.join(", ")}. What other date works for you?`
    );
  }

  const timezone = process.env.DEFAULT_TIMEZONE ?? "UTC";
  // Convert availability hours from local (business owner's timezone) to UTC
  const dayStart = localToUTC(year, month, day, avail.startHour, 0, timezone);
  const dayEnd   = localToUTC(year, month, day, avail.endHour, 0, timezone);

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
      }
    } catch (e) {
      console.error("[check-availability] Calendar query failed:", e);
    }
  }

  // Build available slots
  const slotStep = avail.appointmentDuration + avail.bufferTime;
  const now = new Date();
  const availableSlots: string[] = [];
  let cursor = new Date(dayStart);

  while (addMinutes(cursor, avail.appointmentDuration) <= dayEnd) {
    const slotEnd = addMinutes(cursor, avail.appointmentDuration);
    if (slotEnd > now) {
      const isBusy = busySlots.some(
        (b) => cursor < new Date(b.end) && slotEnd > new Date(b.start)
      );
      if (!isBusy) {
        availableSlots.push(toHHMM(cursor, timezone));
      }
    }
    cursor = addMinutes(cursor, slotStep);
  }

  const friendlyDate = dateObj.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", timeZone: "UTC",
  });

  if (availableSlots.length === 0) {
    return respond(
      `There are no available slots on ${friendlyDate}. Would you like to check another date?`
    );
  }

  const slotList = availableSlots.slice(0, 6).join(", ");
  return respond(
    `On ${friendlyDate}, available ${avail.appointmentDuration}-minute slots are: ${slotList}. Which time works best for you?`
  );
}
