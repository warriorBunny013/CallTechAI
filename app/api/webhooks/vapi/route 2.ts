/**
 * VAPI Callback Handler for Call Completion
 *
 * MULTI-TENANT: Call ownership is by organisation_id in metadata (set in Twilio webhook).
 * We use service Supabase to write so webhooks are not blocked by RLS.
 *
 * For recordings to appear in the dashboard:
 * 1. In VAPI dashboard, set "End of call report" webhook URL to: https://your-domain/api/webhooks/vapi
 * 2. Enable call recording in VAPI (account or assistant settings).
 * 3. Twilio webhook creates a call row when the call starts; this handler updates it with recording_url when the call ends.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";

interface VAPICallback {
  id: string;
  status: string;
  duration?: number;
  recordingUrl?: string;
  recording?: string; // VAPI sometimes sends recording URL in this field
  transcript?: string;
  summary?: string;
  analysis?: unknown;
  metadata?: {
    organisation_id?: string;
    user_id?: string;
    assistant_id?: string;
    phone_number_id?: string;
    caller_phone_number?: string;
    assistant_phone_number?: string;
    twilio_call_sid?: string;
    [key: string]: unknown;
  };
  startedAt?: string;
  endedAt?: string;
  [key: string]: unknown;
}

export async function POST(req: NextRequest) {
  try {
    const callback: VAPICallback = await req.json();

    console.log("[VAPI Callback] Call:", callback.id);

    const organisationId = callback.metadata?.organisation_id as string | undefined;
    const userId = callback.metadata?.user_id as string | undefined;

    if (!organisationId) {
      console.error("[VAPI Callback] No organisation_id in metadata for call", callback.id);
      return NextResponse.json(
        { error: "Missing organisation_id in metadata" },
        { status: 400 }
      );
    }

    let duration_seconds: number | null = null;
    if (callback.duration != null) {
      duration_seconds = Math.floor(Number(callback.duration) / 1000);
    } else if (callback.startedAt && callback.endedAt) {
      const start = new Date(callback.startedAt).getTime();
      const end = new Date(callback.endedAt).getTime();
      duration_seconds = Math.floor((end - start) / 1000);
    }

    const supabase = getSupabaseService();

    const recordingUrl =
      callback.recordingUrl ?? (callback as { recording?: string }).recording ?? null;

    const callData = {
      organisation_id: organisationId,
      user_id: userId ?? null,
      phone_number_id: callback.metadata?.phone_number_id ?? null,
      assistant_id: callback.metadata?.assistant_id ?? null,
      vapi_call_id: callback.id,
      caller_phone_number: callback.metadata?.caller_phone_number ?? null,
      assistant_phone_number: callback.metadata?.assistant_phone_number ?? null,
      call_status: callback.status ?? "completed",
      duration_seconds,
      recording_url: recordingUrl,
      transcript: callback.transcript ?? null,
      summary: callback.summary ?? null,
      analysis: callback.analysis ?? null,
      metadata: callback.metadata ?? {},
      started_at: callback.startedAt
        ? new Date(callback.startedAt).toISOString()
        : null,
      ended_at: callback.endedAt
        ? new Date(callback.endedAt).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from("calls")
      .select("id")
      .eq("vapi_call_id", callback.id)
      .maybeSingle();

    if (existing) {
      const { error: updateError } = await supabase
        .from("calls")
        .update(callData)
        .eq("id", existing.id);

      if (updateError) {
        console.error("[VAPI Callback] Update error:", updateError);
        return NextResponse.json(
          { error: "Failed to update call record" },
          { status: 500 }
        );
      }
      console.log("[VAPI Callback] Updated call:", existing.id);
    } else {
      const { error: insertError } = await supabase.from("calls").insert(callData);

      if (insertError) {
        console.error("[VAPI Callback] Insert error:", insertError);
        return NextResponse.json(
          { error: "Failed to create call record" },
          { status: 500 }
        );
      }
      console.log("[VAPI Callback] Created call for:", callback.id);
    }

    return NextResponse.json({ received: true, organisation_id: organisationId });
  } catch (err: unknown) {
    console.error("[VAPI Callback] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: "VAPI webhook endpoint active" });
}
