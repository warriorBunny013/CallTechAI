/**
 * POST /api/assistants/link-existing
 *
 * Links a pre-built ElevenLabs agent (by agent_id) to the current organisation
 * for usage tracking and phone assignment — without creating a new agent.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";
import { getCurrentUserAndOrg } from "@/lib/org";
import {
  getElevenLabsAgent,
  patchAgentWebhook,
} from "@/lib/elevenlabs-agent-manager";

const LINKED_TEMPLATE_ID = "linked-external";

function extractAgentFields(agent: Record<string, unknown>) {
  const conv = (agent.conversationConfig ?? agent.conversation_config) as
    | Record<string, unknown>
    | undefined;
  const agentCfg = (conv?.agent ?? {}) as Record<string, unknown>;
  const tts = (conv?.tts ?? {}) as Record<string, unknown>;

  const name =
    (typeof agent.name === "string" && agent.name) ||
    (typeof agentCfg.name === "string" && agentCfg.name) ||
    null;

  const voiceId =
    (typeof tts.voiceId === "string" && tts.voiceId) ||
    (typeof tts.voice_id === "string" && tts.voice_id) ||
    null;

  const firstMessage =
    (typeof agentCfg.firstMessage === "string" && agentCfg.firstMessage) ||
    (typeof agentCfg.first_message === "string" && agentCfg.first_message) ||
    null;

  const promptObj = agentCfg.prompt as Record<string, unknown> | undefined;
  const systemPrompt =
    (typeof promptObj?.prompt === "string" && promptObj.prompt) ||
    (typeof agentCfg.system_prompt === "string" && agentCfg.system_prompt) ||
    null;

  const language =
    (typeof agentCfg.language === "string" && agentCfg.language) || "en";

  return { name, voiceId, firstMessage, systemPrompt, language };
}

export async function POST(req: NextRequest) {
  try {
    const userAndOrg = await getCurrentUserAndOrg();
    if (!userAndOrg) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const elevenlabsAgentId =
      typeof body.elevenlabsAgentId === "string"
        ? body.elevenlabsAgentId.trim()
        : "";
    const displayName =
      typeof body.name === "string" ? body.name.trim() : "";

    if (!elevenlabsAgentId || !elevenlabsAgentId.startsWith("agent_")) {
      return NextResponse.json(
        { error: "Invalid ElevenLabs agent ID. It should start with agent_" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseService();
    const orgId = userAndOrg.organisationId;

    const { data: existingRow } = await supabase
      .from("organisation_assistants")
      .select("id, organisation_id, name")
      .eq("elevenlabs_agent_id", elevenlabsAgentId)
      .maybeSingle();

    if (existingRow) {
      const existingOrgId = (existingRow as { organisation_id: string })
        .organisation_id;
      if (existingOrgId !== orgId) {
        return NextResponse.json(
          {
            error:
              "This ElevenLabs agent is already linked to another organisation. Each agent can only belong to one account.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json({
        assistant: {
          id: (existingRow as { id: string }).id,
          elevenlabsAgentId,
          name: (existingRow as { name: string }).name,
          isDefault: false,
        },
        message: "Agent is already linked to your organisation",
        alreadyLinked: true,
      });
    }

    let elFields: ReturnType<typeof extractAgentFields>;
    try {
      const raw = await getElevenLabsAgent(elevenlabsAgentId);
      elFields = extractAgentFields(raw as Record<string, unknown>);
    } catch (err) {
      console.error("[link-existing] ElevenLabs get agent failed:", err);
      if (!displayName) {
        return NextResponse.json(
          {
            error:
              "Could not find this agent in ElevenLabs. Check the agent ID and ensure ELEVENLABS_API_KEY is configured.",
          },
          { status: 404 }
        );
      }
      elFields = {
        name: displayName,
        voiceId: null,
        firstMessage: null,
        systemPrompt: null,
        language: "en",
      };
    }

    const agentName = displayName || elFields.name || "Linked Assistant";
    const languages = [elFields.language || "en"];

    const { count: existingCount } = await supabase
      .from("organisation_assistants")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", orgId);

    const setAsOrgDefault = (existingCount ?? 0) === 0;

    const { data: org } = await supabase
      .from("organisations")
      .select("name, elevenlabs_agent_id")
      .eq("id", orgId)
      .single();

    const orgName = (org as { name?: string } | null)?.name ?? "Your Business";

    const { data: inserted, error: insertError } = await supabase
      .from("organisation_assistants")
      .insert({
        organisation_id: orgId,
        elevenlabs_agent_id: elevenlabsAgentId,
        name: agentName,
        voice_id: elFields.voiceId,
        template_id: LINKED_TEMPLATE_ID,
        languages,
        system_prompt: elFields.systemPrompt,
        first_message: elFields.firstMessage,
        is_default: setAsOrgDefault,
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .select("id")
      .single();

    if (insertError) {
      console.error("[link-existing] insert error:", insertError);
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "This agent is already linked to another organisation." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: insertError.message || "Failed to link agent" },
        { status: 500 }
      );
    }

    try {
      await patchAgentWebhook(elevenlabsAgentId);
    } catch (e) {
      console.warn("[link-existing] patchAgentWebhook failed:", e);
    }

    if (setAsOrgDefault) {
      await supabase
        .from("organisations")
        .update({
          elevenlabs_agent_id: elevenlabsAgentId,
          selected_voice_agent_id: elFields.voiceId,
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq("id", orgId);

      await supabase.from("organisation_settings").upsert({
        organisation_id: orgId,
        agent_name: agentName,
        agent_voice_id: elFields.voiceId,
        agent_language: languages[0],
        agent_languages: languages,
        agent_template_id: LINKED_TEMPLATE_ID,
        agent_system_prompt: elFields.systemPrompt,
        agent_first_message: elFields.firstMessage,
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>);
    }

    return NextResponse.json({
      assistant: {
        id: (inserted as { id: string }).id,
        elevenlabsAgentId,
        name: agentName,
        voiceId: elFields.voiceId,
        languages,
        isDefault: setAsOrgDefault,
      },
      message: `${agentName} linked successfully. Assign a phone number to start tracking usage.`,
      orgName,
    });
  } catch (err) {
    console.error("[link-existing] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
