/**
 * POST /api/vapi-tools/book-appointment
 *
 * Called by VAPI during a live call when the assistant invokes `scheduleAppointment`.
 * Uses the org's stored Google Calendar OAuth tokens — no VAPI Google OAuth needed.
 *
 * VAPI sends:
 * {
 *   message: {
 *     type: "tool-calls",
 *     toolCallList: [{
 *       id: "call_xxx",
 *       type: "function",
 *       function: { name: "scheduleAppointment", arguments: '{"customerName":"...","customerEmail":"...","date":"...","time":"...","purpose":"..."}' }
 *     }],
 *     call: { id, assistantId }
 *   }
 * }
 *
 * We must ALWAYS return HTTP 200. Any non-200 causes "No result returned" in VAPI.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";
import {
  getValidAccessToken,
  createCalendarEvent,
  queryFreeBusy,
  type CalendarConnection,
} from "@/lib/google-calendar";

interface VapiToolCallItem {
  id?: string;
  type?: string;
  // VAPI sends args nested in function (arguments is a JSON string)
  function?: { name?: string; arguments?: string | Record<string, unknown> };
  // fallback direct fields
  name?: string;
  arguments?: Record<string, unknown>;
}

interface VapiMessage {
  type?: string;
  toolCallList?: VapiToolCallItem[];
  assistant?: { id?: string };
  call?: {
    id?: string;
    assistantId?: string;
    assistant?: { id?: string };
    phoneNumberId?: string;
  };
}

interface BookingArgs {
  customerName?: string;
  customerEmail?: string;
  date?: string;
  time?: string;
  purpose?: string;
  customerPhone?: string;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Always return 200 — VAPI treats any non-200 as "No result returned"
function respond(toolCallId: string, result: string) {
  return NextResponse.json(
    { results: [{ toolCallId, result }] },
    { status: 200 }
  );
}

// GET: health check
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "book-appointment" });
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

export async function POST(req: NextRequest) {
  let toolCallId = "unknown";

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return respond(toolCallId, "I couldn't process that request. Please try again.");
    }

    // Support both { message: {...} } and flat structure
    const message: VapiMessage = (body.message as VapiMessage) ?? (body as VapiMessage);
    const toolCallList = message.toolCallList ?? [];
    const call = message.call ?? {};
    const flatCall = (body as { call?: { id?: string; phoneNumberId?: string; assistantId?: string } }).call;

    // VAPI may place assistantId in call.assistantId, call.assistant.id,
    // or message.assistant.id depending on the request version
    const assistantId =
      call.assistantId ??
      call.assistant?.id ??
      message.assistant?.id ??
      null;
    const vapiCallId =
      call.id ??
      flatCall?.id ??
      (body as { callId?: string }).callId ??
      (body as { message?: { call?: { id?: string } } }).message?.call?.id ??
      null;
    // phoneNumberId is often missing on tool-call payloads unless we check every path
    const vapiPhoneNumberId =
      call.phoneNumberId ??
      flatCall?.phoneNumberId ??
      (body as { phoneNumberId?: string }).phoneNumberId ??
      null;
    const toolCall = toolCallList[0] ?? {};
    toolCallId = toolCall.id ?? "unknown";

    // ── Parse arguments ──────────────────────────────────────────────────
    // VAPI sends: toolCall.function.arguments as a JSON STRING
    // Fallback: toolCall.arguments as an object (older format)
    let rawArgs: Record<string, unknown> = {};
    const fnArgs = toolCall.function?.arguments ?? toolCall.arguments;
    if (typeof fnArgs === "string") {
      try { rawArgs = JSON.parse(fnArgs); } catch { rawArgs = {}; }
    } else if (fnArgs && typeof fnArgs === "object") {
      rawArgs = fnArgs as Record<string, unknown>;
    }
    const args = rawArgs as BookingArgs;

    console.log("[book-appointment] Request:", {
      assistantId,
      toolCallId,
      args,
    });

    if (!assistantId) {
      return respond(toolCallId, "I couldn't identify the assistant. Please try again.");
    }

    const { customerName, customerEmail, date, time, purpose, customerPhone } = args;

    // Validate required fields
    if (!customerName?.trim()) {
      return respond(toolCallId, "Could you tell me your name so I can book the appointment?");
    }
    if (!customerEmail?.trim()) {
      return respond(toolCallId, "What email address should I send your calendar invite to?");
    }
    if (!date || !time) {
      return respond(toolCallId, "I need the date and time for the appointment. Could you confirm those?");
    }
    if (!purpose?.trim()) {
      return respond(toolCallId, "What is the purpose of this appointment — for example, a consultation or checkup?");
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return respond(toolCallId, `That email address doesn't look right. Could you spell it out again?`);
    }

    const [year, month, day] = date.split("-").map(Number);
    if (!year || !month || !day) {
      return respond(toolCallId, "I didn't catch the date. Could you say it again in year-month-day format like 2024-12-20?");
    }

    const parsed = parseTime(time);
    if (!parsed) {
      return respond(toolCallId, "I didn't catch the time. Could you say it again, like 10:30 AM or 2 PM?");
    }

    const supabase = getSupabaseService();

    // Look up org by VAPI assistant ID
    const { data: org } = await supabase
      .from("organisations")
      .select("id, name")
      .eq("selected_voice_agent_id", assistantId)
      .maybeSingle();

    if (!org) {
      return respond(toolCallId, "Booking isn't available right now. Please call back later.");
    }

    const organisationId = (org as { id: string; name: string }).id;
    const orgName = (org as { id: string; name: string }).name ?? "Your Business";

    // Optional: log when VAPI omits phoneNumberId (common) — we still save the booking
    // because org is already verified via selected_voice_agent_id.
    let isFromDashboardPhone = false;
    if (vapiPhoneNumberId) {
      const { data: phoneRecord } = await supabase
        .from("phone_numbers")
        .select("id")
        .eq("organisation_id", organisationId)
        .eq("vapi_phone_number_id", vapiPhoneNumberId)
        .maybeSingle();
      isFromDashboardPhone = !!phoneRecord;
    }

    console.log("[book-appointment] Call context:", {
      vapiCallId,
      vapiPhoneNumberId,
      phoneMatchesDashboard: isFromDashboardPhone,
    });

    // Fetch calendar connection + availability settings
    const { data: calConn } = await supabase
      .from("organisation_calendar_connections")
      .select("access_token, refresh_token, token_expiry, calendar_id, availability_settings")
      .eq("organisation_id", organisationId)
      .maybeSingle();

    if (!calConn) {
      return respond(toolCallId, "The appointment system isn't set up yet. Please call back later.");
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

    // Validate day of week
    const dateObj = new Date(Date.UTC(year, month - 1, day));
    const dayName = DAY_NAMES[dateObj.getUTCDay()];

    if (!avail.days.includes(dayName)) {
      return respond(
        toolCallId,
        `We're not available on ${dayName}s. Our working days are ${avail.days.join(", ")}. Would you like to pick a different day?`
      );
    }

    // Build slot times
    const slotStart = new Date(Date.UTC(year, month - 1, day, parsed.hour, parsed.minute, 0));
    const slotEnd   = addMinutes(slotStart, avail.appointmentDuration);
    const dayStart  = new Date(Date.UTC(year, month - 1, day, avail.startHour, 0, 0));
    const dayEnd    = new Date(Date.UTC(year, month - 1, day, avail.endHour, 0, 0));

    if (slotStart < dayStart || slotEnd > dayEnd) {
      return respond(
        toolCallId,
        `That time is outside our working hours (${avail.startHour}:00–${avail.endHour}:00). Could you choose a time within those hours?`
      );
    }

    if (slotStart < new Date()) {
      return respond(toolCallId, "That time has already passed. Could you choose a future date and time?");
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return respond(toolCallId, "The calendar system isn't configured. Please try again later.");
    }

    const calendarId = (rawConn.calendar_id as string | null) ?? "primary";
    const conn: CalendarConnection = {
      organisation_id: organisationId,
      access_token: rawConn.access_token as string | null,
      refresh_token: rawConn.refresh_token as string | null,
      token_expiry: rawConn.token_expiry as string | null,
      calendar_id: calendarId,
    };

    // Get valid access token, saving refreshed token back to Supabase
    const accessToken = await getValidAccessToken(
      conn,
      clientId,
      clientSecret,
      async (newToken, newExpiry) => {
        await supabase
          .from("organisation_calendar_connections")
          .update({ access_token: newToken, token_expiry: newExpiry } as Record<string, unknown>)
          .eq("organisation_id", organisationId);
      }
    );

    if (!accessToken) {
      return respond(toolCallId, "I couldn't connect to the calendar right now. Please try again later.");
    }

    // Double-check the slot is still free
    try {
      const freebusy = await queryFreeBusy(
        accessToken, calendarId, slotStart.toISOString(), slotEnd.toISOString()
      );
      const conflict = freebusy.busy.some(
        (b) => slotStart < new Date(b.end) && slotEnd > new Date(b.start)
      );
      if (conflict) {
        return respond(
          toolCallId,
          "That slot was just taken. Would you like me to check what other times are available?"
        );
      }
    } catch (e) {
      console.warn("[book-appointment] Freebusy check error (proceeding anyway):", e);
    }

    // Build event details
    const timezone = process.env.DEFAULT_TIMEZONE ?? "UTC";
    const eventSummary = `${purpose} — ${customerName}`;
    const eventDescription = [
      `Customer: ${customerName}`,
      `Email: ${customerEmail}`,
      customerPhone ? `Phone: ${customerPhone}` : null,
      `Booked via ${orgName} AI assistant`,
    ].filter(Boolean).join("\n");

    // Create the Google Calendar event with attendee invite
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
        [customerEmail],  // sends Google Calendar invite to customer
        timezone
      );
      calendarEventId = event.id;
      actualStart = event.start;
      actualEnd = event.end;
    } catch (e) {
      console.error("[book-appointment] Calendar create error:", e);
      return respond(
        toolCallId,
        "I had trouble creating the calendar event. Please try again or contact us directly."
      );
    }

    // Always persist — org is scoped by assistant; VAPI often omits phoneNumberId on tool calls,
    // which previously skipped this insert and broke Telegram + Booked Appointments.
    const { error: insertErr } = await supabase.from("appointments").insert({
      organisation_id: organisationId,
      calendar_event_id: calendarEventId,
      summary: eventSummary,
      description: eventDescription,
      start_at: actualStart,
      end_at: actualEnd,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone ?? null,
      call_id: vapiCallId ?? null,
    } as Record<string, unknown>);

    if (insertErr) {
      console.error("[book-appointment] appointments insert error:", insertErr);
    }

    // Telegram alert is sent after the call ends (VAPI webhook) so AI summary is included.

    // Friendly confirmation
    const friendlyDate = slotStart.toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", timeZone: "UTC",
    });
    const friendlyTime = slotStart.toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC",
    });

    return respond(
      toolCallId,
      `You're all booked, ${customerName}! Your ${purpose} appointment is confirmed for ${friendlyDate} at ${friendlyTime}. ` +
        `A Google Calendar invite has been sent to ${customerEmail}. Is there anything else I can help you with?`
    );
  } catch (err) {
    console.error("[book-appointment] Unhandled error:", err);
    // Still return 200 — non-200 causes VAPI "No result returned"
    return respond(
      toolCallId,
      "I ran into an error while booking. Please try again or call us directly."
    );
  }
}
