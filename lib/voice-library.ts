/**
 * Assistant languages and voice library helpers.
 */

import { VOICE_OPTIONS, type VoiceOption } from "@/lib/voice-options";

export type { VoiceOption } from "@/lib/voice-options";

export function getCuratedVoiceLibrary(): VoiceOption[] {
  const seen = new Set<string>();
  return VOICE_OPTIONS.filter((v) => {
    if (seen.has(v.id)) return false;
    seen.add(v.id);
    return true;
  });
}

export function getVoicePreviewSource(voice: VoiceOption): string | null {
  return voice.previewUrl ?? voice.previewFile ?? null;
}

/** Languages supported by ElevenLabs conversational agents (ISO 639-1). */
export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "nl", label: "Dutch" },
  { code: "pl", label: "Polish" },
  { code: "ru", label: "Russian" },
  { code: "uk", label: "Ukrainian" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Chinese" },
  { code: "ko", label: "Korean" },
  { code: "tr", label: "Turkish" },
  { code: "sv", label: "Swedish" },
  { code: "da", label: "Danish" },
  { code: "fi", label: "Finnish" },
  { code: "no", label: "Norwegian" },
  { code: "cs", label: "Czech" },
  { code: "ro", label: "Romanian" },
  { code: "hu", label: "Hungarian" },
  { code: "el", label: "Greek" },
  { code: "he", label: "Hebrew" },
  { code: "id", label: "Indonesian" },
  { code: "vi", label: "Vietnamese" },
  { code: "th", label: "Thai" },
  { code: "ms", label: "Malay" },
  { code: "fil", label: "Filipino" },
] as const;

const LANGUAGE_LABEL_BY_CODE = new Map<string, string>(
  SUPPORTED_LANGUAGES.map((l) => [l.code, l.label])
);

export function getLanguageLabel(code: string): string {
  return LANGUAGE_LABEL_BY_CODE.get(code) ?? code.toUpperCase();
}

/** e.g. ["en","es","fr"] → "English, Spanish, French" */
export function formatLanguagesLabel(codes: string[]): string {
  const unique = [...new Set(codes.filter(Boolean))];
  if (unique.length === 0) return "English";
  return unique.map(getLanguageLabel).join(", ");
}

export function normalizeLanguageCodes(codes: unknown): string[] {
  if (!Array.isArray(codes)) return ["en"];
  const valid = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));
  const normalized = codes
    .filter((c): c is string => typeof c === "string" && valid.has(c as (typeof SUPPORTED_LANGUAGES)[number]["code"]));
  return normalized.length > 0 ? normalized : ["en"];
}
