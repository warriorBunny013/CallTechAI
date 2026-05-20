/**
 * Audio proxy for ElevenLabs conversation recordings.
 *
 * ElevenLabs requires an API key to serve audio, so we proxy through our server
 * so the browser can play recordings via <Audio> without exposing the key.
 */

import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/org";
import { getSupabaseService } from "@/lib/supabase/service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;

    // Auth check
    const userAndOrg = await getCurrentUserAndOrg();
    if (!userAndOrg) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return new NextResponse("ElevenLabs API key not configured", { status: 500 });
    }

    // Optional: verify the conversation belongs to this org by checking the
    // conversation's agent_id is one of the org's agents
    const supabase = getSupabaseService();
    const { data: assistants } = await supabase
      .from("organisation_assistants")
      .select("elevenlabs_agent_id")
      .eq("organisation_id", userAndOrg.organisationId)
      .not("elevenlabs_agent_id", "is", null);

    const orgAgentIds = new Set<string>(
      (assistants ?? []).map((a: Record<string, unknown>) => a.elevenlabs_agent_id as string).filter(Boolean)
    );

    // If the org has no agents configured yet, skip the ownership check
    if (orgAgentIds.size > 0) {
      // Fetch conversation metadata to verify ownership
      const metaRes = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
        { headers: { "xi-api-key": apiKey }, signal: AbortSignal.timeout(5000) }
      );
      if (metaRes.ok) {
        const meta = await metaRes.json() as { agent_id?: string };
        if (meta.agent_id && !orgAgentIds.has(meta.agent_id)) {
          return new NextResponse("Forbidden", { status: 403 });
        }
      }
    }

    // Fetch audio from ElevenLabs
    const audioRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`,
      { headers: { "xi-api-key": apiKey }, signal: AbortSignal.timeout(30000) }
    );

    if (!audioRes.ok) {
      console.warn(`[audio-proxy] ElevenLabs returned ${audioRes.status} for conversation ${conversationId}`);
      return new NextResponse("Audio not available", { status: audioRes.status });
    }

    const contentType = audioRes.headers.get("content-type") ?? "audio/mpeg";
    const contentLength = audioRes.headers.get("content-length");

    const headers: HeadersInit = {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    };
    if (contentLength) headers["Content-Length"] = contentLength;

    // Stream the audio body directly
    return new NextResponse(audioRes.body, { status: 200, headers });
  } catch (err) {
    console.error("[audio-proxy] Error:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
