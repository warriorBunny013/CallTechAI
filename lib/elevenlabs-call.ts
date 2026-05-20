/**
 * ElevenLabs Conversational AI – call helper
 *
 * Builds the `conversationInitiationClientData` payload that is passed to
 * ElevenLabs when registering an inbound Twilio call.  This injects the
 * organisation's intents into the agent's system prompt as a dynamic override
 * so every organisation gets its own personalised assistant voice + knowledge.
 */

import {
  getElevenLabsAgentById,
  getDefaultElevenLabsAgent,
  type ElevenLabsAgentTemplate,
} from "@/lib/elevenlabs-agents";
import type { ConversationInitiationClientDataRequestInput } from "@elevenlabs/elevenlabs-js/api";

export interface IntentRow {
  intent_name: string;
  example_user_phrases: string[];
  english_responses: string[];
  russian_responses: string[];
}

const INTENTS_MARKER =
  "\n\n--- Organisation Knowledge Base ---";

function stripIntentsBlock(prompt: string): string {
  const idx = prompt.indexOf(INTENTS_MARKER);
  return idx >= 0 ? prompt.slice(0, idx).trim() : prompt;
}

/**
 * Build the final system prompt by appending org-specific intents to the
 * agent template's base prompt (with {{org_name}} already resolved).
 */
export function buildSystemPromptWithIntents(
  basePrompt: string,
  intents: IntentRow[]
): string {
  if (intents.length === 0) return basePrompt;

  const intentsBlock = intents
    .map(
      (i) =>
        `Intent: ${i.intent_name}\n` +
        `Example questions: ${(i.example_user_phrases ?? []).join(", ")}\n` +
        `English responses: ${(i.english_responses ?? []).join(" | ")}\n` +
        `Russian responses: ${(i.russian_responses ?? []).join(" | ")}`
    )
    .join("\n\n");

  return `${stripIntentsBlock(basePrompt)}

${INTENTS_MARKER}
Use the following intents to answer questions. Respond in the same language the caller uses.
Keep answers short and natural for a phone conversation.

${intentsBlock}

If no intent matches, politely ask for clarification or offer to help with something else.`;
}

/**
 * Build the ElevenLabs `conversationInitiationClientData` object for a call.
 *
 * This is used when the org has a dedicated ElevenLabs agent (created via
 * /api/assistants/create). It injects per-call dynamic variables and
 * re-injects any intents that may have changed since the agent was created.
 *
 * @param voiceAgentId - organisations.selected_voice_agent_id (voice template ID like "taylor").
 *                       Pass null to skip TTS/voice overrides and use the agent's native voice.
 * @param orgName      - Human-readable organisation name
 * @param intents      - Org intents from the `intents` table
 * @param callerNumber - Caller's phone number (E.164) for dynamic variables
 * @param orgId        - Organisation UUID — CRITICAL: injected into system prompt so
 *                       the LLM passes it in all tool calls (check-availability, book-appointment)
 *
 * NOTE: TTS/voice overrides are ONLY sent when voiceAgentId is non-null.
 * Sending TTS overrides when the agent's "override" permissions are not enabled in
 * ElevenLabs causes a WebSocket close (Twilio error 31921). When voiceAgentId is null
 * we rely on the agent's own ElevenLabs-configured voice.
 */
export function buildConversationInitData(
  voiceAgentId: string | null,
  orgName: string,
  intents: IntentRow[],
  callerNumber: string,
  orgId: string
): ConversationInitiationClientDataRequestInput {
  // Only resolve a template (and apply TTS overrides) when the org has explicitly
  // selected a voice template. Otherwise let the agent use its native ElevenLabs config.
  const template: ElevenLabsAgentTemplate | null = voiceAgentId
    ? (getElevenLabsAgentById(voiceAgentId) ?? null)
    : null;

  // org_id injection — always appended so tool calls (calendar, etc.) work
  const orgIdInstruction =
    `\n\n## Tool Calls\nYour organisation ID is "${orgId}". ` +
    `Always include "org_id": "${orgId}" in every tool call you make.`;

  if (template) {
    // Full override: custom voice template + intents injected into prompt
    const resolvedPrompt = template.systemPrompt.replace(/\{\{org_name\}\}/g, orgName);
    const resolvedFirstMessage = template.firstMessage.replace(/\{\{org_name\}\}/g, orgName);
    const baseWithIntents = buildSystemPromptWithIntents(resolvedPrompt, intents);
    const fullSystemPrompt = baseWithIntents + orgIdInstruction;

    return {
      conversationConfigOverride: {
        agent: {
          prompt: { prompt: fullSystemPrompt },
          firstMessage: resolvedFirstMessage,
        },
        tts: {
          voiceId: template.voiceId,
          stability: template.stability,
          similarityBoost: template.similarityBoost,
        },
      },
      dynamicVariables: {
        org_name: orgName,
        org_id: orgId,
        caller_number: callerNumber,
        agent_name: template.name,
      },
    };
  }

  // Minimal override: only inject org_id instruction + intents into prompt.
  // No TTS/voice override — preserves the agent's native ElevenLabs voice settings
  // and avoids WebSocket drops caused by rejected override permissions.
  const minimalPromptAddition =
    intents.length > 0
      ? buildSystemPromptWithIntents("", intents).trim() + orgIdInstruction
      : orgIdInstruction.trim();

  return {
    conversationConfigOverride: {
      agent: {
        prompt: { prompt: minimalPromptAddition },
      },
    },
    dynamicVariables: {
      org_name: orgName,
      org_id: orgId,
      caller_number: callerNumber,
    },
  };
}

/**
 * Resolve which ElevenLabs agent ID to use for a call.
 * Priority: org's stored elevenlabs_agent_id → env default → required
 */
export function resolveElevenLabsAgentId(
  orgElevenLabsAgentId: string | null | undefined
): string {
  const envDefault = process.env.ELEVENLABS_DEFAULT_AGENT_ID ?? "";
  const resolved = orgElevenLabsAgentId || envDefault;
  if (!resolved) {
    throw new Error(
      "No ElevenLabs agent ID configured. " +
        "Set ELEVENLABS_DEFAULT_AGENT_ID in environment variables or configure " +
        "an agent per organisation."
    );
  }
  return resolved;
}
