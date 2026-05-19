/**
 * GET /api/assistants/current
 * Returns the current org's ElevenLabs agent config (name, voice, language, etc.)
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndOrg } from "@/lib/org";

export async function GET() {
  const userAndOrg = await getCurrentUserAndOrg();
  if (!userAndOrg) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organisations")
    .select("id, name, elevenlabs_agent_id, selected_voice_agent_id")
    .eq("id", userAndOrg.organisationId)
    .single();

  const agentId = (org as { elevenlabs_agent_id?: string | null } | null)?.elevenlabs_agent_id ?? null;

  if (!agentId) {
    return NextResponse.json({ assistant: null });
  }

  // Load settings from organisation_settings
  const { data: settings } = await supabase
    .from("organisation_settings")
    .select("agent_name, agent_voice_id, agent_language, agent_system_prompt, agent_first_message")
    .eq("organisation_id", userAndOrg.organisationId)
    .maybeSingle();

  return NextResponse.json({
    assistant: {
      id: agentId,
      name: (settings as Record<string, unknown> | null)?.agent_name ?? "Your Assistant",
      voiceId:
        (settings as Record<string, unknown> | null)?.agent_voice_id ??
        (org as { selected_voice_agent_id?: string | null } | null)?.selected_voice_agent_id ??
        null,
      language: (settings as Record<string, unknown> | null)?.agent_language ?? "en",
      systemPrompt: (settings as Record<string, unknown> | null)?.agent_system_prompt ?? null,
      firstMessage: (settings as Record<string, unknown> | null)?.agent_first_message ?? null,
    },
  });
}
