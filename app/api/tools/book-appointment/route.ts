/**
 * POST /api/tools/book-appointment
 *
 * Called by ElevenLabs during a live call when the AI invokes the bookAppointment tool.
 *
 * ElevenLabs sends the parameters directly as the JSON body:
 * {
 *   "org_id": "uuid",
 *   "date": "2024-12-20",
 *   "time": "10:30 AM",
 *   "customer_name": "John Smith",
 *   "customer_email": "john@example.com",
 *   "customer_phone": "+1234567890",  // optional
 *   "purpose": "dental checkup"
 * }
 *
 * We respond with:
 * { "result": "Booking confirmed for ..." }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";
import {
  getValidAccessToken,
  createCalendarEvent,
  queryFreeBusy,
  localToUTC,
  type CalendarConnection,
} from "@/lib/google-calendar";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function respond(result: string) {
  return NextResponse.json({ result }, { status: 200 });
}

function parseTime(timeStr: string): { hour: number; minute: number } | null {
  const m24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) return { hour: parseInt(m24[1], 10), minute: parseInt(m24[2], 10) };

  const m12 = timeStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (m12) {
    let hour = parseInt(m12[1], 10);
    const minute = parseInt(m12[2] ?? "0", 10);
    const period = m12[3].toUpperCase();
    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;
    return { hour, minute };
  }
  return null;
}

function addMinutes(date: Date, mins: number): Date {
  return new Date(date.getTime() + mins * 60_000);
}

/**
 * Normalise a voice-transcribed email address into a valid typed email.
 *
 * Speech-to-text converts spoken emails like:
 *   "uditi zero one three at gmail dot com"
 *   "uditi013 at gmail.com"
 *   "uditi underscore 013 at gmail dot com"
 *
 * into the proper format: uditi013@gmail.com
 *
 * Handles:
 * - "at" / " at " → @
 * - "dot" → .
 * - "underscore" / "under score" → _
 * - "dash" / "hyphen" → -
 * - "zero" → 0, "one" → 1, … "nine" → 9  (when surrounded by letters/digits)
 * - Removes stray spaces between characters
 */
function normaliseEmail(raw: string): string {
  let s = raw.trim().toLowerCase();

  // Replace spoken words for special characters
  s = s.replace(/\bunderscore\b/g, "_");
  s = s.replace(/\bunder score\b/g, "_");
  s = s.replace(/\bdash\b/g, "-");
  s = s.replace(/\bhyphen\b/g, "-");
  s = s.replace(/\bdot\b/g, ".");
  s = s.replace(/\bperiod\b/g, ".");

  // Spoken digits to numerals
  const digitWords: Record<string, string> = {
    zero: "0", one: "1", two: "2", three: "3", four: "4",
    five: "5", six: "6", seven: "7", eight: "8", nine: "9",
  };
  for (const [word, digit] of Object.entries(digitWords)) {
    s = s.replace(new RegExp(`\\b${word}\\b`, "g"), digit);
  }

  // "at" → "@"  (must come after digit replacement to avoid "eight" → "8" then "at" confusion)
  // Match " at " with surrounding spaces, or " at " at start/end
  s = s.replace(/\s+at\s+/g, "@");
  // Edge case: "john at gmail.com" with no spaces captured above
  // Also handle " at" at the very end before the domain if trimmed
  s = s.replace(/\bat\b/g, "@");

  // Remove spaces that snuck in between characters (e.g. "u d i t i" → "uditi")
  // Only collapse spaces that are NOT surrounding "@"
  // Strategy: collapse spaces in the local-part and domain separately
  if (s.includes("@")) {
    const atIdx = s.indexOf("@");
    const local = s.slice(0, atIdx).replace(/\s+/g, "");
    const domain = s.slice(atIdx + 1).replace(/\s+/g, "");
    s = `${local}@${domain}`;
  } else {
    s = s.replace(/\s+/g, "");
  }

  return s;
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "book-appointment (ElevenLabs)" });
}

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return respond("I couldn't process that request. Please try again.");
    }

    const orgId = (body.org_id as string | undefined) ?? null;
    const customerName = (body.customer_name as string | undefined)?.trim() ?? null;
    const rawEmail = (body.customer_email as string | undefined)?.trim() ?? null;
    const date = (body.date as string | undefined) ?? null;
    const time = (body.time as string | undefined) ?? null;
    const purpose = (body.purpose as string | undefined)?.trim() ?? null;
    const customerPhone = (body.customer_phone as string | undefined)?.trim() ?? null;

    // Normalise the email — speech-to-text sends "john at gmail dot com"
    const customerEmail = rawEmail ? normaliseEmail(rawEmail) : null;

    console.log("[book-appointment] Request:", { orgId, customerName, rawEmail, customerEmail, date, time, purpose });

    if (!orgId) {
      return respond("I couldn't identify your organisation. Please try again.");
    }
    if (!customerName) {
      return respond("Could you tell me your name so I can book the appointment?");
    }
    if (!customerEmail) {
      return respond("What email address should I send your calendar invite to?");
    }
    if (!date || !time) {
      return respond("I need the date and time for the appointment. Could you confirm those?");
    }
    if (!purpose) {
      return respond("What is the purpose of this appointment — for example, a consultation or checkup?");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return respond(
        `I want to make sure I have the right email. I heard "${customerEmail}" — could you say it again slowly? ` +
        `For example: "john, at, gmail, dot, com".`
      );
    }

    const [year, month, day] = date.split("-").map(Number);
    if (!year || !month || !day) {
      return respond("I didn't catch the date. Could you say it again in year-month-day format like 2024-12-20?");
    }

    const parsed = parseTime(time);
    if (!parsed) {
      return respond("I didn't catch the time. Could you say it again, like 10:30 AM or 2 PM?");
    }

    const supabase = getSupabaseService();

    // Fetch org info
    const { data: org } = await supabase
      .from("organisations")
      .select("id, name")
      .eq("id", orgId)
      .maybeSingle();

    if (!org) {
      return respond("Booking isn't available right now. Please call back later.");
    }

    const orgName = (org as { name: string }).name ?? "Your Business";

    // Fetch calendar connection
    const { data: calConn } = await supabase
      .from("organisation_calendar_connections")
      .select("access_token, refresh_token, token_expiry, calendar_id, availability_settings")
      .eq("organisation_id", orgId)
      .maybeSingle();

    if (!calConn) {
      return respond("The appointment system isn't set up yet. Please call back later.");
    }

    const rawConn = calConn as Record<string, unknown>;
    const storedSettings = rawConn.availability_settings as Record<string, unknown> | null | undefined;

    // Per-field fallbacks so missing fields don't cause NaN arithmetic
    const avail = {
      days: Array.isArray(storedSettings?.days) ? (storedSettings!.days as string[]) : ["Mon", "Tue", "Wed", "Thu", "Fri"],
      startHour: typeof storedSettings?.startHour === "number" ? storedSettings.startHour : 9,
      endHour: typeof storedSettings?.endHour === "number" ? storedSettings.endHour : 17,
      appointmentDuration: typeof storedSettings?.appointmentDuration === "number" ? storedSettings.appointmentDuration : 30,
      bufferTime: typeof storedSettings?.bufferTime === "number" ? storedSettings.bufferTime : 0,
    };

    const timezone = process.env.DEFAULT_TIMEZONE ?? "UTC";

    const dateObj = new Date(Date.UTC(year, month - 1, day));
    const dayName = DAY_NAMES[dateObj.getUTCDay()];

    if (!avail.days.includes(dayName)) {
      return respond(
        `We're not available on ${dayName}s. Our working days are ${avail.days.join(", ")}. Would you like to pick a different day?`
      );
    }

    // Convert all times from local (business owner's timezone) to UTC
    const slotStart = localToUTC(year, month, day, parsed.hour, parsed.minute, timezone);
    const slotEnd   = addMinutes(slotStart, avail.appointmentDuration);
    const dayStart  = localToUTC(year, month, day, avail.startHour, 0, timezone);
    const dayEnd    = localToUTC(year, month, day, avail.endHour, 0, timezone);

    if (slotStart < dayStart || slotEnd > dayEnd) {
      return respond(
        `That time is outside our working hours (${avail.startHour}:00–${avail.endHour}:00). Could you choose a time within those hours?`
      );
    }

    if (slotStart < new Date()) {
      return respond("That time has already passed. Could you choose a future date and time?");
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return respond("The calendar system isn't configured. Please try again later.");
    }

    const calendarId = (rawConn.calendar_id as string | null) ?? "primary";
    const conn: CalendarConnection = {
      organisation_id: orgId,
      access_token: rawConn.access_token as string | null,
      refresh_token: rawConn.refresh_token as string | null,
      token_expiry: rawConn.token_expiry as string | null,
      calendar_id: calendarId,
    };

    const accessToken = await getValidAccessToken(conn, clientId, clientSecret, async (newToken, newExpiry) => {
      await supabase
        .from("organisation_calendar_connections")
        .update({ access_token: newToken, token_expiry: newExpiry } as never)
        .eq("organisation_id", orgId);
    });

    if (!accessToken) {
      return respond("I couldn't connect to the calendar right now. Please try again later.");
    }

    // Double-check slot is still free
    try {
      const freebusy = await queryFreeBusy(accessToken, calendarId, slotStart.toISOString(), slotEnd.toISOString());
      const conflict = freebusy.busy.some(
        (b) => slotStart < new Date(b.end) && slotEnd > new Date(b.start)
      );
      if (conflict) {
        return respond("That slot was just taken. Would you like me to check what other times are available?");
      }
    } catch (e) {
      console.warn("[book-appointment] Freebusy check error (proceeding):", e);
    }

    const eventSummary = `${purpose} — ${customerName}`;
    const eventDescription = [
      `Customer: ${customerName}`,
      `Email: ${customerEmail}`,
      customerPhone ? `Phone: ${customerPhone}` : null,
      `Booked via ${orgName} AI assistant`,
    ].filter(Boolean).join("\n");

    let calendarEventId: string | null = null;
    let actualStart = slotStart.toISOString();
    let actualEnd = slotEnd.toISOString();

    try {
      const event = await createCalendarEvent(
        accessToken,
        calendarId,
        eventSummary,
        slotStart.toISOString(),
        slotEnd.toISOString(),
        eventDescription,
        [customerEmail],
        timezone
      );
      calendarEventId = event.id;
      actualStart = event.start;
      actualEnd = event.end;
    } catch (e) {
      console.error("[book-appointment] Calendar create error:", e);
      return respond("I had trouble creating the calendar event. Please try again or contact us directly.");
    }

    // Persist appointment to Supabase
    const { error: insertErr } = await supabase.from("appointments").insert({
      organisation_id: orgId,
      calendar_event_id: calendarEventId,
      summary: eventSummary,
      description: eventDescription,
      start_at: actualStart,
      end_at: actualEnd,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone ?? null,
    } as never);

    if (insertErr) {
      console.error("[book-appointment] appointments insert error:", insertErr);
    }

    const friendlyDate = slotStart.toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", timeZone: timezone,
    });
    const friendlyTime = slotStart.toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit", hour12: true, timeZone: timezone,
    });

    return respond(
      `You're all booked, ${customerName}! Your ${purpose} appointment is confirmed for ${friendlyDate} at ${friendlyTime}. ` +
        `A Google Calendar invite has been sent to ${customerEmail}. Is there anything else I can help you with?`
    );
  } catch (err) {
    console.error("[book-appointment] Unhandled error:", err);
    return respond("I ran into an error while booking. Please try again or call us directly.");
  }
}
