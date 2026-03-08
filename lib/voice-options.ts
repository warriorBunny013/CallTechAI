/**
 * Voice options for creating assistants.
 * 11labs voices — English and Russian. Filter by language, age range, and gender.
 * Bilingual voices (English & Russian) appear in a separate filter option.
 */

export type VoiceAgeRange = "young" | "middle-age"
export type VoiceGender = "female" | "male"
export type VoiceLanguageCode = "en" | "ru"

export interface VoiceOption {
  id: string
  name: string
  provider: string
  description: string
  /** Single language or both for bilingual voices */
  languages: VoiceLanguageCode[]
  ageRange: VoiceAgeRange
  gender: VoiceGender
  /** Path to local preview audio in public folder */
  previewFile: string
}

export const VOICE_OPTIONS: VoiceOption[] = [
  // ========== ENGLISH ==========
  // English Female — Young
  {
    id: "MClEFoImJXBTgLwdLI5n",
    name: "Ivy",
    provider: "11labs",
    description: "Sophisticated and sassy — clear, articulate young female.",
    languages: ["en"],
    ageRange: "young",
    gender: "female",
    previewFile: "/voice-previews/ivy.mp3",
  },
  {
    id: "fTtv3eikoepIosk8dTZ5",
    name: "Ashley",
    provider: "11labs",
    description: "Youthful & calm — natural, conversational.",
    languages: ["en"],
    ageRange: "young",
    gender: "female",
    previewFile: "/voice-previews/ashley.mp3",
  },
  {
    id: "DXFkLCBUTmvXpp2QwZjA",
    name: "Eryn",
    provider: "11labs",
    description: "Friendly AI assistant — warm, calm American female.",
    languages: ["en"],
    ageRange: "young",
    gender: "female",
    previewFile: "/voice-previews/eryn.mp3",
  },
  // English Female — Middle-aged
  {
    id: "bm3QvaZ3fUSCRBC3UV1f",
    name: "Steffy",
    provider: "11labs",
    description: "Customer service agent — empathetic, clear, conversational.",
    languages: ["en"],
    ageRange: "middle-age",
    gender: "female",
    previewFile: "/voice-previews/steffy.mp3",
  },
  {
    id: "P7x743VjyZEOihNNygQ9",
    name: "Zuri",
    provider: "11labs",
    description: "New Yorker — calm middle-aged woman.",
    languages: ["en"],
    ageRange: "middle-age",
    gender: "female",
    previewFile: "/voice-previews/zuri.mp3",
  },
  // English Male — Young
  {
    id: "UgBBYS2sOqTuMpoF3BR0",
    name: "Mark",
    provider: "11labs",
    description: "Natural conversations — casual young-adult.",
    languages: ["en", "ru"],
    ageRange: "young",
    gender: "male",
    previewFile: "/voice-previews/mark.mp3",
  },
  {
    id: "4e32WqNVWRquDa1OcRYZ",
    name: "Ryan",
    provider: "11labs",
    description: "Honest and relaxed — genuinely opinionated.",
    languages: ["en"],
    ageRange: "young",
    gender: "male",
    previewFile: "/voice-previews/ryan.mp3",
  },
  {
    id: "qxjGnozOAtD4eqNuXms4",
    name: "John Shaw",
    provider: "11labs",
    description: "Polite customer care — empathetic British accent. Knows English & Russian.",
    languages: ["en", "ru"],
    ageRange: "young",
    gender: "male",
    previewFile: "/voice-previews/john-shaw.mp3",
  },
  // English Male — Middle-aged
  {
    id: "Wq15xSaY3gWvazBRaGEU",
    name: "Nathaniel",
    provider: "11labs",
    description: "Soft and composed — reassuring tone. Ideal for healthcare, banking, and support.",
    languages: ["en", "ru"],
    ageRange: "middle-age",
    gender: "male",
    previewFile: "/voice-previews/nathaniel.mp3",
  },
  {
    id: "scOwDtmlUjD3prqpp97I",
    name: "Sam",
    provider: "11labs",
    description: "Support agent — warm, clear middle-aged American.",
    languages: ["en", "ru"],
    ageRange: "middle-age",
    gender: "male",
    previewFile: "/voice-previews/sam.mp3",
  },
  // ========== RUSSIAN ==========
  // Russian Female — Young
  {
    id: "wUndevsXFk0ArF7vJ61U",
    name: "Polina J",
    provider: "11labs",
    description: "Customer care — confident, professional. Ideal for IVR and help centers.",
    languages: ["ru"],
    ageRange: "young",
    gender: "female",
    previewFile: "/voice-previews/polina-j.mp3",
  },
  {
    id: "NhY0kyTmsKuEpHvDMngm",
    name: "Nataly",
    provider: "11labs",
    description: "Youthful, gentle and soft — calm, natural young female Russian voice.",
    languages: ["ru"],
    ageRange: "young",
    gender: "female",
    previewFile: "/voice-previews/nataly.mp3",
  },
  // Russian Female — Middle-aged (bilingual)
  {
    id: "NHRgOEwqx5WZNClv5sat",
    name: "Chelsea",
    provider: "11labs",
    description: "Conversational and bright — 30-something American from Florida. Knows English & Russian.",
    languages: ["en", "ru"],
    ageRange: "middle-age",
    gender: "female",
    previewFile: "/voice-previews/chelsea.mp3",
  },
  {
    id: "FUfBrNit0NNZAwb58KWH",
    name: "Angela",
    provider: "11labs",
    description: "Conversational and friendly — warm, good for memoirs and intellectual dialogue.",
    languages: ["en", "ru"],
    ageRange: "middle-age",
    gender: "female",
    previewFile: "/voice-previews/angela.mp3",
  },
  // Russian Male — Young
  {
    id: "m2gtxNsYBaIRqPBA5vU5",
    name: "Oleg Krugliak",
    provider: "11labs",
    description: "Engaging and reflective — young Russian male. Perfect for conversational speech.",
    languages: ["ru"],
    ageRange: "young",
    gender: "male",
    previewFile: "/voice-previews/oleg-krugliak.mp3",
  },
  // Russian Male — Middle-aged (bilingual)
  {
    id: "s0phbFBBp708ZeIy8oGx",
    name: "Arcadays",
    provider: "11labs",
    description: "Warm, light and natural — relaxed, friendly. Knows English & Russian.",
    languages: ["en", "ru"],
    ageRange: "middle-age",
    gender: "male",
    previewFile: "/voice-previews/arcadays.mp3",
  },
  {
    id: "Q4VpK08ojkrSxRedeTYz",
    name: "El Dimtro",
    provider: "11labs",
    description: "Calm — meditative, sponge voice.",
    languages: ["ru"],
    ageRange: "middle-age",
    gender: "male",
    previewFile: "/voice-previews/el-dimtro.mp3",
  },
]
