/**
 * Call logs for the current user's organisation.
 *
 * Primary source: ElevenLabs Conversations API (fetched live for the org's agents).
 * Secondary source: Supabase `calls` table (populated by post-call webhook, used to
 *   enrich ElevenLabs conversations with transcript / summary / recording_url).
 *
 * Merge strategy:
 *   - ElevenLabs conversations are the authoritative list.
 *   - Supabase rows matched by `metadata.elevenlabs_conversation_id` provide extra
 *     detail (transcript, recording_url, analysis, caller phone number).
 *   - Supabase-only rows (e.g. legacy calls without a conversation ID) are appended.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseService } from "@/lib/supabase/service";
import { getCurrentUserAndOrg } from "@/lib/org";

// ── Types ────────────────────────────────────────────────────────────────────

interface ElevenLabsConversation {
  conversation_id: string;
  agent_id: string;
  status: string;
  start_time_unix_secs: number;
  call_duration_secs: number;
  message_count?: number;
  call_successful?: string;
  metadata?: {
    phone_call?: {
      type?: string;
      agent_number?: string;
      external_number?: string;
    };
    [key: string]: unknown;
  };
}

interface ElevenLabsListResponse {
  conversations: ElevenLabsConversation[];
  next_cursor?: string;
  has_more?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m === 0 ? `${s}s` : `${m}m ${String(s).padStart(2, "0")}s`;
}

function extractAnalysisText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const key of ["transcript_summary", "text", "content", "summary", "transcript", "insights", "analysis"]) {
      if (typeof o[key] === "string") return o[key] as string;
    }
    try { return JSON.stringify(o).slice(0, 200) + "..."; } catch { return "Analysis available"; }
  }
  return String(v);
}

function mapElevenLabsStatus(conv: ElevenLabsConversation): string {
  const successful = conv.call_successful;
  if (successful === "success") return "pass";
  if (successful === "failure") return "fail";
  const status = conv.status;
  if (status === "done" || status === "completed") return "pass";
  if (status === "failed" || status === "error") return "fail";
  if (status === "in-progress" || status === "initiated") return "in_progress";
  return "pass"; // default: treat unknown as completed
}

interface ElevenLabsConversationDetail {
  conversation_id: string;
  agent_id: string;
  metadata?: {
    phone_call?: {
      agent_number?: string;
      external_number?: string;
    };
    [key: string]: unknown;
  };
}

/**
 * Fetch details for a single conversation (to get phone numbers).
 * Returns null on any error so callers can safely ignore failures.
 */
async function fetchConversationDetail(
  conversationId: string,
  apiKey: string
): Promise<ElevenLabsConversationDetail | null> {
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
      { headers: { "xi-api-key": apiKey }, signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    return await res.json() as ElevenLabsConversationDetail;
  } catch {
    return null;
  }
}

/**
 * Fetch one page of ElevenLabs conversations for a specific agent.
 * Returns up to `pageSize` most-recent conversations.
 */
async function fetchElevenLabsConversations(
  agentId: string,
  apiKey: string,
  pageSize = 100
): Promise<ElevenLabsConversation[]> {
  try {
    const url = new URL("https://api.elevenlabs.io/v1/convai/conversations");
    url.searchParams.set("agent_id", agentId);
    url.searchParams.set("page_size", String(pageSize));

    const res = await fetch(url.toString(), {
      headers: { "xi-api-key": apiKey },
      // 8-second timeout so a slow ElevenLabs response doesn't stall the dashboard
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`[call-logs] ElevenLabs conversations list returned ${res.status} for agent ${agentId}`);
      return [];
    }

    const json = (await res.json()) as ElevenLabsListResponse;
    return json.conversations ?? [];
  } catch (err) {
    console.error(`[call-logs] Failed to fetch ElevenLabs conversations for agent ${agentId}:`, err);
    return [];
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(_request: NextRequest) {
  try {
    const userAndOrg = await getCurrentUserAndOrg();
    if (!userAndOrg) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = userAndOrg.organisationId;
    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY ?? "";

    // Use service client so we can read all org data regardless of RLS
    const supabase = getSupabaseService();

    // ── 1. Org's assistants that have an ElevenLabs agent ──────────────────
    const { data: assistants } = await supabase
      .from("organisation_assistants")
      .select("elevenlabs_agent_id, name")
      .eq("organisation_id", orgId)
      .not("elevenlabs_agent_id", "is", null);

    const agentIds: string[] = (assistants ?? [])
      .map((a: Record<string, unknown>) => a.elevenlabs_agent_id as string)
      .filter(Boolean);

    // ── 2. Org's phone numbers (for filtering / display) ───────────────────
    const { data: orgPhones } = await supabase
      .from("phone_numbers")
      .select("phone_number, elevenlabs_agent_id")
      .eq("organisation_id", orgId);

    // agentId → phone number map
    const agentToPhone: Record<string, string> = {};
    for (const row of orgPhones ?? []) {
      const r = row as Record<string, unknown>;
      if (r.elevenlabs_agent_id && r.phone_number) {
        agentToPhone[r.elevenlabs_agent_id as string] = r.phone_number as string;
      }
    }

    // ── 3. Fetch ElevenLabs conversations for all org agents in parallel ───
    let elevenLabsConvos: ElevenLabsConversation[] = [];
    if (elevenlabsApiKey && agentIds.length > 0) {
      const results = await Promise.all(
        agentIds.map((id) => fetchElevenLabsConversations(id, elevenlabsApiKey))
      );
      elevenLabsConvos = results.flat();
      // Sort newest first
      elevenLabsConvos.sort((a, b) => b.start_time_unix_secs - a.start_time_unix_secs);
    }

    // ── 4. Fetch appointments for booking tagging ──────────────────────────
    const { data: appointments } = await supabase
      .from("appointments")
      .select("call_id")
      .eq("organisation_id", orgId)
      .not("call_id", "is", null);

    const bookedCallIds = new Set<string>(
      (appointments ?? []).map((a: Record<string, unknown>) => a.call_id as string).filter(Boolean)
    );

    // ── 5. Fetch Supabase calls for enrichment ─────────────────────────────
    const { data: dbCalls, error: dbError } = await supabase
      .from("calls")
      .select(
        "id, caller_phone_number, assistant_phone_number, call_status, duration_seconds, recording_url, transcript, summary, analysis, metadata, started_at, ended_at, created_at"
      )
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: false })
      .limit(500);

    if (dbError) {
      console.error("[call-logs] Supabase error:", dbError);
    }

    // Build lookup: elevenlabs_conversation_id → db call row
    const supabaseByConvId = new Map<string, Record<string, unknown>>();
    const supabaseById = new Map<string, Record<string, unknown>>();
    for (const call of dbCalls ?? []) {
      const c = call as Record<string, unknown>;
      const meta = (c.metadata ?? {}) as Record<string, unknown>;
      const convId = meta.elevenlabs_conversation_id as string | undefined;
      if (convId) supabaseByConvId.set(convId, c);
      supabaseById.set(c.id as string, c);
    }

    // ── 6. Batch-fetch details for conversations missing phone numbers ──────
    // The list API doesn't return caller/agent phone numbers — only the detail
    // endpoint does. For conversations not yet enriched by the post-call webhook
    // (no Supabase row, or Supabase row lacks caller_phone_number), fetch details
    // in parallel so phone numbers appear without waiting for a webhook fire.
    // Capped at 30 most-recent to stay well within the serverless timeout.
    const detailCache = new Map<string, ElevenLabsConversationDetail>();
    if (elevenlabsApiKey && elevenLabsConvos.length > 0) {
      const needsDetail = elevenLabsConvos
        .slice(0, 30)
        .filter((conv) => {
          const dbRow = supabaseByConvId.get(conv.conversation_id);
          const hasCaller = dbRow
            ? !!(dbRow.caller_phone_number as string | null)
            : false;
          return !hasCaller;
        });

      if (needsDetail.length > 0) {
        const details = await Promise.all(
          needsDetail.map((conv) =>
            fetchConversationDetail(conv.conversation_id, elevenlabsApiKey)
          )
        );
        for (const detail of details) {
          if (detail) detailCache.set(detail.conversation_id, detail);
        }
      }
    }

    // ── 7. Build merged call logs ──────────────────────────────────────────
    const logs: Record<string, unknown>[] = [];
    const seenConvIds = new Set<string>();

    for (const conv of elevenLabsConvos) {
      const convId = conv.conversation_id;
      seenConvIds.add(convId);

      const dbCall = supabaseByConvId.get(convId);
      const callId = (dbCall?.id as string) ?? convId;
      const cachedDetail = detailCache.get(convId);

      // Phone numbers: prefer Supabase > detail cache > list metadata > agent-to-phone map
      const callerPhone =
        (dbCall?.caller_phone_number as string) ||
        cachedDetail?.metadata?.phone_call?.external_number ||
        conv.metadata?.phone_call?.external_number ||
        "";
      const assistantPhone =
        (dbCall?.assistant_phone_number as string) ||
        cachedDetail?.metadata?.phone_call?.agent_number ||
        conv.metadata?.phone_call?.agent_number ||
        agentToPhone[conv.agent_id] ||
        "";

      // A call is a web call only when there is genuinely no phone context.
      // ElevenLabs list API doesn't include caller number, but if the agent is
      // linked to a phone number the call definitely came through a phone.
      const hasPhoneContext =
        !!callerPhone || !!assistantPhone || !!conv.metadata?.phone_call ||
        !!cachedDetail?.metadata?.phone_call;


      const startMs = (conv.start_time_unix_secs || 0) * 1000;
      const startDate = startMs ? new Date(startMs) : new Date();
      const date = startDate.toISOString().split("T")[0];
      const time = startDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      const durationSeconds = conv.call_duration_secs || Number(dbCall?.duration_seconds) || 0;

      const status = dbCall
        ? (["completed", "done", "success"].includes((dbCall.call_status as string) ?? "")
            ? "pass"
            : (dbCall.call_status as string) === "initiated"
            ? "in_progress"
            : "fail")
        : mapElevenLabsStatus(conv);

      // Recording: use Supabase URL if available, otherwise point to our proxy
      const recordingUrl =
        (dbCall?.recording_url as string | null) ??
        (convId ? `/api/elevenlabs/conversations/${convId}/audio` : null);

      const analysisRaw =
        (dbCall?.analysis as Record<string, unknown> | null)?.transcript_summary ??
        dbCall?.summary ??
        dbCall?.transcript ??
        null;

      logs.push({
        id: callId,
        conversationId: convId,
        phoneNumber: callerPhone,
        configuredPhoneNumber: assistantPhone,
        isWebCall: !hasPhoneContext,
        date,
        time,
        duration: formatDuration(durationSeconds),
        durationSeconds,
        status,
        recordingUrl,
        analysis: extractAnalysisText(analysisRaw),
        transcript: (dbCall?.transcript as string | null) ?? null,
        summary: (dbCall?.summary as string | null) ?? null,
        createdAt: startDate.toISOString(),
        hasBooking:
          bookedCallIds.has(callId) ||
          bookedCallIds.has(convId),
        // Indicate if we have full detail in Supabase or need lazy-fetch
        hasDetail: !!dbCall,
      });
    }

    // ── 8. Append Supabase-only calls (no matching ElevenLabs conversation) ─
    for (const call of dbCalls ?? []) {
      const c = call as Record<string, unknown>;
      const meta = (c.metadata ?? {}) as Record<string, unknown>;
      const convId = meta.elevenlabs_conversation_id as string | undefined;

      // Skip if already included from ElevenLabs list
      if (convId && seenConvIds.has(convId)) continue;

      const createdAtRaw =
        (c.ended_at as string) ?? (c.started_at as string) ?? (c.created_at as string) ?? "";
      const date = createdAtRaw ? new Date(createdAtRaw).toISOString().split("T")[0] : "";
      const time = createdAtRaw
        ? new Date(createdAtRaw).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
        : "";
      const durationSeconds = Number(c.duration_seconds) || 0;
      const callStatus = (c.call_status as string) ?? "";
      const status =
        ["completed", "done", "success"].includes(callStatus)
          ? "pass"
          : callStatus === "initiated"
          ? "in_progress"
          : "fail";
      const callId = c.id as string;

      logs.push({
        id: callId,
        conversationId: convId ?? null,
        phoneNumber: (c.caller_phone_number as string) ?? "",
        configuredPhoneNumber: (c.assistant_phone_number as string) ?? "",
        isWebCall: !c.caller_phone_number,
        date,
        time,
        duration: formatDuration(durationSeconds),
        durationSeconds,
        status,
        recordingUrl:
          (c.recording_url as string | null) ??
          (convId ? `/api/elevenlabs/conversations/${convId}/audio` : null),
        analysis: extractAnalysisText(
          (c.analysis as Record<string, unknown> | null)?.transcript_summary ??
            c.summary ??
            c.transcript ??
            null
        ),
        transcript: (c.transcript as string | null) ?? null,
        summary: (c.summary as string | null) ?? null,
        createdAt: createdAtRaw || new Date().toISOString(),
        hasBooking:
          bookedCallIds.has(callId) || (convId ? bookedCallIds.has(convId) : false),
        hasDetail: true,
      });
    }

    // ── 9. Final sort: newest first ────────────────────────────────────────
    logs.sort(
      (a, b) =>
        new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
    );

    return NextResponse.json(logs.slice(0, 500));
  } catch (err) {
    console.error("[call-logs] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
