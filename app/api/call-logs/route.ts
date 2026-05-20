/**
 * Call logs for the current user's organisation.
 * Uses shared org-call-data (ElevenLabs + Supabase merge).
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/org";
import { fetchOrgCalls, formatCallDuration } from "@/lib/org-call-data";

export async function GET(_request: NextRequest) {
  try {
    const userAndOrg = await getCurrentUserAndOrg();
    if (!userAndOrg) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const entries = await fetchOrgCalls(userAndOrg.organisationId, {
      limit: 500,
      fetchDetails: true,
    });

    const logs = entries.map((entry) => {
      const startDate = new Date(entry.createdAt);
      return {
        id: entry.id,
        conversationId: entry.conversationId,
        phoneNumber: entry.callerPhone,
        configuredPhoneNumber: entry.assistantPhone,
        isWebCall: entry.isWebCall,
        date: startDate.toISOString().split("T")[0],
        time: startDate.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
        duration: formatCallDuration(entry.durationSeconds),
        durationSeconds: entry.durationSeconds,
        status: entry.status,
        recordingUrl: entry.recordingUrl,
        analysis: entry.analysis,
        transcript: entry.transcript,
        summary: entry.summary,
        createdAt: entry.createdAt,
        hasBooking: entry.hasBooking,
        hasDetail: !!entry.transcript || !!entry.summary,
      };
    });

    return NextResponse.json(logs);
  } catch (err) {
    console.error("[call-logs] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
