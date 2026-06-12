/**
 * Delete an org assistant by row id (organisation_assistants.id).
 * Query: ?id=<uuid>
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";
import { getCurrentUserAndOrg } from "@/lib/org";
import { deleteElevenLabsAgent } from "@/lib/elevenlabs-agent-manager";

export async function DELETE(req: NextRequest) {
  try {
    const userAndOrg = await getCurrentUserAndOrg();
    if (!userAndOrg) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assistantRowId = req.nextUrl.searchParams.get("id");
    const supabase = getSupabaseService();
    const orgId = userAndOrg.organisationId;

    let elevenLabsAgentId: string | null = null;
    let wasDefault = false;
    let isLinkedExternal = false;

    if (assistantRowId) {
      const { data: row, error } = await supabase
        .from("organisation_assistants")
        .select("id, elevenlabs_agent_id, is_default, template_id")
        .eq("id", assistantRowId)
        .eq("organisation_id", orgId)
        .maybeSingle();

      if (error || !row) {
        const { data: byElId } = await supabase
          .from("organisation_assistants")
          .select("id, elevenlabs_agent_id, is_default, template_id")
          .eq("organisation_id", orgId)
          .eq("elevenlabs_agent_id", assistantRowId)
          .maybeSingle();

        if (!byElId) {
          return NextResponse.json({ error: "Assistant not found" }, { status: 404 });
        }

        elevenLabsAgentId = (byElId as { elevenlabs_agent_id: string }).elevenlabs_agent_id;
        wasDefault = Boolean((byElId as { is_default?: boolean }).is_default);
        isLinkedExternal =
          (byElId as { template_id?: string }).template_id === "linked-external";
        await supabase
          .from("organisation_assistants")
          .delete()
          .eq("id", (byElId as { id: string }).id);
      } else {
        elevenLabsAgentId = (row as { elevenlabs_agent_id: string }).elevenlabs_agent_id;
        wasDefault = Boolean((row as { is_default?: boolean }).is_default);
        isLinkedExternal =
          (row as { template_id?: string }).template_id === "linked-external";
        await supabase.from("organisation_assistants").delete().eq("id", assistantRowId);
      }
    } else {
      const { data: org } = await supabase
        .from("organisations")
        .select("elevenlabs_agent_id")
        .eq("id", orgId)
        .single();

      elevenLabsAgentId =
        (org as { elevenlabs_agent_id?: string | null } | null)?.elevenlabs_agent_id ?? null;
      wasDefault = true;

      if (!elevenLabsAgentId) {
        return NextResponse.json({ error: "No assistant to delete" }, { status: 404 });
      }

      await supabase
        .from("organisation_assistants")
        .delete()
        .eq("organisation_id", orgId)
        .eq("elevenlabs_agent_id", elevenLabsAgentId);
    }

    if (elevenLabsAgentId && !isLinkedExternal) {
      try {
        await deleteElevenLabsAgent(elevenLabsAgentId);
      } catch (e) {
        console.warn("[assistants/delete] ElevenLabs delete failed (may already be gone):", e);
      }
    }

    if (wasDefault) {
      const { data: nextDefault } = await supabase
        .from("organisation_assistants")
        .select("id, elevenlabs_agent_id, name, voice_id, languages, system_prompt, first_message, template_id")
        .eq("organisation_id", orgId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextDefault) {
        const nd = nextDefault as Record<string, unknown>;
        const nextAgentId = String(nd.elevenlabs_agent_id);
        const langs = Array.isArray(nd.languages) ? nd.languages : ["en"];

        await supabase
          .from("organisation_assistants")
          .update({ is_default: true })
          .eq("id", nd.id);

        await supabase
          .from("organisations")
          .update({
            elevenlabs_agent_id: nextAgentId,
            selected_voice_agent_id: nd.voice_id,
            updated_at: new Date().toISOString(),
          } as Record<string, unknown>)
          .eq("id", orgId);

        await supabase.from("organisation_settings").upsert({
          organisation_id: orgId,
          agent_name: nd.name,
          agent_voice_id: nd.voice_id,
          agent_language: langs[0] ?? "en",
          agent_languages: langs,
          agent_template_id: nd.template_id,
          agent_system_prompt: nd.system_prompt,
          agent_first_message: nd.first_message,
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>);
      } else {
        await supabase
          .from("organisations")
          .update({
            elevenlabs_agent_id: null,
            updated_at: new Date().toISOString(),
          } as Record<string, unknown>)
          .eq("id", orgId);

        await supabase.from("organisation_settings").delete().eq("organisation_id", orgId);
      }
    }

    return NextResponse.json({ message: "Assistant deleted successfully" });
  } catch (err) {
    console.error("[assistants/delete] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
