/**
 * Update a VAPI assistant's system prompt with CallTechAI intents.
 * Syncs dashboard intents to the assistant in vapi.ai.
 * Works for both predefined and custom-created assistants.
 */

import { fetchVapiAssistantVoiceConfig } from "@/lib/vapi-fetch-assistant";
import { buildAssistantSystemPrompt } from "@/lib/assistant-system-prompt";
import type { IntentRow } from "@/lib/vapi-call";

const VAPI_BASE = "https://api.vapi.ai";

/**
 * Update the VAPI assistant's system prompt to include org intents.
 * Uses the standard CallTechAI assistant template + intents.
 */
export async function syncIntentsToVapiAssistant(
  assistantId: string | null,
  intents: IntentRow[],
  assistantName: string,
  organisationName: string,
  apiKey?: string
): Promise<{ ok: boolean; error?: string }> {
  const key = apiKey ?? process.env.VAPI_API_KEY;
  if (!key || key === "your_vapi_api_key_here") {
    return { ok: false, error: "VAPI_API_KEY not configured" };
  }

  if (!assistantId) {
    return { ok: false, error: "Assistant ID required" };
  }

  try {
    const voiceConfig = await fetchVapiAssistantVoiceConfig(assistantId, key);
    if (!voiceConfig) {
      return { ok: false, error: "Could not fetch assistant from VAPI" };
    }

    const newSystemPrompt = buildAssistantSystemPrompt(
      assistantName || voiceConfig.name,
      organisationName || "Your Business",
      intents
    );

    const res = await fetch(`${VAPI_BASE}/assistant/${encodeURIComponent(assistantId)}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: {
          provider: voiceConfig.model.provider,
          model: voiceConfig.model.model,
          temperature: voiceConfig.model.temperature,
          messages: [{ role: "system", content: newSystemPrompt }],
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[vapi-update-assistant] PATCH failed:", res.status, text);
      return { ok: false, error: `VAPI update failed: ${res.status}` };
    }

    return { ok: true };
  } catch (err) {
    console.error("[vapi-update-assistant] Error:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Sync org's intents to the org's selected VAPI assistant.
 * Call this after intent create/update/delete or when assistant changes.
 */
export async function syncOrgIntentsToVapi(
  organisationId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<void> {
  const { data: org } = await supabase
    .from("organisations")
    .select("selected_voice_agent_id, name")
    .eq("id", organisationId)
    .single();

  const assistantId = (org as { selected_voice_agent_id?: string | null } | null)?.selected_voice_agent_id ?? null;
  const orgName = (org as { name?: string } | null)?.name ?? "Your Business";
  if (!assistantId) return;

  const { data: intents } = await supabase
    .from("intents")
    .select("intent_name, example_user_phrases, english_responses, russian_responses")
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: true });

  const intentRows: IntentRow[] = (intents ?? []).map((r) => ({
    intent_name: r.intent_name,
    example_user_phrases: r.example_user_phrases ?? [],
    english_responses: r.english_responses ?? [],
    russian_responses: r.russian_responses ?? [],
  }));

  const voiceConfig = await fetchVapiAssistantVoiceConfig(assistantId);
  const assistantName = voiceConfig?.name ?? "Assistant";

  await syncIntentsToVapiAssistant(assistantId, intentRows, assistantName, orgName);
}
