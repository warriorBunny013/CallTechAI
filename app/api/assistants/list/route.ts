/**
 * GET /api/assistants/list — all ElevenLabs assistants for the current org.
 */

import { NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";
import { getCurrentUserAndOrg } from "@/lib/org";

export async function GET() {
  const userAndOrg = await getCurrentUserAndOrg();
  if (!userAndOrg) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseService();
  const orgId = userAndOrg.organisationId;

  const { data: rows, error } = await supabase
    .from("organisation_assistants")
    .select(
      "id, elevenlabs_agent_id, name, voice_id, template_id, languages, system_prompt, first_message, is_default, created_at"
    )
    .eq("organisation_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    // Table may not exist yet — fall back to legacy single assistant
    if (error.code === "42P01" || error.message?.includes("organisation_assistants")) {
      const legacy = await loadLegacyAssistant(supabase, orgId);
      return NextResponse.json({ assistants: legacy ? [legacy] : [] });
    }
    console.error("[assistants/list]", error);
    return NextResponse.json({ error: "Failed to fetch assistants" }, { status: 500 });
  }

  if ((rows ?? []).length === 0) {
    const legacy = await loadLegacyAssistant(supabase, orgId);
    return NextResponse.json({ assistants: legacy ? [legacy] : [] });
  }

  const assistants = (rows ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    elevenlabsAgentId: String(row.elevenlabs_agent_id),
    name: String(row.name),
    voiceId: (row.voice_id as string | null) ?? null,
    templateId: (row.template_id as string | null) ?? null,
    languages: Array.isArray(row.languages) ? row.languages : ["en"],
    systemPrompt: (row.system_prompt as string | null) ?? null,
    firstMessage: (row.first_message as string | null) ?? null,
    isDefault: Boolean(row.is_default),
    createdAt: String(row.created_at ?? ""),
  }));

  return NextResponse.json({ assistants });
}

async function loadLegacyAssistant(
  supabase: ReturnType<typeof getSupabaseService>,
  orgId: string
) {
  const { data: org } = await supabase
    .from("organisations")
    .select("elevenlabs_agent_id, selected_voice_agent_id")
    .eq("id", orgId)
    .single();

  const agentId = (org as { elevenlabs_agent_id?: string | null } | null)?.elevenlabs_agent_id;
  if (!agentId) return null;

  const { data: settings } = await supabase
    .from("organisation_settings")
    .select(
      "agent_name, agent_voice_id, agent_language, agent_languages, agent_template_id, agent_system_prompt, agent_first_message"
    )
    .eq("organisation_id", orgId)
    .maybeSingle();

  const s = settings as Record<string, unknown> | null;

  const { data: row } = await supabase
    .from("organisation_assistants")
    .select("id")
    .eq("organisation_id", orgId)
    .eq("elevenlabs_agent_id", agentId)
    .maybeSingle();

  const rowId = (row as { id?: string } | null)?.id ?? agentId;

  return {
    id: rowId,
    elevenlabsAgentId: agentId,
    name: (s?.agent_name as string) ?? "Your Assistant",
    voiceId:
      (s?.agent_voice_id as string | null) ??
      (org as { selected_voice_agent_id?: string | null })?.selected_voice_agent_id ??
      null,
    templateId: (s?.agent_template_id as string | null) ?? null,
    languages: Array.isArray(s?.agent_languages)
      ? (s.agent_languages as string[])
      : [(s?.agent_language as string) ?? "en"],
    systemPrompt: (s?.agent_system_prompt as string | null) ?? null,
    firstMessage: (s?.agent_first_message as string | null) ?? null,
    isDefault: true,
    createdAt: "",
  };
}
