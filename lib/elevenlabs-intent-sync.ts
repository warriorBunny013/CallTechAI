/**
 * Sync organisation intents into each ElevenLabs agent's system prompt (per agent),
 * not into the account-wide Knowledge Base library.
 */

import { getSupabaseService } from "@/lib/supabase/service";
import { getAssistantTemplateById } from "@/lib/assistant-templates";
import { updateElevenLabsAgentPrompt } from "@/lib/elevenlabs-agent-manager";
import { buildSystemPromptWithIntents, type IntentRow } from "@/lib/elevenlabs-call";
import {
  deleteOrgIntentKnowledgeDocuments,
  getAssistantKnowledgeDocumentIds,
  syncKnowledgeBaseToAgent,
} from "@/lib/elevenlabs-knowledge";

function orgIdToolBlock(orgId: string): string {
  return `\n\n## IMPORTANT — Tool Calls\nAlways include "org_id": "${orgId}" in every tool call you make. Never omit this field.`;
}

function buildFullAgentPrompt(
  basePrompt: string,
  intentRows: IntentRow[],
  orgId: string,
  hasCalendarTools: boolean
): string {
  const withIntents = buildSystemPromptWithIntents(basePrompt, intentRows);
  return hasCalendarTools ? withIntents + orgIdToolBlock(orgId) : withIntents;
}

/**
 * Pushes current org intents into every assistant's ElevenLabs agent prompt.
 * Also cleans up any legacy intent documents that were created in the global KB.
 */
export async function syncOrgIntentsToElevenLabsAgents(orgId: string): Promise<void> {
  const supabase = getSupabaseService();

  await deleteOrgIntentKnowledgeDocuments(orgId).catch((e) => {
    console.warn("[intent-sync] Legacy intent KB cleanup failed:", e);
  });

  const { data: intents } = await supabase
    .from("intents")
    .select("intent_name, example_user_phrases, english_responses, russian_responses")
    .eq("organisation_id", orgId)
    .order("created_at", { ascending: true });

  const intentRows = (intents ?? []) as IntentRow[];

  const { data: assistants } = await supabase
    .from("organisation_assistants")
    .select("id, elevenlabs_agent_id, name, system_prompt, template_id")
    .eq("organisation_id", orgId);

  type AssistantRow = {
    id?: string;
    elevenlabs_agent_id?: string;
    system_prompt?: string | null;
    template_id?: string | null;
  };

  let rows: AssistantRow[] = (assistants ?? []) as AssistantRow[];

  // Legacy orgs may only have organisations.elevenlabs_agent_id + organisation_settings
  if (rows.length === 0) {
    const { data: org } = await supabase
      .from("organisations")
      .select("elevenlabs_agent_id")
      .eq("id", orgId)
      .maybeSingle();

    const legacyAgentId = (org as { elevenlabs_agent_id?: string | null } | null)
      ?.elevenlabs_agent_id;
    if (!legacyAgentId) return;

    const { data: settings } = await supabase
      .from("organisation_settings")
      .select("agent_system_prompt, agent_template_id")
      .eq("organisation_id", orgId)
      .maybeSingle();

    const s = settings as {
      agent_system_prompt?: string | null;
      agent_template_id?: string | null;
    } | null;

    const { data: legacyRow } = await supabase
      .from("organisation_assistants")
      .select("id")
      .eq("organisation_id", orgId)
      .eq("elevenlabs_agent_id", legacyAgentId)
      .maybeSingle();

    rows = [
      {
        id: (legacyRow as { id?: string } | null)?.id,
        elevenlabs_agent_id: legacyAgentId,
        system_prompt: s?.agent_system_prompt,
        template_id: s?.agent_template_id,
      },
    ];
  }

  for (const row of rows) {
    const agentId = row.elevenlabs_agent_id;
    const assistantRowId = row.id;
    const basePrompt = row.system_prompt?.trim();
    if (!agentId || !basePrompt) continue;

    const templateId = row.template_id;
    const template = templateId ? getAssistantTemplateById(templateId) : undefined;
    const hasCalendarTools = template?.hasCalendarTools ?? false;

    const fullPrompt = buildFullAgentPrompt(basePrompt, intentRows, orgId, hasCalendarTools);

    try {
      await updateElevenLabsAgentPrompt(agentId, fullPrompt);
      if (assistantRowId) {
        const docIds = await getAssistantKnowledgeDocumentIds(orgId, assistantRowId);
        await syncKnowledgeBaseToAgent(agentId, docIds, orgId);
      }
    } catch (e) {
      console.error(`[intent-sync] Failed to update agent ${agentId}:`, e);
    }
  }
}
