/**
 * Build transient Vapi assistant config from organisation intents + selected voice agent.
 * Used when starting an inbound call so each org gets its own intents and voice.
 */

import { getVoiceAgentById, type VoiceAgent } from "@/lib/voice-agents";
import {
  getVapiAssistantVoiceConfig,
  isVapiAssistantId,
  type VapiAssistantVoiceConfig,
} from "@/lib/vapi-assistants";

export interface IntentRow {
  intent_name: string;
  example_user_phrases: string[];
  english_responses: string[];
  russian_responses: string[];
}

const INTENTS_MARKER = "\nUse the following intents and responses when the user asks matching questions.";

/** Strip our intents block from a prompt (to avoid duplicating when re-adding). */
function stripIntentsBlock(prompt: string): string {
  const idx = prompt.indexOf(INTENTS_MARKER);
  if (idx >= 0) return prompt.slice(0, idx).trim();
  return prompt;
}

/**
 * Build system prompt that includes org intents (hours, services, offers, FAQs).
 * Exported for syncing intents to VAPI assistant system prompt.
 */
export function buildSystemPromptWithIntents(
  basePrompt: string,
  intents: IntentRow[]
): string {
  if (intents.length === 0) {
    return basePrompt;
  }

  const intentsBlock = intents
    .map(
      (i) =>
        `Intent: ${i.intent_name}\n` +
        `Example questions: ${(i.example_user_phrases || []).join(", ")}\n` +
        `English responses: ${(i.english_responses || []).join(" | ")}\n` +
        `Russian responses: ${(i.russian_responses || []).join(" | ")}`
    )
    .join("\n\n");

  return `${basePrompt}

Use the following intents and responses when the user asks matching questions. Keep responses concise and natural for voice.

${intentsBlock}

If the user's question matches an intent, respond with the appropriate response in the same language they used. If no intent matches, politely ask for clarification or offer to help with something else.`;
}

/**
 * Build a transient assistant object for Vapi POST /v1/call.
 * Uses org's selected voice agent template and injects org intents into the system prompt.
 * When overrideVoiceConfig is provided (e.g. fetched from VAPI API), uses that so the assistant
 * sounds exactly like Taylor, Jennifer, etc. as configured in VAPI.ai.
 */
export function buildTransientAssistant(
  voiceAgentId: string | null,
  intents: IntentRow[],
  /** When set, use this voice/name/firstMessage (e.g. from VAPI GET assistant) so the agent sounds like the VAPI assistant */
  overrideVoiceConfig?: VapiAssistantVoiceConfig | null
): {
  name: string;
  firstMessage: string;
  model: { provider: string; model: string; temperature: number; messages: { role: string; content: string }[] };
  voice: { provider: string; voiceId: string };
} {
  let agent: VoiceAgent | undefined;
  if (overrideVoiceConfig) {
    agent = {
      id: overrideVoiceConfig.id,
      name: overrideVoiceConfig.name,
      personality: "",
      description: "",
      language: "english",
      gender: "neutral",
      voiceProvider: overrideVoiceConfig.voiceProvider as "11labs",
      voiceId: overrideVoiceConfig.voiceId,
      model: overrideVoiceConfig.model,
      systemPrompt: overrideVoiceConfig.systemPrompt,
      firstMessage: overrideVoiceConfig.firstMessage,
    };
  } else if (voiceAgentId) {
    const vapiConfig = isVapiAssistantId(voiceAgentId)
      ? getVapiAssistantVoiceConfig(voiceAgentId)
      : undefined;
    if (vapiConfig) {
      agent = {
        id: vapiConfig.id,
        name: vapiConfig.name,
        personality: "",
        description: "",
        language: "english",
        gender: "neutral",
        voiceProvider: vapiConfig.voiceProvider as "11labs",
        voiceId: vapiConfig.voiceId,
        model: vapiConfig.model,
        systemPrompt: vapiConfig.systemPrompt,
        firstMessage: vapiConfig.firstMessage,
      };
    }
    if (!agent) {
      agent = getVoiceAgentById(voiceAgentId);
    }
  }

  const defaultAgent: VoiceAgent = {
    id: "default",
    name: "Assistant",
    personality: "",
    description: "",
    language: "english",
    gender: "neutral",
    voiceProvider: "11labs",
    voiceId: "pNInz6obpgDQGcFmaJgB",
    model: { provider: "openai", model: "gpt-4", temperature: 0.7 },
    systemPrompt: "You are a helpful AI voice assistant for a business. Be concise and professional.",
    firstMessage: "Hello! How can I help you today?",
  };

  const baseAgent = agent ?? defaultAgent;
  const basePrompt = stripIntentsBlock(baseAgent.systemPrompt);
  const systemPrompt = buildSystemPromptWithIntents(basePrompt, intents);

  return {
    name: baseAgent.name,
    firstMessage: baseAgent.firstMessage,
    model: {
      provider: baseAgent.model.provider,
      model: baseAgent.model.model,
      temperature: baseAgent.model.temperature,
      messages: [{ role: "system", content: systemPrompt }],
    },
    voice: {
      provider: baseAgent.voiceProvider,
      voiceId: baseAgent.voiceId,
    },
  };
}
