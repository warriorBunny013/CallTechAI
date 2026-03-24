/**
 * VAPI Server-URL Webhook Handler
 *
 * VAPI sends server messages to this URL in two possible shapes:
 *
 * A) Flat call object (legacy / analytics callbacks):
 *    { id, status, recordingUrl, summary, transcript, metadata, phoneNumberId, ... }
 *
 * B) Nested server message (current VAPI server-URL format):
 *    { message: { type: "end-of-call-report", call: {...}, artifact: {...}, analysis: {...} } }
 *
 * We normalise both into a single `callObj` and dispatch Telegram / WhatsApp
 * alerts only when the call came through a phone number registered in the dashboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";
import { dispatchAlerts, buildBookingAlertMessage, type AlertConfig } from "@/lib/alerts";

// ── Type helpers ──────────────────────────────────────────────────────────────

interface VapiCallObj {
  id?: string;
  status?: string;
  assistantId?: string;
  phoneNumberId?: string;      // VAPI phone number ID — always present for inbound calls
  recordingUrl?: string;
  transcript?: string;
  summary?: string;
  analysis?: { summary?: string };
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  customer?: { number?: string };
  metadata?: {
    user_id?: string;
    assistant_id?: string;
    phone_number_id?: string;  // may duplicate phoneNumberId
    caller_phone_number?: string;
    assistant_phone_number?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface VapiServerMessage {
  type?: string;
  endedReason?: string;
  call?: VapiCallObj;
  artifact?: { recordingUrl?: string; transcript?: string };
  analysis?: { summary?: string };
  startedAt?: string;
  endedAt?: string;
}

// ── Normalise both VAPI webhook formats ───────────────────────────────────────

function normalise(body: Record<string, unknown>): {
  callObj: VapiCallObj;
  msgType: string | null;
  recordingUrl: string | null;
  transcript: string | null;
  summary: string | null;
} {
  const msg = body.message as VapiServerMessage | undefined;

  // Format B — wrapped server message
  if (msg && typeof msg === "object") {
    const callObj: VapiCallObj = (msg.call as VapiCallObj) ?? {};
    return {
      callObj,
      msgType: msg.type ?? null,
      recordingUrl:
        (callObj.recordingUrl as string | null) ??
        msg.artifact?.recordingUrl ??
        null,
      transcript:
        (callObj.transcript as string | null) ??
        msg.artifact?.transcript ??
        null,
      summary:
        (callObj.summary as string | null) ??
        msg.analysis?.summary ??
        (callObj.analysis as { summary?: string } | undefined)?.summary ??
        null,
    };
  }

  // Format A — flat call object
  const callObj = body as VapiCallObj;
  return {
    callObj,
    msgType: (body.type as string | null) ?? null,
    recordingUrl: (callObj.recordingUrl as string | null) ?? null,
    transcript: (callObj.transcript as string | null) ?? null,
    summary:
      (callObj.summary as string | null) ??
      (callObj.analysis as { summary?: string } | undefined)?.summary ??
      null,
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    const { callObj, msgType, recordingUrl, transcript, summary } = normalise(body);

    // Ignore non-end-of-call messages (tool calls, status-updates, etc.)
    // Tool calls are handled at /api/vapi-tools/... endpoints.
    if (msgType && msgType !== "end-of-call-report") {
      return NextResponse.json({ received: true });
    }

    const callId = (callObj.id as string | null) ?? null;

    console.log(`[VAPI Webhook] Received end-of-call for call: ${callId}`);

    // ── Extract identifiers ───────────────────────────────────────────────────
    const meta = callObj.metadata ?? {};

    // user_id: set in metadata by us (if applicable). May be absent for pure VAPI inbound calls.
    const user_id = meta.user_id ?? null;

    // phone_number_id: prefer metadata value, fall back to VAPI's direct phoneNumberId field.
    const phone_number_id =
      meta.phone_number_id ??
      (callObj.phoneNumberId as string | null) ??
      null;

    const caller_phone_number =
      meta.caller_phone_number ??
      (callObj.customer as { number?: string } | undefined)?.number ??
      null;

    const assistant_phone_number = meta.assistant_phone_number ?? null;
    const assistant_id = meta.assistant_id ?? (callObj.assistantId as string | null) ?? null;

    // ── Calculate duration ────────────────────────────────────────────────────
    let duration_seconds: number | null = null;
    const dur = callObj.duration as number | undefined;
    if (dur) {
      duration_seconds = Math.floor(dur / 1000);
    } else if (callObj.startedAt && callObj.endedAt) {
      const start = new Date(callObj.startedAt as string).getTime();
      const end = new Date(callObj.endedAt as string).getTime();
      if (!isNaN(start) && !isNaN(end)) {
        duration_seconds = Math.floor((end - start) / 1000);
      }
    }

    // ── Persist call record ───────────────────────────────────────────────────
    // Only store to DB when we have a user_id (data-ownership requirement).
    if (user_id && callId) {
      const serviceSupabase = getSupabaseService();

      const callData = {
        user_id,
        phone_number_id: phone_number_id ?? null,
        assistant_id: assistant_id ?? null,
        vapi_call_id: callId,
        caller_phone_number: caller_phone_number ?? null,
        assistant_phone_number: assistant_phone_number ?? null,
        call_status: (callObj.status as string | null) ?? "completed",
        duration_seconds,
        recording_url: recordingUrl,
        transcript,
        summary,
        analysis: (callObj.analysis as Record<string, unknown> | null) ?? null,
        metadata: callObj.metadata ?? {},
        started_at: callObj.startedAt
          ? new Date(callObj.startedAt as string).toISOString()
          : null,
        ended_at: callObj.endedAt
          ? new Date(callObj.endedAt as string).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      };

      const { data: existingCall } = await serviceSupabase
        .from("calls")
        .select("id")
        .eq("vapi_call_id", callId)
        .single();

      if (existingCall) {
        await serviceSupabase
          .from("calls")
          .update(callData as never)
          .eq("id", (existingCall as { id: string }).id)
          .eq("user_id", user_id);
        console.log(`[VAPI Webhook] Updated call record for: ${callId}`);
      } else {
        await serviceSupabase.from("calls").insert(callData as never);
        console.log(`[VAPI Webhook] Inserted call record for: ${callId}`);
      }
    } else {
      console.log(
        `[VAPI Webhook] No user_id in metadata — skipping call record for: ${callId}`
      );
    }

    // ── Send combined booking + AI summary alert once call ends ──────────────
    void (async () => {
      try {
        if (!callId) return;

        const serviceSupabase = getSupabaseService();

        // Resolve org: prefer dashboard phone match; VAPI often omits phoneNumberId — fall back to assistant
        let organisationId: string | null = null;

        if (phone_number_id) {
          const { data: phoneRecord } = await serviceSupabase
            .from("phone_numbers")
            .select("id, organisation_id")
            .eq("vapi_phone_number_id", phone_number_id)
            .maybeSingle();
          if (phoneRecord) {
            organisationId = (phoneRecord as { organisation_id: string }).organisation_id;
          }
        }

        if (!organisationId && assistant_id) {
          const { data: orgByAssistant } = await serviceSupabase
            .from("organisations")
            .select("id")
            .eq("selected_voice_agent_id", assistant_id)
            .maybeSingle();
          organisationId = (orgByAssistant as { id: string } | null)?.id ?? null;
          if (organisationId) {
            console.log(
              `[VAPI Webhook] Resolved org ${organisationId} via assistant_id (phone_number_id missing or unmatched)`
            );
          }
        }

        if (!organisationId) {
          console.log(
            `[VAPI Webhook] Could not resolve organisation for call ${callId} — skipping booking alert.`
          );
          return;
        }

        // Only alert when this call had a booking (match by VAPI call id)
        const bookingSelect =
          "id, customer_name, customer_email, customer_phone, summary, start_at, end_at, call_id, created_at";

        let booking =
          (
            await serviceSupabase
              .from("appointments")
              .select(bookingSelect)
              .eq("call_id", callId)
              .eq("organisation_id", organisationId)
              .maybeSingle()
          ).data ?? null;

        // VAPI sometimes omits call.id on tool-calls — row may be stored with call_id null
        if (!booking) {
          const sinceIso = new Date(Date.now() - 25 * 60 * 1000).toISOString();
          const { data: orphan } = await serviceSupabase
            .from("appointments")
            .select(bookingSelect)
            .eq("organisation_id", organisationId)
            .is("call_id", null)
            .gte("created_at", sinceIso)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (orphan) {
            const oid = (orphan as { id: string }).id;
            await serviceSupabase
              .from("appointments")
              .update({ call_id: callId } as never)
              .eq("id", oid);
            booking = orphan;
            console.log(`[VAPI Webhook] Linked orphan appointment ${oid} to VAPI call ${callId}`);
          }
        }

        if (!booking) {
          console.log(`[VAPI Webhook] No booking for call ${callId} — skipping alert.`);
          return;
        }

        const { data: alertConfig } = await serviceSupabase
          .from("organisation_alert_configs")
          .select("*")
          .eq("organisation_id", organisationId)
          .maybeSingle();

        if (!alertConfig) return;

        const { data: org } = await serviceSupabase
          .from("organisations")
          .select("name")
          .eq("id", organisationId)
          .maybeSingle();

        const orgName = (org as { name?: string } | null)?.name ?? "Your Business";
        const b = booking as {
          customer_name?: string;
          customer_email?: string;
          customer_phone?: string;
          summary?: string;
          start_at?: string;
          end_at?: string;
        };

        // Format booking date/time from stored start_at
        const timezone = process.env.DEFAULT_TIMEZONE ?? "UTC";
        const startDate = b.start_at ? new Date(b.start_at) : null;
        const friendlyDate = startDate
          ? startDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: timezone })
          : "Unknown date";
        const friendlyTime = startDate
          ? startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: timezone })
          : "Unknown time";

        // Extract purpose from "purpose — customerName" summary format
        const purposeMatch = b.summary?.match(/^(.+?)\s*—/);
        const purpose = purposeMatch ? purposeMatch[1].trim() : (b.summary ?? "Appointment");

        const alertMsg = buildBookingAlertMessage({
          orgName,
          customerName: b.customer_name ?? "Customer",
          customerEmail: b.customer_email ?? "",
          customerPhone: caller_phone_number ?? b.customer_phone ?? undefined,
          purpose,
          date: friendlyDate,
          time: friendlyTime,
          summary: summary ?? undefined,
        });

        await dispatchAlerts(alertConfig as AlertConfig, "new_booking", alertMsg);
        console.log(`[VAPI Webhook] Dispatched booking alert for org: ${organisationId}`);
      } catch (e) {
        console.error("[VAPI Webhook] Alert dispatch error (non-fatal):", e);
      }
    })();

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error("[VAPI Webhook] Error processing webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Handle GET requests (for webhook verification)
export async function GET() {
  return NextResponse.json({ status: "VAPI webhook endpoint active" });
}
