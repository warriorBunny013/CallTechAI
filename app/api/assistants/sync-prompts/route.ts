/**
 * POST /api/assistants/sync-prompts
 *
 * Rebuilds and pushes the latest system prompt (with email collection
 * instructions, org_id injection, and intents) to every ElevenLabs agent
 * owned by the current organisation.
 *
 * Call this after updating buildAppointmentSchedulerPrompt to propagate
 * changes to existing agents without recreating them.
 */

import { NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";
import { getCurrentUserAndOrg } from "@/lib/org";
import {
  buildAppointmentSchedulerPrompt,
  updateElevenLabsAgentPrompt,
} from "@/lib/elevenlabs-agent-manager";
import { buildSystemPromptWithIntents } from "@/lib/elevenlabs-call";
import type { IntentRow } from "@/lib/vapi-call";

export async function POST() {
  const userAndOrg = await getCurrentUserAndOrg();
  if (!userAndOrg) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseService();
  const orgId = userAndOrg.organisationId;

  // Fetch org name
  const { data: org } = await supabase
    .from("organisations")
    .select("id, name")
    .eq("id", orgId)
    .single();

  const orgName = (org as { name?: string } | null)?.name ?? "Your Business";

  // Fetch all assistants for this org
  const { data: assistants } = await supabase
    .from("organisation_assistants")
    .select("id, elevenlabs_agent_id, name, system_prompt")
    .eq("organisation_id", orgId);

  // Fetch intents
  const { data: intents } = await supabase
    .from("intents")
    .select("intent_name, example_user_phrases, english_responses, russian_responses")
    .eq("organisation_id", orgId)
    .order("created_at", { ascending: true });

  const intentRows = (intents ?? []) as IntentRow[];
  const rows = (assistants ?? []) as Array<{
    id: string;
    elevenlabs_agent_id: string;
    name: string;
    system_prompt: string | null;
  }>;

  if (rows.length === 0) {
    return NextResponse.json({ message: "No assistants found to sync.", synced: 0 });
  }

  const results: { name: string; ok: boolean; error?: string }[] = [];

  for (const row of rows) {
    try {
      const basePrompt = buildAppointmentSchedulerPrompt(
        orgId,
        orgName,
        row.name,
        row.system_prompt
      );
      const fullPrompt = buildSystemPromptWithIntents(basePrompt, intentRows);
      await updateElevenLabsAgentPrompt(row.elevenlabs_agent_id, fullPrompt);
      results.push({ name: row.name, ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[sync-prompts] Failed for agent ${row.elevenlabs_agent_id}:`, msg);
      results.push({ name: row.name, ok: false, error: msg });
    }
  }

  const synced = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  return NextResponse.json({
    message: `Synced ${synced} assistant${synced !== 1 ? "s" : ""}${failed > 0 ? `, ${failed} failed` : ""}.`,
    synced,
    failed,
    results,
  });
}
