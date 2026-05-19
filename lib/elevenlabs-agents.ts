/**
 * ElevenLabs Conversational AI Agent Templates
 *
 * Pre-configured voice agent definitions for use with ElevenLabs Conversational AI + Twilio.
 * Each agent has:
 *   - An ElevenLabs voice ID for TTS synthesis
 *   - A base system prompt (org intents are injected dynamically per call)
 *   - Language and personality metadata
 *
 * SETUP: Create one base agent in the ElevenLabs dashboard configured with:
 *   - μ-law 8000 Hz audio format (required for Twilio Media Streams)
 *   - System prompt: use dynamic variables like {{org_name}}, {{intents_block}}
 *   - Agent ID stored in ELEVENLABS_DEFAULT_AGENT_ID env var
 *
 * Per-org voice selection: set organisations.selected_voice_agent_id to one of the
 * agent template IDs below (e.g. "taylor", "jennifer") and we inject the voice + persona
 * as a conversation override at call time.
 */

export interface ElevenLabsAgentTemplate {
  id: string;
  name: string;
  description: string;
  language: "english" | "multilingual" | "spanish" | "russian" | "french" | "german";
  gender: "male" | "female" | "neutral";
  /** ElevenLabs voice ID for TTS */
  voiceId: string;
  /** Default voice stability (0–1) */
  stability: number;
  /** Default similarity boost (0–1) */
  similarityBoost: number;
  /** Base system prompt – org intents are appended dynamically */
  systemPrompt: string;
  /** First message spoken by the agent */
  firstMessage: string;
}

/**
 * Curated ElevenLabs voice IDs.
 * Browse all voices at https://elevenlabs.io/voice-library
 */
export const ELEVENLABS_AGENTS: ElevenLabsAgentTemplate[] = [
  {
    id: "taylor",
    name: "Taylor",
    description: "Professional female – warm American English accent",
    language: "english",
    gender: "female",
    voiceId: "pNInz6obpgDQGcFmaJgB", // Adam (fallback – replace with preferred voice)
    stability: 0.5,
    similarityBoost: 0.75,
    systemPrompt:
      "You are Taylor, a friendly and professional AI voice assistant for {{org_name}}. " +
      "Speak clearly and concisely. Keep responses brief and natural for a phone conversation.",
    firstMessage: "Hello! You've reached {{org_name}}. This is Taylor. How can I help you today?",
  },
  {
    id: "jennifer",
    name: "Jennifer",
    description: "Warm and conversational female – American English",
    language: "english",
    gender: "female",
    voiceId: "EXAVITQu4vr4xnSDxMaL", // Bella
    stability: 0.5,
    similarityBoost: 0.8,
    systemPrompt:
      "You are Jennifer, a warm and helpful AI voice assistant for {{org_name}}. " +
      "Be approachable, clear, and keep responses concise for voice.",
    firstMessage: "Hi there! You've called {{org_name}}. I'm Jennifer. How can I assist you?",
  },
  {
    id: "olivia",
    name: "Olivia",
    description: "Calm and professional female – British-influenced English",
    language: "english",
    gender: "female",
    voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel
    stability: 0.6,
    similarityBoost: 0.75,
    systemPrompt:
      "You are Olivia, a calm and professional AI voice assistant for {{org_name}}. " +
      "Be polite, measured, and keep your answers short and clear.",
    firstMessage: "Hello! Thank you for calling {{org_name}}. This is Olivia. How may I help you?",
  },
  {
    id: "elena",
    name: "Elena",
    description: "Multilingual assistant – English, Russian, and more",
    language: "multilingual",
    gender: "female",
    voiceId: "XB0fDUnXU5powFXDhCwa", // Charlotte (multilingual)
    stability: 0.5,
    similarityBoost: 0.75,
    systemPrompt:
      "You are Elena, a multilingual AI voice assistant for {{org_name}}. " +
      "Respond in the same language the caller uses. " +
      "Be friendly, clear, and keep answers brief and natural for a phone call.",
    firstMessage: "Hello! Привет! You've reached {{org_name}}. I'm Elena. How can I help you today?",
  },
  {
    id: "sophia",
    name: "Sophia",
    description: "Energetic and upbeat female – American English",
    language: "english",
    gender: "female",
    voiceId: "AZnzlk1XvdvUeBnXmlld", // Domi
    stability: 0.45,
    similarityBoost: 0.8,
    systemPrompt:
      "You are Sophia, an energetic and upbeat AI voice assistant for {{org_name}}. " +
      "Be positive and enthusiastic while staying concise and professional.",
    firstMessage: "Hey! You've reached {{org_name}}! I'm Sophia — great to hear from you! How can I help?",
  },
  {
    id: "alex",
    name: "Alex",
    description: "Professional male – deep American English",
    language: "english",
    gender: "male",
    voiceId: "VR6AewLTigWG4xSOukaG", // Arnold
    stability: 0.5,
    similarityBoost: 0.75,
    systemPrompt:
      "You are Alex, a professional AI voice assistant for {{org_name}}. " +
      "Be clear, confident, and keep responses concise and helpful.",
    firstMessage: "Hello! You've reached {{org_name}}. This is Alex. How can I help you today?",
  },
  {
    id: "luna",
    name: "Luna",
    description: "Multilingual assistant – Spanish, English, and more",
    language: "multilingual",
    gender: "female",
    voiceId: "XrExE9yKIg1WjnnlVkGX", // Matilda (multilingual)
    stability: 0.55,
    similarityBoost: 0.75,
    systemPrompt:
      "You are Luna, a multilingual AI voice assistant for {{org_name}}. " +
      "Detect and respond in the caller's language automatically. " +
      "Be warm, culturally aware, and keep responses brief.",
    firstMessage: "Hello! Hola! You've reached {{org_name}}. I'm Luna. How can I assist you today?",
  },
  {
    id: "carlos",
    name: "Carlos",
    description: "Professional Spanish-speaking male",
    language: "spanish",
    gender: "male",
    voiceId: "TxGEqnHWrfWFTfGW9XjX", // Josh
    stability: 0.5,
    similarityBoost: 0.75,
    systemPrompt:
      "Eres Carlos, un asistente de voz de IA profesional para {{org_name}}. " +
      "Responde siempre en español. Sé claro, respetuoso y conciso.",
    firstMessage: "¡Hola! Ha llamado a {{org_name}}. Soy Carlos. ¿En qué le puedo ayudar?",
  },
];

export function getElevenLabsAgentById(id: string): ElevenLabsAgentTemplate | undefined {
  return ELEVENLABS_AGENTS.find((a) => a.id === id);
}

export function getDefaultElevenLabsAgent(): ElevenLabsAgentTemplate {
  return ELEVENLABS_AGENTS[0];
}

/** Returns all agent IDs that are pre-defined (not custom ElevenLabs agent IDs). */
export function isBuiltinAgentId(id: string | null): boolean {
  if (!id) return false;
  return ELEVENLABS_AGENTS.some((a) => a.id === id);
}
