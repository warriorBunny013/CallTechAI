/**
 * Create a new ElevenLabs Conversational AI agent for the current org.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";
import { getCurrentUserAndOrg } from "@/lib/org";
import { createElevenLabsAgent } from "@/lib/elevenlabs-agent-manager";
import { buildSystemPromptWithIntents } from "@/lib/elevenlabs-call";
import {
  getAssistantTemplateById,
  resolveTemplatePrompt,
  type AssistantTemplateId,
} from "@/lib/assistant-templates";
import type { IntentRow } from "@/lib/vapi-call";
import { normalizeLanguageCodes } from "@/lib/voice-library";

export async function POST(req: NextRequest) {
  try {
    const userAndOrg = await getCurrentUserAndOrg();
    if (!userAndOrg) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      name,
      voiceId,
      templateId,
      languages: languagesRaw = ["en"],
      systemPrompt: customSystemPrompt,
      firstMessage: customFirstMessage,
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Assistant name is required" }, { status: 400 });
    }

    if (!voiceId || typeof voiceId !== "string") {
      return NextResponse.json({ error: "Voice selection is required" }, { status: 400 });
    }

    if (!templateId || typeof templateId !== "string") {
      return NextResponse.json({ error: "Template selection is required" }, { status: 400 });
    }

    const template = getAssistantTemplateById(templateId);
    if (!template) {
      return NextResponse.json({ error: "Invalid template" }, { status: 400 });
    }

    const supabase = getSupabaseService();

    const { data: org, error: orgError } = await supabase
      .from("organisations")
      .select("id, name, elevenlabs_agent_id")
      .eq("id", userAndOrg.organisationId)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
    }

    const orgId = (org as { id: string }).id;
    const orgName = (org as { name?: string }).name ?? "Your Business";
    const agentName = name.trim();
    const languages = normalizeLanguageCodes(languagesRaw);
    const primaryLanguage = languages[0];

    const { data: intents } = await supabase
      .from("intents")
      .select("intent_name, example_user_phrases, english_responses, russian_responses")
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: true });

    const intentRows = (intents ?? []) as IntentRow[];

    const resolved = resolveTemplatePrompt(template, orgName, agentName);
    const basePrompt =
      typeof customSystemPrompt === "string" && customSystemPrompt.trim()
        ? customSystemPrompt.trim()
            .replace(/\{\{org_name\}\}/g, orgName)
            .replace(/\{\{agent_name\}\}/g, agentName)
        : resolved.systemPrompt;

    const fullSystemPrompt = buildSystemPromptWithIntents(basePrompt, intentRows);

    const firstMessage =
      typeof customFirstMessage === "string" && customFirstMessage.trim()
        ? customFirstMessage.trim()
            .replace(/\{\{org_name\}\}/g, orgName)
            .replace(/\{\{agent_name\}\}/g, agentName)
        : resolved.firstMessage;

    let existingCount = 0;
    const { count, error: countError } = await supabase
      .from("organisation_assistants")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", orgId);

    if (!countError) {
      existingCount = count ?? 0;
    }

    const legacyAgentId = (org as { elevenlabs_agent_id?: string | null }).elevenlabs_agent_id;
    const isFirstAssistant = existingCount === 0 && !legacyAgentId;
    const setAsOrgDefault = existingCount === 0;

    const agentId = await createElevenLabsAgent({
      name: agentName,
      orgId,
      orgName,
      voiceId,
      languages,
      systemPrompt: fullSystemPrompt,
      firstMessage,
      hasCalendarTools: template.hasCalendarTools,
      knowledgeBaseDocIds: [],
    });

    const { data: inserted, error: insertError } = await supabase
      .from("organisation_assistants")
      .insert({
        organisation_id: orgId,
        elevenlabs_agent_id: agentId,
        name: agentName,
        voice_id: voiceId,
        template_id: templateId,
        languages,
        system_prompt: customSystemPrompt ?? basePrompt,
        first_message: firstMessage,
        is_default: setAsOrgDefault,
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .select("id")
      .single();

    if (insertError) {
      console.warn("[assistants/create] organisation_assistants insert:", insertError);
    }

    if (setAsOrgDefault) {
      await supabase
        .from("organisations")
        .update({
          elevenlabs_agent_id: agentId,
          selected_voice_agent_id: voiceId,
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq("id", orgId);

      await supabase.from("organisation_settings").upsert({
        organisation_id: orgId,
        agent_name: agentName,
        agent_voice_id: voiceId,
        agent_language: primaryLanguage,
        agent_languages: languages,
        agent_template_id: templateId as AssistantTemplateId,
        agent_system_prompt: customSystemPrompt ?? basePrompt,
        agent_first_message: firstMessage,
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>);
    }

    return NextResponse.json({
      assistant: {
        id: (inserted as { id?: string } | null)?.id ?? agentId,
        elevenlabsAgentId: agentId,
        name: agentName,
        voiceId,
        templateId,
        languages,
        firstMessage,
        isDefault: setAsOrgDefault,
      },
      message: "Assistant created and ready to handle calls",
    });
  } catch (err) {
    console.error("[assistants/create] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
