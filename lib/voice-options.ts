/**
 * Voice options for creating assistants.
 * 11labs voices available in VAPI (provider: "11labs").
 */

export interface VoiceOption {
  id: string;
  name: string;
  provider: string;
  description?: string;
}

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: "pNInz6obpgDQGcFmaJgB", name: "Kylie", provider: "11labs", description: "Friendly, warm" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Savannah", provider: "11labs", description: "Clear, professional" },
  { id: "VR6AewLTigWG4xSOukaG", name: "Arnold", provider: "11labs", description: "Deep, authoritative" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", provider: "11labs", description: "Friendly, casual" },
  { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte", provider: "11labs", description: "Warm, articulate" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", provider: "11labs", description: "Calm, British" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni", provider: "11labs", description: "Friendly, warm" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", provider: "11labs", description: "Friendly, American" },
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", provider: "11labs", description: "Calm, clear" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", provider: "11labs", description: "Strong, confident" },
  { id: "CYw3kZ02Hs0563khs1Fj", name: "Dave", provider: "11labs", description: "Conversational" },
  { id: "GBv7mTt0atIp3Br8iCZE", name: "Thomas", provider: "11labs", description: "Calm, steady" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", provider: "11labs", description: "Friendly, upbeat" },
  { id: "g5CIjZEefAph4nQFvHAz", name: "Emily", provider: "11labs", description: "Friendly, American" },
  { id: "oWAxZDx7w5VEj9dCyTzz", name: "George", provider: "11labs", description: "Warm, British" },
];
