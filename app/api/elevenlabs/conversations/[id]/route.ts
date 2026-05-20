/**
 * Returns full conversation details from ElevenLabs:
 * transcript, analysis/summary, metadata.
 *
 * Used by the recordings page to lazy-load transcript & analysis
 * for conversations that aren't yet saved in the Supabase calls table.
 */

import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/org";
import { getSupabaseService } from "@/lib/supabase/service";

interface TranscriptEntry {
  role: string;
  message: string;
  time_in_call_secs?: number;
}

interface ElevenLabsConversationDetail {
  conversation_id: string;
  agent_id: string;
  status: string;
  transcript?: TranscriptEntry[];
  analysis?: {
    transcript_summary?: string;
    evaluation_criteria_results?: Record<string, unknown>;
    data_collection_results?: Record<string, unknown>;
  };
  metadata?: {
    start_time_unix_secs?: number;
    call_duration_secs?: number;
    phone_call?: {
      agent_number?: string;
      external_number?: string;
    };
    termination_reason?: string;
  };
}

function formatTranscript(entries: TranscriptEntry[]): string {
  return entries
    .filter((e) => e.role && e.message)
    .map((e) => `${e.role === "agent" ? "Agent" : "User"}: ${e.message}`)
    .join("\n");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;

    const userAndOrg = await getCurrentUserAndOrg();
    if (!userAndOrg) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 500 });
    }

    // Verify ownership
    const supabase = getSupabaseService();
    const { data: assistants } = await supabase
      .from("organisation_assistants")
      .select("elevenlabs_agent_id")
      .eq("organisation_id", userAndOrg.organisationId)
      .not("elevenlabs_agent_id", "is", null);

    const orgAgentIds = new Set<string>(
      (assistants ?? []).map((a: Record<string, unknown>) => a.elevenlabs_agent_id as string).filter(Boolean)
    );

    // Fetch conversation detail
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
      { headers: { "xi-api-key": apiKey }, signal: AbortSignal.timeout(10000) }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Conversation not found" }, { status: res.status });
    }

    const detail = (await res.json()) as ElevenLabsConversationDetail;

    // Ownership check
    if (orgAgentIds.size > 0 && detail.agent_id && !orgAgentIds.has(detail.agent_id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const transcript = detail.transcript ? formatTranscript(detail.transcript) : null;
    const summary = detail.analysis?.transcript_summary ?? null;

    return NextResponse.json({
      conversationId,
      transcript,
      summary,
      analysis: summary ?? transcript,
      status: detail.status,
      durationSeconds: detail.metadata?.call_duration_secs ?? null,
      callerPhone: detail.metadata?.phone_call?.external_number ?? null,
      agentPhone: detail.metadata?.phone_call?.agent_number ?? null,
      terminationReason: detail.metadata?.termination_reason ?? null,
    });
  } catch (err) {
    console.error("[conversation-detail] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
