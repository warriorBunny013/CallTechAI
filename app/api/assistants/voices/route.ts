/**
 * List available voice options for creating assistants.
 */

import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/org";
import { getCuratedVoiceLibraryWithPreviews } from "@/lib/elevenlabs-voices";

export async function GET() {
  const userAndOrg = await getCurrentUserAndOrg();
  if (!userAndOrg) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const voices = await getCuratedVoiceLibraryWithPreviews();
  return NextResponse.json({ voices });
}
