/**
 * Returns the transient assistant config for the current org:
 * CallTechAI dashboard intents + selected voice agent (Taylor, Jennifer, etc.).
 * Fetches the assistant from VAPI so the voice matches exactly what you set in VAPI.ai.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndOrg } from "@/lib/org";
import { buildTransientAssistant } from "@/lib/vapi-call";
import { fetchVapiAssistantVoiceConfig } from "@/lib/vapi-fetch-assistant";
export async function GET() {
  try {
    const userAndOrg = await getCurrentUserAndOrg();
    if (!userAndOrg) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    const [orgRes, intentsRes] = await Promise.all([
      supabase
        .from("organisations")
        .select("id, selected_voice_agent_id")
        .eq("id", userAndOrg.organisationId)
        .single(),
      supabase
        .from("intents")
        .select("intent_name, example_user_phrases, english_responses, russian_responses")
        .eq("organisation_id", userAndOrg.organisationId)
        .order("created_at", { ascending: true }),
    ]);

    const org = orgRes.data ?? null;
    const voiceAgentId = org?.selected_voice_agent_id ?? null;
    const intents = (intentsRes.data ?? []) as {
      intent_name: string;
      example_user_phrases: string[];
      english_responses: string[];
      russian_responses: string[];
    }[];

    let fetchedVoiceConfig = null;
    if (voiceAgentId) {
      fetchedVoiceConfig = await fetchVapiAssistantVoiceConfig(voiceAgentId);
    }

    const assistantConfig = buildTransientAssistant(
      voiceAgentId,
      intents,
      fetchedVoiceConfig ?? undefined
    );

    return NextResponse.json({
      assistantConfig,
      voiceAgentId,
      intentsCount: intents.length,
    });
  } catch (err) {
    console.error("[assistant-config]", err);
    return NextResponse.json(
      { error: "Failed to build assistant config" },
      { status: 500 }
    );
  }
}
