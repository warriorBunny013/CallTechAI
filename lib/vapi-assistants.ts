/**
 * Pre-configured Vapi AI assistants (created in your Vapi dashboard).
 * These are the caller AI bots that can answer your organisation's calls.
 * Select one per organisation; its ID is stored in organisations.selected_voice_agent_id.
 */

export interface VapiAssistantOption {
  id: string
  name: string
  description?: string
}

export const VAPI_ASSISTANTS: VapiAssistantOption[] = [
  { id: "654174a7-16e0-4d8b-8a15-7707cacac5b4", name: "Taylor", description: "Customer support (Kylie voice)" },
  { id: "0fb66e25-07e0-45e5-84ac-d2193f136dee", name: "Jennifer", description: "Customer support (Savannah voice)" },
  { id: "0b07a8ef-b34b-4858-9176-e4fe17497b43", name: "Olivia", description: "Customer support (Paige voice)" },
  { id: "58467e58-f121-439c-876b-a21e053ac4ce", name: "Elena", description: "Customer support (Hana voice)" },
  { id: "4150066f-049e-4253-bafb-bbb7b0332280", name: "Sophia", description: "Customer support (Spencer voice)" },
  { id: "8c9a239d-4506-41f5-9edf-9ec1f7baac0b", name: "Alex", description: "Customer support (Elliot voice)" },
]

export function getVapiAssistantById(id: string): VapiAssistantOption | undefined {
  return VAPI_ASSISTANTS.find((a) => a.id === id)
}

export function isVapiAssistantId(id: string | null): boolean {
  if (!id || id.length !== 36) return false
  return VAPI_ASSISTANTS.some((a) => a.id === id)
}

/**
 * Voice config for building a transient assistant (with intents) that uses
 * the same voice/personality as the pre-created Vapi assistant.
 * Used for inbound phone calls so org intents are always applied.
 */
export interface VapiAssistantVoiceConfig {
  id: string
  name: string
  systemPrompt: string
  firstMessage: string
  voiceProvider: string
  voiceId: string
  model: { provider: string; model: string; temperature: number }
}

const VAPI_ASSISTANT_VOICE_CONFIG: Record<string, VapiAssistantVoiceConfig> = {
  "654174a7-16e0-4d8b-8a15-7707cacac5b4": {
    id: "654174a7-16e0-4d8b-8a15-7707cacac5b4",
    name: "Taylor",
    systemPrompt: "You are a friendly, professional customer support assistant. Be concise and helpful.",
    firstMessage: "Hello! How can I help you today?",
    voiceProvider: "11labs",
    voiceId: "pNInz6obpgDQGcFmaJgB",
    model: { provider: "openai", model: "gpt-4", temperature: 0.7 },
  },
  "0fb66e25-07e0-45e5-84ac-d2193f136dee": {
    id: "0fb66e25-07e0-45e5-84ac-d2193f136dee",
    name: "Jennifer",
    systemPrompt: "You are a warm, professional customer support assistant. Be clear and helpful.",
    firstMessage: "Hi there! How can I assist you today?",
    voiceProvider: "11labs",
    voiceId: "EXAVITQu4vr4xnSDxMaL",
    model: { provider: "openai", model: "gpt-4", temperature: 0.7 },
  },
  "0b07a8ef-b34b-4858-9176-e4fe17497b43": {
    id: "0b07a8ef-b34b-4858-9176-e4fe17497b43",
    name: "Olivia",
    systemPrompt: "You are a professional and friendly customer support assistant.",
    firstMessage: "Hello! What can I help you with?",
    voiceProvider: "11labs",
    voiceId: "pNInz6obpgDQGcFmaJgB",
    model: { provider: "openai", model: "gpt-4", temperature: 0.7 },
  },
  "58467e58-f121-439c-876b-a21e053ac4ce": {
    id: "58467e58-f121-439c-876b-a21e053ac4ce",
    name: "Elena",
    systemPrompt: "You are a helpful, professional customer support assistant.",
    firstMessage: "Hello! How may I help you?",
    voiceProvider: "11labs",
    voiceId: "EXAVITQu4vr4xnSDxMaL",
    model: { provider: "openai", model: "gpt-4", temperature: 0.7 },
  },
  "4150066f-049e-4253-bafb-bbb7b0332280": {
    id: "4150066f-049e-4253-bafb-bbb7b0332280",
    name: "Sophia",
    systemPrompt: "You are a professional, clear customer support assistant.",
    firstMessage: "Hi! How can I help you today?",
    voiceProvider: "11labs",
    voiceId: "pNInz6obpgDQGcFmaJgB",
    model: { provider: "openai", model: "gpt-4", temperature: 0.7 },
  },
  "8c9a239d-4506-41f5-9edf-9ec1f7baac0b": {
    id: "8c9a239d-4506-41f5-9edf-9ec1f7baac0b",
    name: "Alex",
    systemPrompt: "You are a friendly, professional customer support assistant.",
    firstMessage: "Hello! How can I assist you?",
    voiceProvider: "11labs",
    voiceId: "EXAVITQu4vr4xnSDxMaL",
    model: { provider: "openai", model: "gpt-4", temperature: 0.7 },
  },
}

export function getVapiAssistantVoiceConfig(
  vapiAssistantId: string
): VapiAssistantVoiceConfig | undefined {
  return VAPI_ASSISTANT_VOICE_CONFIG[vapiAssistantId]
}
