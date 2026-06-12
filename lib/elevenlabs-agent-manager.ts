/**
 * ElevenLabs Conversational AI Agent Manager
 *
 * Handles creating, updating, and deleting ElevenLabs agents for CallTechAI organisations.
 * Each organisation gets their own ElevenLabs agent configured with:
 *   - Custom voice + language
 *   - System prompt (with org intents injected)
 *   - First message
 *   - Webhook tools for Google Calendar (check-availability, book-appointment)
 */

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "";
  // In production the env var should be the full https:// URL
  if (configured && !configured.includes("localhost") && !configured.startsWith("http")) {
    return `https://${configured}`;
  }
  if (configured && configured.startsWith("http")) return configured;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://calltechai.com";
}

const APP_URL = getAppUrl();

function getClient(): ElevenLabsClient {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured");
  return new ElevenLabsClient({ apiKey });
}

export interface ElevenLabsAgentConfig {
  name: string;
  orgId: string;
  orgName: string;
  voiceId: string;
  /** Primary language (ISO 639-1). Use `languages` when setting multiple. */
  language?: string;
  /** Primary + additional languages for the agent (first = primary). */
  languages?: string[];
  systemPrompt: string;
  firstMessage: string;
  /** When true, registers checkAvailability + bookAppointment webhook tools */
  hasCalendarTools?: boolean;
  /** ElevenLabs knowledge base document IDs to attach */
  knowledgeBaseDocIds?: string[];
}

function buildLanguagePresets(languageCodes: string[]): Record<string, { overrides: { agent: null; asr: null } }> {
  const presets: Record<string, { overrides: { agent: null; asr: null } }> = {};
  for (const code of languageCodes.slice(1)) {
    presets[code] = { overrides: { agent: null, asr: null } };
  }
  return presets;
}

function resolvePrimaryLanguage(config: { language?: string; languages?: string[] }): string {
  if (Array.isArray(config.languages) && config.languages.length > 0) {
    return config.languages[0];
  }
  return config.language ?? "en";
}

function buildCalendarWebhookTools(orgId: string) {
  return [
    {
      type: "webhook" as const,
      name: "checkAvailability",
      description:
        "Check available appointment slots for a specific date. Call this before booking to find open times.",
      responseTimeoutSecs: 30,
      apiSchema: {
        url: `${APP_URL}/api/tools/check-availability`,
        method: "POST" as const,
        requestBodySchema: {
          type: "object",
          properties: {
            org_id: {
              type: "string",
              description: `Organisation ID — always use "${orgId}"`,
            },
            date: {
              type: "string",
              description: "Date to check in YYYY-MM-DD format (e.g. 2026-12-20)",
            },
          },
          required: ["org_id", "date"],
        },
      },
    },
    {
      type: "webhook" as const,
      name: "bookAppointment",
      description:
        "Book an appointment after the caller confirms their preferred date, time, name, and email.",
      responseTimeoutSecs: 45,
      apiSchema: {
        url: `${APP_URL}/api/tools/book-appointment`,
        method: "POST" as const,
        requestBodySchema: {
          type: "object",
          properties: {
            org_id: {
              type: "string",
              description: `Organisation ID — always use "${orgId}"`,
            },
            date: { type: "string", description: "Appointment date in YYYY-MM-DD format" },
            time: { type: "string", description: "Appointment time, e.g. '10:30 AM'" },
            customer_name: { type: "string", description: "Full name of the caller" },
            customer_email: { type: "string", description: "Caller's email. Pass EXACTLY as spoken — e.g. 'uditi zero one three at gmail dot com'. Omit this field entirely if you cannot get a valid email after 3 attempts." },
            customer_phone: { type: "string", description: "Caller's phone number (optional)" },
            purpose: { type: "string", description: "Purpose of appointment, e.g. 'consultation'" },
          },
          required: ["org_id", "date", "time", "customer_name", "purpose"],
        },
      },
    },
  ];
}

/**
 * Builds the appointment-scheduler system prompt with org_id injected
 * so the LLM passes it in all tool calls.
 */
export function buildAppointmentSchedulerPrompt(
  orgId: string,
  orgName: string,
  agentName: string,
  customPrompt?: string | null
): string {
  const base =
    customPrompt?.trim() ||
    `You are ${agentName}, a friendly AI voice assistant for ${orgName}.

Your primary purpose is to help callers book appointments and answer questions about ${orgName}.

## Appointment Booking

You have two tools to handle appointment booking through Google Calendar:

### checkAvailability
Call this FIRST when a caller wants to book or asks about available times.
- Ask: "What date works best for you?"
- The date parameter accepts YYYY-MM-DD, natural language like "today", "tomorrow", "next Monday", or "day after tomorrow"
- You MUST pass the date — if the caller says "today" or "tomorrow" pass those exact words; for specific days convert them to YYYY-MM-DD using the current date as your reference
- Current date/time: {{current_date}} — use this to calculate future dates accurately
- Read out the available slots naturally: "I have openings at 9 AM, 10 AM, and 2 PM — which works best?"

### bookAppointment
Call this ONLY after the caller confirms a specific date AND time AND you have ALL required fields below.

Collect these fields ONE AT A TIME in this order:
1. **customer_name** — Ask: "Could I get your full name?"
2. **customer_email** — REQUIRED. Follow the two-part email collection flow below.
3. **purpose** — Ask: "What is this appointment for?" (e.g. consultation, checkup, demo)
4. **date** — already confirmed from checkAvailability step
5. **time** — already confirmed from checkAvailability step

Pass customer_email EXACTLY as the caller spoke it (including spaces and spoken words like "at" and "dot") — the system converts it automatically.

After a successful booking, confirm: "You're all set! Your [purpose] is booked for [date] at [time]. A calendar invite will be sent to [email]."

## Collecting Email Addresses by Voice — Two-Part Strategy

Email is very hard to capture accurately over the phone. Always use this approach:

**Step 1 — Ask for the username part only:**
"What is the part of your email BEFORE the at-sign? For example, if your email is john123, just say 'j-o-h-n-one-two-three'."

**Step 2 — Ask for the provider separately:**
"And which email service is that — Gmail, Yahoo, Outlook, iCloud, or something else?"

**Step 3 — Spell it back character by character to confirm:**
Say: "Let me read that back — [spell each character of the username], at [provider] dot com. Is that correct?"
Example: username = "uditi013", provider = "gmail" → say: "u-d-i-t-i-0-1-3 at gmail dot com — is that right?"

**Step 4 — If caller confirms, pass to the tool:**
Send customer_email as "[username] at [provider] dot com" exactly as spoken.
Example: customer_email = "uditi zero one three at gmail dot com"

**If the tool returns an email error:**
Read back what you understood again and ask the caller to correct only the wrong part.

## Important: "at the rate" means @
Some callers say "at the rate" instead of "at". This also gets misheard as "at the red" or "at the right".
All of these mean @. The system handles the conversion automatically — just pass what the caller said.

Examples of what callers say and what to pass:
| Caller says | Pass as customer_email |
|---|---|
| "uditi zero one three at gmail dot com" | "uditi zero one three at gmail dot com" |
| "uditi zero one three at the rate gmail dot com" | "uditi zero one three at the rate gmail dot com" |
| "uditi013 at gmail.com" | "uditi013 at gmail.com" |

## Handling Tool Errors

NEVER say phrases like "persistent issue", "technical difficulty", or "I'm having trouble" unless a tool explicitly tells you there is an error.

When a tool returns a message, relay it WORD FOR WORD to the caller — do not paraphrase or summarise it into a generic error.

If a tool says "not available on Suns" → tell the caller "We're not available on Sundays — our working days are Mon–Fri."
If a tool says "no available slots today" → tell the caller exactly that and ask for a different date.
If a tool returns a booking confirmation → read it back to the caller as-is.

## Email Collection — Max 3 Attempts

Try to collect a valid email using the two-part strategy. If after 3 attempts you still cannot get a valid email:
- Say: "No problem, I'll go ahead and book this for you. We'll follow up about the confirmation."
- Call bookAppointment WITHOUT the customer_email field (omit it entirely).
- Never abandon the booking because of email — the appointment matters more.

## Conversation Style
- Keep responses brief and natural for a phone call
- Ask only one question at a time
- Always be warm, professional, and helpful
- Do not read out long lists — offer 3–4 time slots maximum
- NEVER tell the caller there is a "persistent issue" — always give a specific, actionable response

Current date: {{current_date}}`;

  // Always append the org_id instruction so the LLM includes it in tool calls
  return (
    base +
    `\n\n## IMPORTANT — Tool Calls
Always include "org_id": "${orgId}" in every tool call you make. Never omit this field.`
  );
}

/**
 * Creates a new ElevenLabs Conversational AI agent for an organisation.
 * Returns the ElevenLabs agent ID.
 */
export async function createElevenLabsAgent(config: ElevenLabsAgentConfig): Promise<string> {
  const client = getClient();

  const fullPrompt =
    config.systemPrompt +
    `\n\n## IMPORTANT — Tool Calls\nAlways include "org_id": "${config.orgId}" in every tool call you make. Never omit this field.`;

  const tools =
    config.hasCalendarTools !== false
      ? buildCalendarWebhookTools(config.orgId)
      : [];

  const knowledgeBase = (config.knowledgeBaseDocIds ?? []).map((id) => ({
    type: "text" as const,
    id,
    name: id,
  }));

  const primaryLanguage = resolvePrimaryLanguage(config);
  const additionalLanguages = Array.isArray(config.languages) ? config.languages : [];
  const languagePresets = buildLanguagePresets(additionalLanguages);

  const agent = await client.conversationalAi.agents.create({
    name: config.name,
    conversationConfig: {
      agent: {
        firstMessage: config.firstMessage,
        language: primaryLanguage,
        prompt: {
          prompt: fullPrompt,
          llm: "gpt-4o",
          temperature: 0.7,
          ...(tools.length > 0 ? { tools } : {}),
          ...(knowledgeBase.length > 0 ? { knowledgeBase: knowledgeBase as never } : {}),
        },
      },
      tts: {
        voiceId: config.voiceId,
        stability: 0.5,
        similarityBoost: 0.75,
        // Required for Twilio Media Streams — μ-law 8 kHz is the only format Twilio supports
        agentOutputAudioFormat: "ulaw_8000",
      },
      // Tell ElevenLabs to expect μ-law 8 kHz audio from Twilio (ASR input)
      asr: {
        userInputAudioFormat: "ulaw_8000",
      },
      ...(Object.keys(languagePresets).length > 0 ? { languagePresets } : {}),
    },
    // Allow per-call conversation overrides (required so registerCall can inject
    // org_id, intents, and dynamic variables without ElevenLabs rejecting the stream)
    platformSettings: {
      overrides: {
        conversationConfigOverride: {
          agent: {
            prompt: {
              prompt: true,
            },
            firstMessage: true,
          },
          tts: {
            voiceId: true,
          },
        },
      },
      // Post-call webhook — fires after every conversation so we can persist
      // the transcript, trigger Telegram alerts, and link bookings.
      ...(APP_URL ? {
        webhook: {
          url: `${APP_URL}/api/webhooks/elevenlabs`,
        },
      } : {}),
    },
  } as never);

  const agentId = (agent as { agentId?: string; agent_id?: string }).agentId
    ?? (agent as { agent_id?: string }).agent_id;
  if (!agentId) throw new Error("ElevenLabs did not return agent_id");
  return agentId;
}

/**
 * Patches an existing ElevenLabs agent to register the post-call webhook URL.
 * This is required so ElevenLabs sends post-call transcription events to our
 * server, which we use for Telegram alerts and booking persistence.
 * Safe to call multiple times — idempotent PATCH.
 */
export async function patchAgentWebhook(agentId: string): Promise<void> {
  if (!APP_URL) return;
  const client = getClient();
  await client.conversationalAi.agents.update(agentId, {
    platformSettings: {
      webhook: {
        url: `${APP_URL}/api/webhooks/elevenlabs`,
      },
    },
  } as never);
}

/**
 * Patches an existing ElevenLabs agent for Twilio compatibility:
 *   - Sets μ-law 8000 Hz audio format for TTS output and ASR input
 *   - Enables conversation override permissions (prompt, first message, voice)
 *   - Sets post-call webhook URL for Telegram alerts and booking persistence
 *
 * This is required for Twilio Media Streams and for registerCall to inject
 * per-call dynamic data without ElevenLabs rejecting the stream.
 * Safe to call multiple times — idempotent PATCH.
 */
export async function patchAgentTwilioAudio(agentId: string): Promise<void> {
  const client = getClient();
  await client.conversationalAi.agents.update(agentId, {
    conversationConfig: {
      tts: {
        agentOutputAudioFormat: "ulaw_8000",
      } as never,
      asr: {
        userInputAudioFormat: "ulaw_8000",
      } as never,
    },
    platformSettings: {
      overrides: {
        conversationConfigOverride: {
          agent: {
            prompt: {
              prompt: true,
            },
            firstMessage: true,
          },
          tts: {
            voiceId: true,
          },
        },
      },
      // Ensure post-call webhook is always set so Telegram alerts fire
      ...(APP_URL ? {
        webhook: {
          url: `${APP_URL}/api/webhooks/elevenlabs`,
        },
      } : {}),
    },
  } as never);
}

export interface ElevenLabsAgentUpdate {
  name?: string;
  voiceId?: string;
  language?: string;
  languages?: string[];
  systemPrompt?: string;
  firstMessage?: string;
  orgId?: string;
  orgName?: string;
}

/**
 * Updates only the system prompt text on an agent (preserves tools, KB, LLM settings).
 */
export async function updateElevenLabsAgentPrompt(
  agentId: string,
  systemPrompt: string
): Promise<void> {
  const client = getClient();
  await client.conversationalAi.agents.update(agentId, {
    conversationConfig: {
      agent: {
        prompt: {
          prompt: systemPrompt,
        },
      },
    },
  } as never);
}

/**
 * Updates an existing ElevenLabs agent's configuration.
 */
export async function updateElevenLabsAgent(
  agentId: string,
  update: ElevenLabsAgentUpdate
): Promise<void> {
  const client = getClient();

  const patchBody: Record<string, unknown> = {};

  if (update.name) {
    patchBody.name = update.name;
  }

  const conversationConfig: Record<string, unknown> = {};
  const agentConfig: Record<string, unknown> = {};
  const ttsConfig: Record<string, unknown> = {};

  const languages = update.languages;
  if (languages && languages.length > 0) {
    agentConfig.language = languages[0];
    conversationConfig.languagePresets = buildLanguagePresets(languages);
  } else if (update.language) {
    agentConfig.language = update.language;
  }
  if (update.firstMessage) {
    agentConfig.firstMessage = update.firstMessage;
  }
  if (update.systemPrompt && update.orgId && update.orgName) {
    const resolvedName = update.name ?? "Assistant";
    agentConfig.prompt = {
      prompt: buildAppointmentSchedulerPrompt(
        update.orgId,
        update.orgName,
        resolvedName,
        update.systemPrompt
      ),
    };
  }
  if (update.voiceId) {
    ttsConfig.voiceId = update.voiceId;
  }

  if (Object.keys(agentConfig).length > 0) {
    conversationConfig.agent = agentConfig;
  }
  if (Object.keys(ttsConfig).length > 0) {
    conversationConfig.tts = ttsConfig;
  }
  if (Object.keys(conversationConfig).length > 0) {
    patchBody.conversationConfig = conversationConfig;
  }

  if (Object.keys(patchBody).length === 0) return;

  await client.conversationalAi.agents.update(agentId, patchBody as never);
}

/**
 * Deletes an ElevenLabs agent.
 */
export async function deleteElevenLabsAgent(agentId: string): Promise<void> {
  const client = getClient();
  await client.conversationalAi.agents.delete(agentId);
}

/**
 * Fetches the current config of an ElevenLabs agent.
 */
export async function getElevenLabsAgent(agentId: string) {
  const client = getClient();
  return client.conversationalAi.agents.get(agentId);
}

// ── ElevenLabs Phone Number Management ────────────────────────────────────────

const ELEVENLABS_API = "https://api.elevenlabs.io";

function getApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY not configured");
  return key;
}

/**
 * Imports a Twilio phone number into ElevenLabs.
 * After this, the number appears in the ElevenLabs dashboard under
 * Agents → Phone Numbers, and ElevenLabs takes over the Twilio webhook
 * automatically (pointing it to ElevenLabs' servers for native audio handling).
 *
 * Returns the ElevenLabs phone_number_id (e.g. "pn_xxxx").
 */
export async function importPhoneNumberToElevenLabs(
  phoneNumber: string,
  label: string,
  twilioSid: string,
  twilioToken: string
): Promise<string> {
  const res = await fetch(`${ELEVENLABS_API}/v1/convai/phone-numbers`, {
    method: "POST",
    headers: {
      "xi-api-key": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone_number: phoneNumber,
      label,
      sid: twilioSid,
      token: twilioToken,
      provider: "twilio",
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`ElevenLabs phone number import failed (${res.status}): ${errBody}`);
  }

  const data = await res.json() as { phone_number_id: string };
  if (!data.phone_number_id) throw new Error("ElevenLabs did not return phone_number_id");
  return data.phone_number_id;
}

/**
 * Assigns an ElevenLabs agent to a phone number that was previously imported.
 * After this, calls to that number are automatically routed to the agent.
 */
export async function assignAgentToElevenLabsPhoneNumber(
  elevenLabsPhoneNumberId: string,
  agentId: string
): Promise<void> {
  const res = await fetch(
    `${ELEVENLABS_API}/v1/convai/phone-numbers/${elevenLabsPhoneNumberId}`,
    {
      method: "PATCH",
      headers: {
        "xi-api-key": getApiKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ agent_id: agentId }),
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`ElevenLabs assign agent failed (${res.status}): ${errBody}`);
  }
}
