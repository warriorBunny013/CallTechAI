/**
 * Per-assistant knowledge: resolve dashboard assistant rows and sync ElevenLabs KB.
 */

import { getSupabaseService } from "@/lib/supabase/service";
import {
  getAssistantKnowledgeDocumentIds,
  syncKnowledgeBaseToAgent,
} from "@/lib/elevenlabs-knowledge";

export type ResolvedAssistant = {
  assistantRowId: string;
  elevenlabsAgentId: string;
};

/** Resolve organisation_assistants row + ElevenLabs agent id (default assistant if omitted). */
export async function resolveAssistantContext(
  orgId: string,
  assistantIdParam?: string | null
): Promise<ResolvedAssistant> {
  const supabase = getSupabaseService();

  if (assistantIdParam) {
    const { data: row, error } = await supabase
      .from("organisation_assistants")
      .select("id, elevenlabs_agent_id")
      .eq("id", assistantIdParam)
      .eq("organisation_id", orgId)
      .maybeSingle();

    if (error || !row) {
      throw new Error("Assistant not found");
    }

    return {
      assistantRowId: (row as { id: string }).id,
      elevenlabsAgentId: (row as { elevenlabs_agent_id: string }).elevenlabs_agent_id,
    };
  }

  const { data: defaultRow } = await supabase
    .from("organisation_assistants")
    .select("id, elevenlabs_agent_id")
    .eq("organisation_id", orgId)
    .eq("is_default", true)
    .maybeSingle();

  if (defaultRow) {
    return {
      assistantRowId: (defaultRow as { id: string }).id,
      elevenlabsAgentId: (defaultRow as { elevenlabs_agent_id: string }).elevenlabs_agent_id,
    };
  }

  const { data: firstRow } = await supabase
    .from("organisation_assistants")
    .select("id, elevenlabs_agent_id")
    .eq("organisation_id", orgId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (firstRow) {
    return {
      assistantRowId: (firstRow as { id: string }).id,
      elevenlabsAgentId: (firstRow as { elevenlabs_agent_id: string }).elevenlabs_agent_id,
    };
  }

  const { data: org } = await supabase
    .from("organisations")
    .select("elevenlabs_agent_id")
    .eq("id", orgId)
    .maybeSingle();

  const legacyAgentId = (org as { elevenlabs_agent_id?: string | null } | null)?.elevenlabs_agent_id;
  if (!legacyAgentId) {
    throw new Error("No assistant configured. Create an assistant first.");
  }

  const { data: byAgent } = await supabase
    .from("organisation_assistants")
    .select("id, elevenlabs_agent_id")
    .eq("organisation_id", orgId)
    .eq("elevenlabs_agent_id", legacyAgentId)
    .maybeSingle();

  if (byAgent) {
    return {
      assistantRowId: (byAgent as { id: string }).id,
      elevenlabsAgentId: legacyAgentId,
    };
  }

  throw new Error("No assistant configured. Create an assistant first.");
}

/** Attach this assistant's knowledge docs to its ElevenLabs agent. */
export async function syncKnowledgeForAssistant(
  orgId: string,
  assistantRowId: string
): Promise<void> {
  const supabase = getSupabaseService();
  const { data: row } = await supabase
    .from("organisation_assistants")
    .select("elevenlabs_agent_id")
    .eq("id", assistantRowId)
    .eq("organisation_id", orgId)
    .maybeSingle();

  const agentId = (row as { elevenlabs_agent_id?: string } | null)?.elevenlabs_agent_id;
  if (!agentId) return;

  const docIds = await getAssistantKnowledgeDocumentIds(orgId, assistantRowId);
  await syncKnowledgeBaseToAgent(agentId, docIds, orgId);
}
