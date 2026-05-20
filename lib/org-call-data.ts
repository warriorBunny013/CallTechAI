/**
 * Shared org call data — merges ElevenLabs Conversations API with Supabase `calls`.
 * Used by call-logs, analytics, and usage endpoints for consistent metrics.
 */

import { getSupabaseService } from "@/lib/supabase/service";

export interface OrgCallEntry {
  id: string;
  conversationId: string | null;
  callerPhone: string;
  assistantPhone: string;
  isWebCall: boolean;
  durationSeconds: number;
  status: "pass" | "fail" | "in_progress";
  startedAt: string;
  createdAt: string;
  hasBooking: boolean;
  recordingUrl: string | null;
  transcript: string | null;
  summary: string | null;
  analysis: string;
}

interface ElevenLabsConversation {
  conversation_id: string;
  agent_id: string;
  status: string;
  start_time_unix_secs: number;
  call_duration_secs: number;
  call_successful?: string;
  metadata?: {
    phone_call?: {
      agent_number?: string;
      external_number?: string;
    };
    [key: string]: unknown;
  };
}

interface ElevenLabsListResponse {
  conversations: ElevenLabsConversation[];
}

interface ElevenLabsConversationDetail {
  conversation_id: string;
  agent_id: string;
  metadata?: {
    phone_call?: {
      agent_number?: string;
      external_number?: string;
    };
  };
}

export interface FetchOrgCallsOptions {
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  /** Fetch phone metadata for recent conversations missing caller number (max 30) */
  fetchDetails?: boolean;
}

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
    try {
      return JSON.stringify(o).slice(0, 200) + "...";
    } catch {
      return "Analysis available";
    }
  }
  return String(v);
}

function mapElevenLabsStatus(conv: ElevenLabsConversation): OrgCallEntry["status"] {
  const successful = conv.call_successful;
  if (successful === "success") return "pass";
  if (successful === "failure") return "fail";
  const status = conv.status;
  if (status === "done" || status === "completed") return "pass";
  if (status === "failed" || status === "error") return "fail";
  if (status === "in-progress" || status === "initiated") return "in_progress";
  return "pass";
}

function mapDbStatus(callStatus: string | undefined): OrgCallEntry["status"] {
  if (["completed", "done", "success"].includes(callStatus ?? "")) return "pass";
  if (callStatus === "initiated") return "in_progress";
  return "fail";
}

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
    return (await res.json()) as ElevenLabsConversationDetail;
  } catch {
    return null;
  }
}

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
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`[org-call-data] ElevenLabs list returned ${res.status} for agent ${agentId}`);
      return [];
    }

    const json = (await res.json()) as ElevenLabsListResponse;
    return json.conversations ?? [];
  } catch (err) {
    console.error(`[org-call-data] Failed to fetch conversations for agent ${agentId}:`, err);
    return [];
  }
}

function inDateRange(isoDate: string, startDate?: Date, endDate?: Date): boolean {
  const t = new Date(isoDate).getTime();
  if (startDate && t < startDate.getTime()) return false;
  if (endDate && t > endDate.getTime()) return false;
  return true;
}

/** Fetch merged call entries for an organisation. */
export async function fetchOrgCalls(
  orgId: string,
  options: FetchOrgCallsOptions = {}
): Promise<OrgCallEntry[]> {
  const { limit = 500, startDate, endDate, fetchDetails = false } = options;
  const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY ?? "";
  const supabase = getSupabaseService();

  const { data: assistants } = await supabase
    .from("organisation_assistants")
    .select("elevenlabs_agent_id")
    .eq("organisation_id", orgId)
    .not("elevenlabs_agent_id", "is", null);

  const agentIds: string[] = (assistants ?? [])
    .map((a: Record<string, unknown>) => a.elevenlabs_agent_id as string)
    .filter(Boolean);

  const { data: orgPhones } = await supabase
    .from("phone_numbers")
    .select("phone_number, elevenlabs_agent_id")
    .eq("organisation_id", orgId);

  const agentToPhone: Record<string, string> = {};
  for (const row of orgPhones ?? []) {
    const r = row as Record<string, unknown>;
    if (r.elevenlabs_agent_id && r.phone_number) {
      agentToPhone[r.elevenlabs_agent_id as string] = r.phone_number as string;
    }
  }

  let elevenLabsConvos: ElevenLabsConversation[] = [];
  if (elevenlabsApiKey && agentIds.length > 0) {
    const results = await Promise.all(
      agentIds.map((id) => fetchElevenLabsConversations(id, elevenlabsApiKey))
    );
    elevenLabsConvos = results.flat();
    elevenLabsConvos.sort((a, b) => b.start_time_unix_secs - a.start_time_unix_secs);
  }

  const { data: appointments } = await supabase
    .from("appointments")
    .select("call_id")
    .eq("organisation_id", orgId)
    .not("call_id", "is", null);

  const bookedCallIds = new Set<string>(
    (appointments ?? []).map((a: Record<string, unknown>) => a.call_id as string).filter(Boolean)
  );

  let dbQuery = supabase
    .from("calls")
    .select(
      "id, caller_phone_number, assistant_phone_number, call_status, duration_seconds, recording_url, transcript, summary, analysis, metadata, started_at, ended_at, created_at"
    )
    .eq("organisation_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (startDate) {
    dbQuery = dbQuery.gte("created_at", startDate.toISOString());
  }
  if (endDate) {
    dbQuery = dbQuery.lte("created_at", endDate.toISOString());
  }

  const { data: dbCalls, error: dbError } = await dbQuery;
  if (dbError) {
    console.error("[org-call-data] Supabase error:", dbError);
  }

  const supabaseByConvId = new Map<string, Record<string, unknown>>();
  for (const call of dbCalls ?? []) {
    const c = call as Record<string, unknown>;
    const meta = (c.metadata ?? {}) as Record<string, unknown>;
    const convId = meta.elevenlabs_conversation_id as string | undefined;
    if (convId) supabaseByConvId.set(convId, c);
  }

  const detailCache = new Map<string, ElevenLabsConversationDetail>();
  if (fetchDetails && elevenlabsApiKey && elevenLabsConvos.length > 0) {
    const needsDetail = elevenLabsConvos.slice(0, 30).filter((conv) => {
      const dbRow = supabaseByConvId.get(conv.conversation_id);
      const hasCaller = dbRow ? !!(dbRow.caller_phone_number as string | null) : false;
      return !hasCaller;
    });

    if (needsDetail.length > 0) {
      const details = await Promise.all(
        needsDetail.map((conv) => fetchConversationDetail(conv.conversation_id, elevenlabsApiKey))
      );
      for (const detail of details) {
        if (detail) detailCache.set(detail.conversation_id, detail);
      }
    }
  }

  const entries: OrgCallEntry[] = [];
  const seenConvIds = new Set<string>();

  for (const conv of elevenLabsConvos) {
    const convId = conv.conversation_id;
    seenConvIds.add(convId);

    const dbCall = supabaseByConvId.get(convId);
    const callId = (dbCall?.id as string) ?? convId;
    const cachedDetail = detailCache.get(convId);

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

    const hasPhoneContext =
      !!callerPhone ||
      !!assistantPhone ||
      !!conv.metadata?.phone_call ||
      !!cachedDetail?.metadata?.phone_call;

    const startMs = (conv.start_time_unix_secs || 0) * 1000;
    const startDateIso = startMs ? new Date(startMs).toISOString() : new Date().toISOString();
    const durationSeconds = conv.call_duration_secs || Number(dbCall?.duration_seconds) || 0;

    const status = dbCall ? mapDbStatus(dbCall.call_status as string) : mapElevenLabsStatus(conv);

    const analysisRaw =
      (dbCall?.analysis as Record<string, unknown> | null)?.transcript_summary ??
      dbCall?.summary ??
      dbCall?.transcript ??
      null;

    const entry: OrgCallEntry = {
      id: callId,
      conversationId: convId,
      callerPhone,
      assistantPhone,
      isWebCall: !hasPhoneContext,
      durationSeconds,
      status,
      startedAt: startDateIso,
      createdAt: startDateIso,
      hasBooking: bookedCallIds.has(callId) || bookedCallIds.has(convId),
      recordingUrl:
        (dbCall?.recording_url as string | null) ??
        (convId ? `/api/elevenlabs/conversations/${convId}/audio` : null),
      transcript: (dbCall?.transcript as string | null) ?? null,
      summary: (dbCall?.summary as string | null) ?? null,
      analysis: extractAnalysisText(analysisRaw),
    };

    if (inDateRange(entry.createdAt, startDate, endDate)) {
      entries.push(entry);
    }
  }

  for (const call of dbCalls ?? []) {
    const c = call as Record<string, unknown>;
    const meta = (c.metadata ?? {}) as Record<string, unknown>;
    const convId = meta.elevenlabs_conversation_id as string | undefined;

    if (convId && seenConvIds.has(convId)) continue;

    const createdAtRaw =
      (c.ended_at as string) ?? (c.started_at as string) ?? (c.created_at as string) ?? "";
    const createdAt = createdAtRaw || new Date().toISOString();

    if (!inDateRange(createdAt, startDate, endDate)) continue;

    const callId = c.id as string;
    const durationSeconds = Number(c.duration_seconds) || 0;

    entries.push({
      id: callId,
      conversationId: convId ?? null,
      callerPhone: (c.caller_phone_number as string) ?? "",
      assistantPhone: (c.assistant_phone_number as string) ?? "",
      isWebCall: !c.caller_phone_number,
      durationSeconds,
      status: mapDbStatus(c.call_status as string),
      startedAt: (c.started_at as string) ?? createdAt,
      createdAt,
      hasBooking: bookedCallIds.has(callId) || (convId ? bookedCallIds.has(convId) : false),
      recordingUrl:
        (c.recording_url as string | null) ??
        (convId ? `/api/elevenlabs/conversations/${convId}/audio` : null),
      transcript: (c.transcript as string | null) ?? null,
      summary: (c.summary as string | null) ?? null,
      analysis: extractAnalysisText(
        (c.analysis as Record<string, unknown> | null)?.transcript_summary ??
          c.summary ??
          c.transcript ??
          null
      ),
    });
  }

  entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return entries.slice(0, limit);
}

/** Billable phone calls only — excludes web/demo and in-progress calls. */
export function filterBillableCalls(calls: OrgCallEntry[]): OrgCallEntry[] {
  return calls.filter((c) => !c.isWebCall && c.status !== "in_progress");
}

export { formatDuration as formatCallDuration };
