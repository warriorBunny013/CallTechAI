/**
 * Update the current org's assistant (name, voice) in VAPI.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndOrg } from "@/lib/org";
import { fetchVapiAssistantVoiceConfig } from "@/lib/vapi-fetch-assistant";
import { buildAssistantSystemPrompt, buildAssistantFirstMessage } from "@/lib/assistant-system-prompt";
import type { IntentRow } from "@/lib/vapi-call";

const VAPI_BASE = "https://api.vapi.ai";

export async function PATCH(req: NextRequest) {
  try {
    const userAndOrg = await getCurrentUserAndOrg();
    if (!userAndOrg) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, voiceId, voiceProvider = "11labs" } = body;

    const supabase = await createClient();

    const { data: org } = await supabase
      .from("organisations")
      .select("id, name, selected_voice_agent_id")
      .eq("id", userAndOrg.organisationId)
      .single();

    const assistantId = (org as { selected_voice_agent_id?: string | null } | null)?.selected_voice_agent_id ?? null;
    if (!assistantId) {
      return NextResponse.json(
        { error: "No assistant to update. Create one first." },
        { status: 404 }
      );
    }

    const vapiApiKey = process.env.VAPI_API_KEY;
    if (!vapiApiKey || vapiApiKey === "your_vapi_api_key_here") {
      return NextResponse.json({ error: "VAPI API key not configured" }, { status: 500 });
    }

    const currentConfig = await fetchVapiAssistantVoiceConfig(assistantId, vapiApiKey);
    if (!currentConfig) {
      return NextResponse.json(
        { error: "Could not fetch current assistant from VAPI" },
        { status: 502 }
      );
    }

    const orgName = (org as { name?: string }).name ?? "Your Business";
    const newName = typeof name === "string" && name.trim() ? name.trim() : currentConfig.name;
    const newVoiceId = typeof voiceId === "string" && voiceId ? voiceId : currentConfig.voiceId;
    const newVoiceProvider = typeof voiceProvider === "string" ? voiceProvider : currentConfig.voiceProvider;

    const { data: intents } = await supabase
      .from("intents")
      .select("intent_name, example_user_phrases, english_responses, russian_responses")
      .eq("organisation_id", userAndOrg.organisationId)
      .order("created_at", { ascending: true });

    const intentRows: IntentRow[] = (intents ?? []).map((r) => ({
      intent_name: r.intent_name,
      example_user_phrases: r.example_user_phrases ?? [],
      english_responses: r.english_responses ?? [],
      russian_responses: r.russian_responses ?? [],
    }));

    const systemPrompt = buildAssistantSystemPrompt(newName, orgName, intentRows);
    const firstMessage = buildAssistantFirstMessage(newName);

    const patchPayload = {
      name: newName,
      firstMessage,
      model: {
        provider: currentConfig.model.provider,
        model: currentConfig.model.model,
        temperature: currentConfig.model.temperature,
        messages: [{ role: "system", content: systemPrompt }],
      },
      voice: {
        provider: newVoiceProvider,
        voiceId: newVoiceId,
      },
    };

    const res = await fetch(`${VAPI_BASE}/assistant/${encodeURIComponent(assistantId)}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${vapiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patchPayload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[assistants/update] VAPI PATCH failed:", res.status, text);
      return NextResponse.json(
        { error: "Failed to update assistant in VAPI" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      assistant: {
        id: assistantId,
        name: newName,
        firstMessage,
        voice: { provider: newVoiceProvider, voiceId: newVoiceId },
      },
      message: "Assistant updated successfully",
    });
  } catch (err) {
    console.error("[assistants/update] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
