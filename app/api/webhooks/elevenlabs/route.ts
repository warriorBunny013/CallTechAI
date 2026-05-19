/**
 * ElevenLabs Conversational AI – Post-Call Webhook Handler
 *
 * ElevenLabs sends a POST to this endpoint after each conversation ends.
 * We use it to:
 *  1. Persist the full call record (transcript, summary, recording URL, duration).
 *  2. Link any orphan appointment created during the call.
 *  3. Dispatch Telegram / WhatsApp booking alerts.
 *
 * Webhook events we handle:
 *  - "post_call_transcription" — sent when call ends with full data
 *
 * Configure this URL in ElevenLabs: Dashboard → Agent → Webhooks → Post-call webhook
 * URL: https://your-domain.com/api/webhooks/elevenlabs
 *
 * For webhook signature verification, set ELEVENLABS_WEBHOOK_SECRET in env vars
 * and ElevenLabs will sign requests with HMAC-SHA256.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseService } from "@/lib/supabase/service";
import { dispatchAlerts, buildBookingAlertMessage, type AlertConfig } from "@/lib/alerts";

// ── ElevenLabs webhook payload types ─────────────────────────────────────────

interface ElevenLabsTranscriptEntry {
  role: "user" | "agent";
  message: string;
  time_in_call_secs?: number;
  tool_calls?: unknown[];
  tool_results?: unknown[];
}

interface ElevenLabsPostCallPayload {
  type: string; // "post_call_transcription"
  event_timestamp?: number;
  data: {
    conversation_id: string;
    agent_id: string;
    status: string; // "done" | "error"
    call_duration_secs?: number;
    transcript?: ElevenLabsTranscriptEntry[];
    metadata?: {
      start_time_unix_secs?: number;
      call_duration_secs?: number;
      cost?: number;
      termination_reason?: string;
      [key: string]: unknown;
    };
    analysis?: {
      transcript_summary?: string;
      evaluation_criteria_results?: Record<string, unknown>;
      data_collection_results?: Record<string, unknown>;
      call_successful?: string;
    };
    conversation_initiation_client_data?: {
      dynamic_variables?: Record<string, unknown>;
      [key: string]: unknown;
    };
    recording_url?: string;
    has_audio?: boolean;
    has_user_audio?: boolean;
    has_response_audio?: boolean;
  };
}

// ── Verify ElevenLabs webhook signature (optional but recommended) ────────────

function verifyWebhookSignature(
  body: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader) return false;
  try {
    // ElevenLabs uses "sha256=<hex>" format
    const [algo, provided] = signatureHeader.split("=");
    if (algo !== "sha256") return false;
    const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(provided, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

/** Format a transcript array into a readable string. */
function formatTranscript(entries: ElevenLabsTranscriptEntry[]): string {
  return entries
    .map((e) => `${e.role === "agent" ? "Agent" : "Caller"}: ${e.message}`)
    .join("\n");
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Optionally verify webhook signature
  const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = req.headers.get("elevenlabs-signature") ?? req.headers.get("x-elevenlabs-signature");
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.warn("[ElevenLabs Webhook] Invalid signature — rejecting request");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: ElevenLabsPostCallPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error("[ElevenLabs Webhook] Invalid JSON");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only process post-call transcription events
  if (payload.type !== "post_call_transcription") {
    console.log(`[ElevenLabs Webhook] Ignoring event type: ${payload.type}`);
    return NextResponse.json({ received: true });
  }

  const { data } = payload;
  const conversationId = data.conversation_id;
  const agentId = data.agent_id;

  console.log(`[ElevenLabs Webhook] Post-call for conversation: ${conversationId}`);

  // ── Extract call data ─────────────────────────────────────────────────────
  const transcriptEntries = data.transcript ?? [];
  const transcriptText =
    transcriptEntries.length > 0 ? formatTranscript(transcriptEntries) : null;
  const summary = data.analysis?.transcript_summary ?? null;
  const recordingUrl = data.recording_url ?? null;
  const durationSeconds = data.call_duration_secs ?? data.metadata?.call_duration_secs ?? null;
  const status = data.status === "done" ? "completed" : (data.status ?? "completed");

  // Extract org context injected as dynamic variables during call setup
  const dynamicVars = data.conversation_initiation_client_data?.dynamic_variables ?? {};
  const orgId = (dynamicVars.org_id as string | undefined) ?? null;
  const callerNumber = (dynamicVars.caller_number as string | undefined) ?? null;

  const supabase = getSupabaseService();

  // ── Persist / update call record ──────────────────────────────────────────
  // Try to find the existing call record inserted at call start (by twilio_call_sid match
  // or by matching elevenlabs_agent_id + organisation_id within a recent window).
  let callDbId: string | null = null;

  if (orgId) {
    // Find the most-recently-initiated call for this org where we stored the agent id
    const { data: existingCall } = await supabase
      .from("calls")
      .select("id")
      .eq("organisation_id", orgId)
      .eq("metadata->>elevenlabs_agent_id", agentId)
      .eq("call_status", "initiated")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingCall) {
      callDbId = (existingCall as { id: string }).id;

      await supabase
        .from("calls")
        .update({
          call_status: status,
          transcript: transcriptText,
          summary,
          recording_url: recordingUrl,
          duration_seconds: durationSeconds ? Math.floor(Number(durationSeconds)) : null,
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            elevenlabs_conversation_id: conversationId,
            elevenlabs_agent_id: agentId,
            analysis: data.analysis ?? null,
            elevenlabs_metadata: data.metadata ?? null,
          },
        } as never)
        .eq("id", callDbId);

      console.log(`[ElevenLabs Webhook] Updated call record id=${callDbId}`);
    }
  }

  // If no existing record was found (e.g. call started before this deployment), insert a new one
  if (!callDbId && orgId) {
    const { data: inserted } = await supabase
      .from("calls")
      .insert({
        organisation_id: orgId,
        caller_phone_number: callerNumber ?? "unknown",
        call_status: status,
        transcript: transcriptText,
        summary,
        recording_url: recordingUrl,
        duration_seconds: durationSeconds ? Math.floor(Number(durationSeconds)) : null,
        ended_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        metadata: {
          elevenlabs_conversation_id: conversationId,
          elevenlabs_agent_id: agentId,
          analysis: data.analysis ?? null,
        },
      } as never)
      .select("id")
      .single();

    callDbId = (inserted as { id?: string } | null)?.id ?? null;
    console.log(`[ElevenLabs Webhook] Inserted new call record id=${callDbId}`);
  }

  // ── Async: send booking + summary alert ───────────────────────────────────
  void (async () => {
    try {
      if (!orgId || !conversationId) return;

      // Find a booking linked to this call
      const bookingSelect =
        "id, customer_name, customer_email, customer_phone, summary, start_at, end_at, call_id, created_at";

      let booking =
        (
          await supabase
            .from("appointments")
            .select(bookingSelect)
            .eq("call_id", conversationId)
            .eq("organisation_id", orgId)
            .maybeSingle()
        ).data ?? null;

      // Fall back: orphan appointment created within last 25 mins without call_id
      if (!booking) {
        const sinceIso = new Date(Date.now() - 25 * 60 * 1000).toISOString();
        const { data: orphan } = await supabase
          .from("appointments")
          .select(bookingSelect)
          .eq("organisation_id", orgId)
          .is("call_id", null)
          .gte("created_at", sinceIso)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (orphan) {
          const oid = (orphan as { id: string }).id;
          await supabase
            .from("appointments")
            .update({ call_id: conversationId } as never)
            .eq("id", oid);
          booking = orphan;
          console.log(`[ElevenLabs Webhook] Linked orphan appointment ${oid} → conversation ${conversationId}`);
        }
      }

      if (!booking) {
        console.log(`[ElevenLabs Webhook] No booking for conversation ${conversationId} — skipping alert.`);
        return;
      }

      const { data: alertConfig } = await supabase
        .from("organisation_alert_configs")
        .select("*")
        .eq("organisation_id", orgId)
        .maybeSingle();

      if (!alertConfig) return;

      const { data: org } = await supabase
        .from("organisations")
        .select("name")
        .eq("id", orgId)
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

      const timezone = process.env.DEFAULT_TIMEZONE ?? "UTC";
      const startDate = b.start_at ? new Date(b.start_at) : null;
      const friendlyDate = startDate
        ? startDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            timeZone: timezone,
          })
        : "Unknown date";
      const friendlyTime = startDate
        ? startDate.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            timeZone: timezone,
          })
        : "Unknown time";

      const purposeMatch = b.summary?.match(/^(.+?)\s*—/);
      const purpose = purposeMatch ? purposeMatch[1].trim() : (b.summary ?? "Appointment");

      const alertMsg = buildBookingAlertMessage({
        orgName,
        customerName: b.customer_name ?? "Customer",
        customerEmail: b.customer_email ?? "",
        customerPhone: callerNumber ?? b.customer_phone ?? undefined,
        purpose,
        date: friendlyDate,
        time: friendlyTime,
        summary: summary ?? undefined,
      });

      await dispatchAlerts(alertConfig as AlertConfig, "new_booking", alertMsg);
      console.log(`[ElevenLabs Webhook] Alert dispatched for org: ${orgId}`);
    } catch (e) {
      console.error("[ElevenLabs Webhook] Alert dispatch error (non-fatal):", e);
    }
  })();

  return NextResponse.json({ received: true });
}

export async function GET() {
  return NextResponse.json({ status: "ElevenLabs webhook endpoint active" });
}
