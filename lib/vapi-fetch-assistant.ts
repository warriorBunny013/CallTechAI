/**
 * Fetch an assistant from VAPI by ID to get its real voice (and name, firstMessage).
 * Used so transient assistants sound like Taylor, Jennifer, etc. as configured in VAPI.ai.
 * Server-only: uses VAPI_API_KEY.
 */

import type { VapiAssistantVoiceConfig } from "@/lib/vapi-assistants";

const VAPI_BASE = "https://api.vapi.ai";

/** Raw shape from VAPI GET /assistant/{id} (we only use voice, name, firstMessage, model) */
interface VapiAssistantResponse {
  id?: string;
  name?: string;
  firstMessage?: string;
  model?: {
    provider?: string;
    model?: string;
    temperature?: number;
    messages?: { role?: string; content?: string }[];
  };
  voice?: {
    provider?: string;
    voiceId?: string;
  };
}

/**
 * Fetch assistant by ID from VAPI and return voice config (voice, name, firstMessage, model).
 * Returns undefined if fetch fails or voice is missing.
 */
export async function fetchVapiAssistantVoiceConfig(
  assistantId: string,
  apiKey?: string
): Promise<VapiAssistantVoiceConfig | undefined> {
  const key = apiKey ?? process.env.VAPI_API_KEY;
  if (!key || key === "your_vapi_api_key_here") {
    return undefined;
  }

  try {
    const res = await fetch(`${VAPI_BASE}/assistant/${encodeURIComponent(assistantId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn("[vapi-fetch-assistant] GET assistant failed:", res.status, await res.text());
      return undefined;
    }

    const data = (await res.json()) as VapiAssistantResponse;
    const voice = data.voice;
    if (!voice?.provider || !voice?.voiceId) {
      console.warn("[vapi-fetch-assistant] Assistant missing voice:", data.id);
      return undefined;
    }

    const model = data.model;
    return {
      id: data.id ?? assistantId,
      name: data.name ?? "Assistant",
      systemPrompt:
        (model?.messages && model.messages[0]?.content) ||
        "You are a helpful customer support assistant.",
      firstMessage: data.firstMessage ?? "Hello! How can I help you today?",
      voiceProvider: voice.provider,
      voiceId: voice.voiceId,
      model: {
        provider: model?.provider ?? "openai",
        model: model?.model ?? "gpt-4",
        temperature: model?.temperature ?? 0.7,
      },
    };
  } catch (err) {
    console.error("[vapi-fetch-assistant] Error fetching assistant:", err);
    return undefined;
  }
}
