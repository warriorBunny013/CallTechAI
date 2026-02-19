/**
 * Call logs for the current user's organisation.
 * Fetches from both Supabase and VAPI: recordings for phone numbers added in the dashboard.
 * VAPI is the source of truth for recordings; we merge with our DB for metadata.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndOrg } from "@/lib/org";
import { fetchVapiCallsForPhoneNumber, type VapiCall } from "@/lib/vapi-fetch-calls";

/** Normalise phone to digits for comparison (E.164 may have + or spaces). */
function normalisePhoneForMatch(p: string | null | undefined): string {
  if (p == null || typeof p !== "string") return "";
  return p.replace(/\D/g, "").trim() || p.trim();
}

function formatDuration(seconds: number): string {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m === 0 ? `${s}s` : `${m}m ${String(s).padStart(2, "0")}s`;
}

function extractAnalysisText(v: unknown): string {
  if (v == null) return "No analysis available";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const key of ["text", "content", "summary", "transcript", "insights", "analysis"]) {
      if (typeof o[key] === "string") return o[key] as string;
    }
    if (typeof o.summary === "string") return o.summary;
    try {
      return JSON.stringify(o).slice(0, 200) + "...";
    } catch {
      return "Analysis available";
    }
  }
  return String(v);
}

function transformVapiCallToLog(
  vapiCall: VapiCall,
  assistantPhoneNumber: string
): {
  id: string;
  phoneNumber: string;
  isWebCall: boolean;
  date: string;
  time: string;
  duration: string;
  durationSeconds: number;
  status: string;
  recordingUrl: string | null;
  analysis: string;
  createdAt: string;
} {
  const createdAtRaw =
    vapiCall.endedAt ?? vapiCall.startedAt ?? vapiCall.createdAt ?? "";
  const date = createdAtRaw ? new Date(createdAtRaw).toISOString().split("T")[0] : "";
  const time = createdAtRaw
    ? new Date(createdAtRaw).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "";
  let durationSeconds = 0;
  if (vapiCall.endedAt && vapiCall.startedAt) {
    durationSeconds = Math.floor(
      (new Date(vapiCall.endedAt).getTime() - new Date(vapiCall.startedAt).getTime()) / 1000
    );
  } else if ((vapiCall as { duration?: number }).duration) {
    durationSeconds = Math.floor(Number((vapiCall as { duration?: number }).duration) / 1000);
  }
  const phoneNumber =
    (vapiCall.customer as { number?: string } | undefined)?.number ?? assistantPhoneNumber ?? "";
  const status =
    vapiCall.status === "ended" || vapiCall.status === "completed" ? "pass" : "fail";

  return {
    id: vapiCall.id,
    phoneNumber,
    isWebCall: !phoneNumber,
    date,
    time,
    duration: formatDuration(durationSeconds),
    durationSeconds,
    status,
    recordingUrl: vapiCall.recordingUrl ?? vapiCall.recording ?? null,
    analysis: extractAnalysisText(vapiCall.analysis ?? vapiCall.summary ?? vapiCall.transcript),
    createdAt: createdAtRaw || new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const userAndOrg = await getCurrentUserAndOrg();
    if (!userAndOrg) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const orgId = userAndOrg.organisationId;
    const vapiApiKey = process.env.VAPI_API_KEY;

    // 1. Get phone numbers added in the dashboard (with vapi_phone_number_id for VAPI fetch)
    const { data: orgPhones, error: phonesError } = await supabase
      .from("phone_numbers")
      .select("phone_number, vapi_phone_number_id")
      .eq("organisation_id", orgId);

    if (phonesError) {
      console.error("[call-logs] Error fetching phone numbers:", phonesError);
      return NextResponse.json(
        { error: "Failed to fetch phone numbers" },
        { status: 500 }
      );
    }

    const orgPhoneSet = new Set(
      (orgPhones ?? [])
        .map((r) => (r as { phone_number: string }).phone_number)
        .filter(Boolean)
        .map((p) => normalisePhoneForMatch(p))
    );

    const phoneRows = (orgPhones ?? []) as { phone_number: string; vapi_phone_number_id?: string }[];

    // 2. Fetch calls from VAPI for each dashboard phone number (source of recordings)
    const vapiCallsByVapiId = new Map<string, ReturnType<typeof transformVapiCallToLog>>();
    if (vapiApiKey && vapiApiKey !== "your_vapi_api_key_here") {
      for (const row of phoneRows) {
        const vapiId = row.vapi_phone_number_id;
        if (!vapiId) continue;
        const vapiCalls = await fetchVapiCallsForPhoneNumber(vapiId, 100, vapiApiKey);
        for (const c of vapiCalls) {
          const log = transformVapiCallToLog(c, row.phone_number);
          vapiCallsByVapiId.set(c.id, log);
        }
      }
    }

    // 3. Fetch calls from Supabase (our DB - may have metadata from webhooks)
    const { data: dbCalls, error } = await supabase
      .from("calls")
      .select(
        "id, vapi_call_id, caller_phone_number, assistant_phone_number, call_status, duration_seconds, recording_url, transcript, summary, analysis, started_at, created_at"
      )
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("[call-logs] Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to fetch call logs" },
        { status: 500 }
      );
    }

    // 4. Filter DB calls to dashboard numbers only
    const filteredDbCalls =
      orgPhoneSet.size === 0
        ? []
        : (dbCalls ?? []).filter((call: Record<string, unknown>) => {
            const assistantNum = (call.assistant_phone_number as string) ?? "";
            const key = normalisePhoneForMatch(assistantNum);
            return key ? orgPhoneSet.has(key) : false;
          });

    // 5. Merge: prefer VAPI for recordingUrl when available; use DB for calls not in VAPI
    const seenVapiIds = new Set<string>();
    const merged: { id: string; phoneNumber: string; isWebCall: boolean; date: string; time: string; duration: string; durationSeconds: number; status: string; recordingUrl: string | null; analysis: string; createdAt: string }[] = [];

    for (const vapiLog of vapiCallsByVapiId.values()) {
      merged.push(vapiLog);
      seenVapiIds.add(vapiLog.id);
    }

    for (const call of filteredDbCalls as (Record<string, unknown> & { vapi_call_id?: string })[]) {
      const vapiId = call.vapi_call_id as string | undefined;
      if (vapiId && seenVapiIds.has(vapiId)) continue;
      const phoneNumber =
        (call.caller_phone_number as string) || (call.assistant_phone_number as string) || null;
      const createdAtRaw = (call.started_at as string) || (call.created_at as string) || "";
      const date = createdAtRaw ? new Date(createdAtRaw).toISOString().split("T")[0] : "";
      const time = createdAtRaw
        ? new Date(createdAtRaw).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })
        : "";
      const durationSeconds = Number(call.duration_seconds) || 0;
      const status = call.call_status === "completed" || call.call_status === "success" ? "pass" : "fail";
      merged.push({
        id: (call.id as string) ?? call.vapi_call_id ?? `db-${call.id}`,
        phoneNumber: phoneNumber ?? "",
        isWebCall: !phoneNumber,
        date,
        time,
        duration: formatDuration(durationSeconds),
        durationSeconds,
        status,
        recordingUrl: call.recording_url ?? null,
        analysis: extractAnalysisText(
          call.analysis ?? call.summary ?? call.transcript ?? null
        ),
        createdAt: createdAtRaw || new Date().toISOString(),
      });
    }

    // 6. Sort by createdAt descending
    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(merged.slice(0, 500));
  } catch (err) {
    console.error("[call-logs] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
