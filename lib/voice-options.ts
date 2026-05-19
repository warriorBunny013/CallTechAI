/**
 * ElevenLabs built-in (premade) voices for the assistant wizard.
 * IDs verified against the ElevenLabs account used in production.
 */

export type VoiceAgeRange = "young" | "middle-age"
export type VoiceGender = "female" | "male"
export type VoiceLanguageCode = "en" | "ru"

export interface VoiceOption {
  id: string
  name: string
  provider: string
  description: string
  languages: VoiceLanguageCode[]
  ageRange: VoiceAgeRange
  gender: VoiceGender
  /** Legacy local path — used only if previewUrl is missing */
  previewFile?: string
  /** ElevenLabs-hosted sample MP3 (fetched at runtime from the API) */
  previewUrl?: string | null
}

export const VOICE_OPTIONS: VoiceOption[] = [
  // ── Female ───────────────────────────────────────────────────────────────
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Sarah",
    provider: "11labs",
    description: "Mature, reassuring & confident — professional American female.",
    languages: ["en"],
    ageRange: "young",
    gender: "female",
    previewFile: "/voice-previews/sarah.mp3",
  },
  {
    id: "FGY2WhTYpPnrIDTdsKH5",
    name: "Laura",
    provider: "11labs",
    description: "Enthusiastic with attitude — engaging young American female.",
    languages: ["en"],
    ageRange: "young",
    gender: "female",
    previewFile: "/voice-previews/laura.mp3",
  },
  {
    id: "cgSgspJ2msm6clMCkdW9",
    name: "Jessica",
    provider: "11labs",
    description: "Playful, bright & warm — friendly young American female.",
    languages: ["en"],
    ageRange: "young",
    gender: "female",
    previewFile: "/voice-previews/jessica.mp3",
  },
  {
    id: "WAhoMTNdLdMoq1j3wf3I",
    name: "Hope",
    provider: "11labs",
    description: "Smooth, engaging & kind — soft American female.",
    languages: ["en"],
    ageRange: "young",
    gender: "female",
    previewFile: "/voice-previews/hope.mp3",
  },
  {
    id: "XrExE9yKIg1WjnnlVkGX",
    name: "Matilda",
    provider: "11labs",
    description: "Knowledgeable & professional — upbeat American female.",
    languages: ["en"],
    ageRange: "middle-age",
    gender: "female",
    previewFile: "/voice-previews/matilda.mp3",
  },
  {
    id: "hpp4J3VqNfWAUOO0d1Us",
    name: "Bella",
    provider: "11labs",
    description: "Professional, bright & warm — clear American female.",
    languages: ["en"],
    ageRange: "middle-age",
    gender: "female",
    previewFile: "/voice-previews/bella.mp3",
  },
  {
    id: "Xb7hH8MSUJpSbSDYk0k2",
    name: "Alice",
    provider: "11labs",
    description: "Clear & engaging educator — professional British female.",
    languages: ["en"],
    ageRange: "middle-age",
    gender: "female",
    previewFile: "/voice-previews/alice.mp3",
  },
  {
    id: "pFZP5JQG7iQjIQuC4Bku",
    name: "Lily",
    provider: "11labs",
    description: "Velvety & confident — British actress voice.",
    languages: ["en"],
    ageRange: "middle-age",
    gender: "female",
    previewFile: "/voice-previews/lily.mp3",
  },
  {
    id: "tnSpp4vdxKPjI9w0GnoV",
    name: "Hope (Upbeat)",
    provider: "11labs",
    description: "Upbeat & clear — social media energy American female.",
    languages: ["en"],
    ageRange: "young",
    gender: "female",
    previewFile: "/voice-previews/hope-upbeat.mp3",
  },

  // ── Male ─────────────────────────────────────────────────────────────────
  {
    id: "CwhRBWXzGAHq8TQ4Fs17",
    name: "Roger",
    provider: "11labs",
    description: "Laid-back, casual & resonant — classy American male.",
    languages: ["en"],
    ageRange: "middle-age",
    gender: "male",
    previewFile: "/voice-previews/roger.mp3",
  },
  {
    id: "cjVigY5qzO86Huf0OWal",
    name: "Eric",
    provider: "11labs",
    description: "Smooth & trustworthy — classy American male.",
    languages: ["en"],
    ageRange: "middle-age",
    gender: "male",
    previewFile: "/voice-previews/eric.mp3",
  },
  {
    id: "iP95p4xoKVk53GoZ742B",
    name: "Chris",
    provider: "11labs",
    description: "Charming & down-to-earth — casual American male.",
    languages: ["en"],
    ageRange: "middle-age",
    gender: "male",
    previewFile: "/voice-previews/chris.mp3",
  },
  {
    id: "nPczCjzI2devNBz1zQrb",
    name: "Brian",
    provider: "11labs",
    description: "Deep, resonant & comforting — classy American male.",
    languages: ["en"],
    ageRange: "middle-age",
    gender: "male",
    previewFile: "/voice-previews/brian.mp3",
  },
  {
    id: "JBFqnCBsd6RMkjVDRZzb",
    name: "George",
    provider: "11labs",
    description: "Warm captivating storyteller — mature British male.",
    languages: ["en"],
    ageRange: "middle-age",
    gender: "male",
    previewFile: "/voice-previews/george.mp3",
  },
  {
    id: "onwK4e9ZLuTAKqWW03F9",
    name: "Daniel",
    provider: "11labs",
    description: "Steady broadcaster — formal British male.",
    languages: ["en"],
    ageRange: "middle-age",
    gender: "male",
    previewFile: "/voice-previews/daniel.mp3",
  },
  {
    id: "bIHbv24MWmeRgasZH58o",
    name: "Will",
    provider: "11labs",
    description: "Relaxed optimist — chill young American male.",
    languages: ["en"],
    ageRange: "young",
    gender: "male",
    previewFile: "/voice-previews/will.mp3",
  },
  {
    id: "IKne3meq5aSn9XLyUdCD",
    name: "Charlie",
    provider: "11labs",
    description: "Deep, confident & energetic — young Australian male.",
    languages: ["en"],
    ageRange: "young",
    gender: "male",
    previewFile: "/voice-previews/charlie.mp3",
  },
  {
    id: "pqHfZKP75CvOlQylNhV4",
    name: "Bill",
    provider: "11labs",
    description: "Wise, mature & balanced — crisp older American male.",
    languages: ["en"],
    ageRange: "middle-age",
    gender: "male",
    previewFile: "/voice-previews/bill.mp3",
  },
]
