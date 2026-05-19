/**
 * Call logs for the current user's organisation.
 * Fetches from Supabase (single source of truth after ElevenLabs migration).
 * The ElevenLabs post-call webhook populates transcript, summary, recording_url,
 * and duration_seconds once each call ends.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndOrg } from "@/lib/org";

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

export async function GET(request: NextRequest) {
  try {
    const userAndOrg = await getCurrentUserAndOrg();
    if (!userAndOrg) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const orgId = userAndOrg.organisationId;

    // 1. Get phone numbers for this org (to filter calls by assistant number)
    const { data: orgPhones, error: phonesError } = await supabase
      .from("phone_numbers")
      .select("phone_number")
      .eq("organisation_id", orgId);

    if (phonesError) {
      console.error("[call-logs] Error fetching phone numbers:", phonesError);
      return NextResponse.json({ error: "Failed to fetch phone numbers" }, { status: 500 });
    }

    const orgPhoneSet = new Set(
      (orgPhones ?? [])
        .map((r) => normalisePhoneForMatch((r as { phone_number: string }).phone_number))
        .filter(Boolean)
    );

    // 2. Fetch appointments to tag calls that had a booking
    const { data: appointments } = await supabase
      .from("appointments")
      .select("call_id")
      .eq("organisation_id", orgId)
      .not("call_id", "is", null);

    const bookedCallIds = new Set<string>(
      (appointments ?? [])
        .map((a: Record<string, unknown>) => a.call_id as string)
        .filter(Boolean)
    );

    // 3. Fetch calls from our DB (populated by ElevenLabs post-call webhook)
    const { data: dbCalls, error } = await supabase
      .from("calls")
      .select(
        "id, caller_phone_number, assistant_phone_number, call_status, duration_seconds, recording_url, transcript, summary, analysis, metadata, started_at, ended_at, created_at"
      )
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("[call-logs] Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch call logs" }, { status: 500 });
    }

    // 4. Filter to calls on this org's registered numbers only (when phone set is populated)
    const filteredCalls =
      orgPhoneSet.size === 0
        ? (dbCalls ?? [])
        : (dbCalls ?? []).filter((call: Record<string, unknown>) => {
            const assistantNum = normalisePhoneForMatch(call.assistant_phone_number as string);
            return assistantNum ? orgPhoneSet.has(assistantNum) : true;
          });

    // 5. Transform to unified log format
    const logs = filteredCalls.map((call: Record<string, unknown>) => {
      const createdAtRaw =
        (call.ended_at as string) ??
        (call.started_at as string) ??
        (call.created_at as string) ??
        "";
      const date = createdAtRaw ? new Date(createdAtRaw).toISOString().split("T")[0] : "";
      const time = createdAtRaw
        ? new Date(createdAtRaw).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })
        : "";
      const durationSeconds = Number(call.duration_seconds) || 0;
      const status =
        call.call_status === "completed" || call.call_status === "done" || call.call_status === "success"
          ? "pass"
          : call.call_status === "initiated"
          ? "in_progress"
          : "fail";

      const callId = call.id as string;
      const meta = (call.metadata ?? {}) as Record<string, unknown>;
      const elevenLabsConversationId =
        (meta.elevenlabs_conversation_id as string | undefined) ?? null;

      return {
        id: callId,
        phoneNumber: (call.caller_phone_number as string) ?? "",
        configuredPhoneNumber: (call.assistant_phone_number as string) ?? "",
        isWebCall: !call.caller_phone_number,
        date,
        time,
        duration: formatDuration(durationSeconds),
        durationSeconds,
        status,
        recordingUrl: (call.recording_url as string | null) ?? null,
        analysis: extractAnalysisText(
          (call.analysis as Record<string, unknown> | null)?.transcript_summary ??
            call.summary ??
            call.transcript ??
            null
        ),
        transcript: (call.transcript as string | null) ?? null,
        summary: (call.summary as string | null) ?? null,
        createdAt: createdAtRaw || new Date().toISOString(),
        hasBooking:
          bookedCallIds.has(callId) ||
          (elevenLabsConversationId ? bookedCallIds.has(elevenLabsConversationId) : false),
        conversationId: elevenLabsConversationId,
      };
    });

    // 6. Sort by createdAt descending (already ordered from DB, but re-sort after filter)
    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(logs.slice(0, 500));
  } catch (err) {
    console.error("[call-logs] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
