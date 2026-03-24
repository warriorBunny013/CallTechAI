/**
 * POST /api/vapi-tools/check-availability
 *
 * Called by VAPI during a live call when the assistant invokes `checkAvailability`.
 *
 * VAPI sends:
 * {
 *   message: {
 *     type: "tool-calls",
 *     toolCallList: [{
 *       id: "call_xxx",
 *       type: "function",
 *       function: { name: "checkAvailability", arguments: '{"date":"2024-12-20"}' }
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
  queryFreeBusy,
  type CalendarConnection,
} from "@/lib/google-calendar";

interface VapiToolCallItem {
  id?: string;
  type?: string;
  // VAPI sends args nested in function
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
  };
}

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

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Always return 200 — VAPI treats any non-200 as "No result returned"
function respond(toolCallId: string, result: string) {
  return NextResponse.json(
    { results: [{ toolCallId, result }] },
    { status: 200 }
  );
}

// GET: health check — lets you verify the cloudflare URL is reachable
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "check-availability" });
}

export async function POST(req: NextRequest) {
  let toolCallId = "unknown";

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      // Body parse failure — return 200 with error message so VAPI shows it
      return respond(toolCallId, "I couldn't process that request. Please try again.");
    }

    // Support both { message: {...} } and flat structure
    const message: VapiMessage = (body.message as VapiMessage) ?? (body as VapiMessage);
    const toolCallList = message.toolCallList ?? [];
    const call = message.call ?? {};

    // VAPI may place assistantId in call.assistantId, call.assistant.id,
    // or message.assistant.id depending on the request version
    const assistantId =
      call.assistantId ??
      call.assistant?.id ??
      message.assistant?.id ??
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

    const args = rawArgs as { date?: string };

    console.log("[check-availability] Request:", {
      assistantId,
      toolCallId,
      args,
      callKeys: Object.keys(call),
      messageAssistantId: message.assistant?.id,
      rawBody: JSON.stringify(body).slice(0, 800),
    });

    if (!assistantId) {
      return respond(toolCallId, "I'm unable to identify the assistant. Please try again.");
    }

    const supabase = getSupabaseService();

    // Look up organisation by VAPI assistant ID
    const { data: org } = await supabase
      .from("organisations")
      .select("id")
      .eq("selected_voice_agent_id", assistantId)
      .maybeSingle();

    if (!org) {
      console.warn("[check-availability] No org found for assistantId:", assistantId);
      return respond(toolCallId, "I'm sorry, I'm unable to check availability right now. Please try again.");
    }

    const organisationId = (org as { id: string }).id;

    // Default to today if no date given
    const targetDate =
      typeof args.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(args.date)
        ? args.date
        : new Date().toISOString().slice(0, 10);

    const [year, month, day] = targetDate.split("-").map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day));
    const dayName = DAY_NAMES[dateObj.getUTCDay()];

    // Fetch calendar connection + availability settings
    const { data: calConn } = await supabase
      .from("organisation_calendar_connections")
      .select("access_token, refresh_token, token_expiry, calendar_id, availability_settings")
      .eq("organisation_id", organisationId)
      .maybeSingle();

    if (!calConn) {
      return respond(toolCallId, "Appointment booking isn't set up yet. Please call back later.");
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
        toolCallId,
        `We're not available on ${dayName}s. Our available days are: ${avail.days.join(", ")}. What other date works for you?`
      );
    }

    const timezone = process.env.DEFAULT_TIMEZONE ?? "UTC";
    const dayStart = new Date(Date.UTC(year, month - 1, day, avail.startHour, 0, 0));
    const dayEnd   = new Date(Date.UTC(year, month - 1, day, avail.endHour, 0, 0));

    // Query Google Calendar free/busy
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    let busySlots: { start: string; end: string }[] = [];

    if (clientId && clientSecret) {
      const calendarId = (rawConn.calendar_id as string | null) ?? "primary";
      const conn: CalendarConnection = {
        organisation_id: organisationId,
        access_token: rawConn.access_token as string | null,
        refresh_token: rawConn.refresh_token as string | null,
        token_expiry: rawConn.token_expiry as string | null,
        calendar_id: calendarId,
      };
      try {
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
        if (accessToken) {
          const freebusy = await queryFreeBusy(
            accessToken, calendarId, dayStart.toISOString(), dayEnd.toISOString()
          );
          busySlots = freebusy.busy;
          console.log("[check-availability] Busy slots:", busySlots);
        }
      } catch (e) {
        console.error("[check-availability] Calendar query failed (proceeding without):", e);
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
        toolCallId,
        `There are no available slots on ${friendlyDate}. Would you like to check another date?`
      );
    }

    const slotList = availableSlots.slice(0, 6).join(", ");
    const result = `On ${friendlyDate}, available ${avail.appointmentDuration}-minute slots are: ${slotList}. Which time works best for you?`;
    console.log("[check-availability] Responding with:", result);
    return respond(toolCallId, result);

  } catch (err) {
    console.error("[check-availability] Unhandled error:", err);
    // Still return 200 — non-200 causes VAPI "No result returned"
    return respond(
      toolCallId,
      "I encountered an error checking availability. Please try again."
    );
  }
}
