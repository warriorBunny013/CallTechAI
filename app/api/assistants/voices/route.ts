/**
 * List available voice options for creating assistants.
 */

import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/org";
import { VOICE_OPTIONS } from "@/lib/voice-options";

export async function GET() {
  const userAndOrg = await getCurrentUserAndOrg();
  if (!userAndOrg) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ voices: VOICE_OPTIONS });
}
