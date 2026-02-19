/**
 * Get the current org's selected assistant (from VAPI).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndOrg } from "@/lib/org";
import { fetchVapiAssistantVoiceConfig } from "@/lib/vapi-fetch-assistant";

export async function GET() {
  const userAndOrg = await getCurrentUserAndOrg();
  if (!userAndOrg) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organisations")
    .select("selected_voice_agent_id")
    .eq("id", userAndOrg.organisationId)
    .single();

  const assistantId = (org as { selected_voice_agent_id?: string | null } | null)?.selected_voice_agent_id ?? null;
  if (!assistantId) {
    return NextResponse.json({ assistant: null });
  }

  const config = await fetchVapiAssistantVoiceConfig(assistantId);
  if (!config) {
    return NextResponse.json({
      assistant: { id: assistantId, name: "Your assistant" },
    });
  }

  return NextResponse.json({
    assistant: { id: config.id, name: config.name },
  });
}
