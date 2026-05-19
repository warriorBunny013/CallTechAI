/**
 * Update the current org's ElevenLabs agent (voice, language, system prompt, first message).
 * Also re-syncs intents into the system prompt.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";
import { getCurrentUserAndOrg } from "@/lib/org";
import { updateElevenLabsAgent, buildAppointmentSchedulerPrompt } from "@/lib/elevenlabs-agent-manager";
import { buildSystemPromptWithIntents } from "@/lib/elevenlabs-call";
import type { IntentRow } from "@/lib/vapi-call";
import { normalizeLanguageCodes } from "@/lib/voice-library";

export async function PATCH(req: NextRequest) {
  try {
    const userAndOrg = await getCurrentUserAndOrg();
    if (!userAndOrg) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      id: assistantRowId,
      name,
      voiceId,
      language,
      languages: languagesRaw,
      systemPrompt: customSystemPrompt,
      firstMessage: customFirstMessage,
    } = body;

    const languages =
      languagesRaw !== undefined
        ? normalizeLanguageCodes(languagesRaw)
        : typeof language === "string"
          ? normalizeLanguageCodes([language])
          : undefined;

    const supabase = getSupabaseService();

    const { data: org } = await supabase
      .from("organisations")
      .select("id, name, elevenlabs_agent_id")
      .eq("id", userAndOrg.organisationId)
      .single();

    const orgId = (org as { id: string } | null)?.id ?? userAndOrg.organisationId;
    const orgName = (org as { name?: string } | null)?.name ?? "Your Business";
    let agentId = (org as { elevenlabs_agent_id?: string | null } | null)?.elevenlabs_agent_id ?? null;

    if (assistantRowId) {
      const { data: row } = await supabase
        .from("organisation_assistants")
        .select("elevenlabs_agent_id")
        .eq("id", assistantRowId)
        .eq("organisation_id", orgId)
        .maybeSingle();
      agentId = (row as { elevenlabs_agent_id?: string } | null)?.elevenlabs_agent_id ?? agentId;
    }

    if (!agentId) {
      return NextResponse.json({ error: "No assistant configured. Please create one first." }, { status: 404 });
    }

    // Load intents to rebuild prompt
    const { data: intents } = await supabase
      .from("intents")
      .select("intent_name, example_user_phrases, english_responses, russian_responses")
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: true });

    const intentRows = (intents ?? []) as IntentRow[];

    const resolvedName = typeof name === "string" && name.trim() ? name.trim() : undefined;

    // Rebuild system prompt (with intents) when the client sends an updated prompt
    let newSystemPrompt: string | undefined;
    if (typeof customSystemPrompt === "string") {
      const basePrompt = buildAppointmentSchedulerPrompt(
        orgId,
        orgName,
        resolvedName ?? "Assistant",
        customSystemPrompt
      );
      newSystemPrompt = buildSystemPromptWithIntents(basePrompt, intentRows);
    }

    await updateElevenLabsAgent(agentId, {
      name: resolvedName,
      voiceId: typeof voiceId === "string" ? voiceId : undefined,
      languages,
      systemPrompt: newSystemPrompt,
      firstMessage: typeof customFirstMessage === "string" && customFirstMessage.trim()
        ? customFirstMessage.trim()
        : undefined,
      orgId,
      orgName,
    });

    // Update org settings
    const orgUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof voiceId === "string") orgUpdates.selected_voice_agent_id = voiceId;

    await supabase.from("organisations").update(orgUpdates).eq("id", orgId);

    // Update organisation_settings
    const settingsUpdate: Record<string, unknown> = {
      organisation_id: orgId,
      updated_at: new Date().toISOString(),
    };
    if (resolvedName) settingsUpdate.agent_name = resolvedName;
    if (typeof voiceId === "string") settingsUpdate.agent_voice_id = voiceId;
    if (languages) {
      settingsUpdate.agent_language = languages[0];
      settingsUpdate.agent_languages = languages;
    } else if (typeof language === "string") settingsUpdate.agent_language = language;
    if (typeof customSystemPrompt === "string") settingsUpdate.agent_system_prompt = customSystemPrompt;
    if (typeof customFirstMessage === "string") settingsUpdate.agent_first_message = customFirstMessage;

    await supabase.from("organisation_settings").upsert(settingsUpdate);

    const assistantPatch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (resolvedName) assistantPatch.name = resolvedName;
    if (typeof voiceId === "string") assistantPatch.voice_id = voiceId;
    if (languages) assistantPatch.languages = languages;
    if (typeof customSystemPrompt === "string") assistantPatch.system_prompt = customSystemPrompt;
    if (typeof customFirstMessage === "string") assistantPatch.first_message = customFirstMessage;

    if (assistantRowId) {
      await supabase
        .from("organisation_assistants")
        .update(assistantPatch)
        .eq("id", assistantRowId)
        .eq("organisation_id", orgId);
    } else {
      await supabase
        .from("organisation_assistants")
        .update(assistantPatch)
        .eq("organisation_id", orgId)
        .eq("elevenlabs_agent_id", agentId);
    }

    return NextResponse.json({ message: "Assistant updated successfully" });
  } catch (err) {
    console.error("[assistants/update] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
