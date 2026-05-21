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
 * Voice ASR is very unreliable for email — it mishears digits, inserts filler
 * words ("the", "a"), and mangles domain names.  We apply a best-effort
 * normalisation and then validate; if validation still fails the caller is
 * asked to skip email (it is optional).
 *
 * Handles common patterns:
 * - "at" / "at the" / "@" → @
 * - "dot" / "period" → .
 * - "underscore" / "under score" → _
 * - "dash" / "hyphen" → -
 * - Spoken digits ("zero"–"nine") → numeral
 * - Common domain mishearings (e.g. "g mail" → "gmail")
 * - Strips stray filler words between username and domain
 * - Collapses spaces inside the local-part and domain
 */
function normaliseEmail(raw: string): string {
  let s = raw.trim().toLowerCase();

  // ── 1. Replace spoken punctuation ───────────────────────────────────────
  s = s.replace(/\bunderscore\b/g, "_");
  s = s.replace(/\bunder\s+score\b/g, "_");
  s = s.replace(/\bdash\b/g, "-");
  s = s.replace(/\bhyphen\b/g, "-");
  s = s.replace(/\bdot\b/g, ".");
  s = s.replace(/\bperiod\b/g, ".");

  // ── 2. Spoken digits → numerals ─────────────────────────────────────────
  const digitWords: Record<string, string> = {
    zero: "0", one: "1", two: "2", three: "3", four: "4",
    five: "5", six: "6", seven: "7", eight: "8", nine: "9",
  };
  for (const [word, digit] of Object.entries(digitWords)) {
    s = s.replace(new RegExp(`\\b${word}\\b`, "g"), digit);
  }

  // ── 3. Normalise common domain mishearings before converting "@" ─────────
  // "g mail" / "gmail" confusion — ASR sometimes adds a space
  s = s.replace(/\bg\s+mail\b/g, "gmail");
  // "hot mail" → "hotmail", "out look" → "outlook", "yahoo mail" → "yahoomail"
  s = s.replace(/\bhot\s+mail\b/g, "hotmail");
  s = s.replace(/\bout\s+look\b/g, "outlook");
  s = s.replace(/\byahoo\s+mail\b/g, "yahoo");

  // ── 4. Handle "at the <domain>" — filler word after "at" ────────────────
  // "uditi at the gmail" → "uditi@gmail"
  s = s.replace(/\s+at\s+the\s+/g, "@");
  s = s.replace(/\s+at\s+a\s+/g, "@");
  // Standard "at" with surrounding spaces
  s = s.replace(/\s+at\s+/g, "@");
  // Bare "at" word boundary (catches anything remaining)
  s = s.replace(/\bat\b/g, "@");

  // ── 5. Collapse spaces inside each half ─────────────────────────────────
  if (s.includes("@")) {
    const atIdx = s.indexOf("@");
    const local = s.slice(0, atIdx).replace(/\s+/g, "");
    // Remove any stray filler words that crept into the domain portion
    let domain = s.slice(atIdx + 1).replace(/\b(the|a|an)\b/g, "").replace(/\s+/g, "");
    // Ensure domain has a dot — if it ends in known TLDs without dot, insert it
    // e.g. "gmailcom" → "gmail.com", "yahoocom" → "yahoo.com"
    domain = domain.replace(/(gmail|yahoo|hotmail|outlook|icloud|proton|me)(com|net|org|co)$/, "$1.$2");
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
      return respond("Could you tell me your full name so I can book the appointment?");
    }
    if (!date || !time) {
      return respond("I need the date and time for the appointment. Could you confirm those?");
    }
    if (!purpose) {
      return respond("What is this appointment for — for example, a consultation or a checkup?");
    }

    // Email is optional — voice ASR is unreliable for email addresses.
    // Validate if provided; if it looks wrong, book without it rather than
    // blocking the whole booking on a bad transcript.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validatedEmail = customerEmail && emailRegex.test(customerEmail)
      ? customerEmail
      : null;

    if (customerEmail && !validatedEmail) {
      console.warn("[book-appointment] Could not parse email, booking without it:", customerEmail);
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
      validatedEmail ? `Email: ${validatedEmail}` : null,
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
        validatedEmail ? [validatedEmail] : [],
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
      customer_email: validatedEmail ?? null,
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

    const emailLine = validatedEmail
      ? `A calendar invite has been sent to ${validatedEmail}.`
      : "No calendar invite was sent — we didn't catch a valid email address.";

    return respond(
      `You're all booked, ${customerName}! Your ${purpose} appointment is confirmed for ${friendlyDate} at ${friendlyTime}. ` +
        `${emailLine} Is there anything else I can help you with?`
    );
  } catch (err) {
    console.error("[book-appointment] Unhandled error:", err);
    return respond("I ran into an error while booking. Please try again or call us directly.");
  }
}
