/**
 * Server-only: fetch ElevenLabs voice metadata (preview URLs).
 */

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { getCuratedVoiceLibrary } from "@/lib/voice-library";
import type { VoiceOption } from "@/lib/voice-options";

export async function getCuratedVoiceLibraryWithPreviews(): Promise<VoiceOption[]> {
  const curated = getCuratedVoiceLibrary();
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return curated;

  try {
    const client = new ElevenLabsClient({ apiKey });
    const result = await client.voices.getAll();
    const previewById = new Map<string, string>();
    for (const v of result.voices ?? []) {
      const id = v.voiceId;
      if (id && v.previewUrl) previewById.set(id, v.previewUrl);
    }
    return curated.map((voice) => ({
      ...voice,
      previewUrl: previewById.get(voice.id) ?? null,
    }));
  } catch (err) {
    console.error("[elevenlabs-voices] Failed to fetch voice previews:", err);
    return curated;
  }
}
