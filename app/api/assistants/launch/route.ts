/**
 * POST /api/assistants/launch
 *
 * Links an ElevenLabs assistant (organisation_assistants row) to a phone number.
 * After this, inbound calls on that Twilio number will be handled by the
 * specified ElevenLabs agent instead of the org's default agent.
 *
 * Body: { phoneNumberId: string, assistantRowId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";
import { getCurrentUserAndOrg } from "@/lib/org";
import { patchAgentTwilioAudio, assignAgentToElevenLabsPhoneNumber } from "@/lib/elevenlabs-agent-manager";

export async function POST(request: NextRequest) {
  try {
    const userAndOrg = await getCurrentUserAndOrg();
    if (!userAndOrg) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { phoneNumberId, assistantRowId, assistantId } = body as {
      phoneNumberId?: string;
      assistantRowId?: string;
      // Legacy alias
      assistantId?: string;
    };

    const resolvedAssistantRowId = assistantRowId ?? assistantId;

    if (!phoneNumberId || !resolvedAssistantRowId) {
      return NextResponse.json(
        { error: "phoneNumberId and assistantRowId are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseService();
    const orgId = userAndOrg.organisationId;

    // Verify phone number belongs to org (also fetch ElevenLabs phone number ID for dashboard sync)
    const { data: phoneRow, error: phoneError } = await supabase
      .from("phone_numbers")
      .select("id, phone_number, elevenlabs_phone_number_id")
      .eq("id", phoneNumberId)
      .eq("organisation_id", orgId)
      .single();

    if (phoneError || !phoneRow) {
      return NextResponse.json({ error: "Phone number not found or unauthorized" }, { status: 404 });
    }

    // Resolve the ElevenLabs agent ID from the assistant row
    const { data: assistantRow, error: assistantError } = await supabase
      .from("organisation_assistants")
      .select("id, elevenlabs_agent_id, name")
      .eq("id", resolvedAssistantRowId)
      .eq("organisation_id", orgId)
      .maybeSingle();

    // If not found by row ID, try looking up as ElevenLabs agent ID
    let agentId: string | null = null;
    let agentName = "AI Assistant";
    let rowId = resolvedAssistantRowId;

    if (!assistantError && assistantRow) {
      agentId = (assistantRow as { elevenlabs_agent_id: string }).elevenlabs_agent_id;
      agentName = (assistantRow as { name: string }).name;
    } else {
      // Try by elevenlabs_agent_id
      const { data: byAgentId } = await supabase
        .from("organisation_assistants")
        .select("id, elevenlabs_agent_id, name")
        .eq("organisation_id", orgId)
        .eq("elevenlabs_agent_id", resolvedAssistantRowId)
        .maybeSingle();

      if (byAgentId) {
        agentId = (byAgentId as { elevenlabs_agent_id: string }).elevenlabs_agent_id;
        agentName = (byAgentId as { name: string }).name;
        rowId = (byAgentId as { id: string }).id;
      }
    }

    if (!agentId) {
      return NextResponse.json({ error: "Assistant not found" }, { status: 404 });
    }

    // Ensure the agent is configured for Twilio (μ-law 8kHz + override permissions).
    // Safe to call every time — idempotent PATCH.
    try {
      await patchAgentTwilioAudio(agentId);
      console.log(`[assistants/launch] Patched agent ${agentId} for Twilio audio format`);
    } catch (patchErr) {
      console.warn("[assistants/launch] Could not patch agent audio format (continuing):", patchErr);
    }

    // Sync the agent assignment to ElevenLabs dashboard if we have an ElevenLabs phone number ID
    const elevenLabsPhoneNumberId = (phoneRow as { elevenlabs_phone_number_id?: string | null }).elevenlabs_phone_number_id;
    if (elevenLabsPhoneNumberId) {
      try {
        await assignAgentToElevenLabsPhoneNumber(elevenLabsPhoneNumberId, agentId);
        console.log(`[assistants/launch] Assigned agent ${agentId} to ElevenLabs phone ${elevenLabsPhoneNumberId}`);
      } catch (assignErr) {
        console.warn("[assistants/launch] ElevenLabs phone assignment failed (continuing):", assignErr);
      }
    }

    // Link the phone number to this specific ElevenLabs agent
    const { data: updatedPhone, error: updateError } = await supabase
      .from("phone_numbers")
      .update({
        assistant_id: rowId,
        elevenlabs_agent_id: agentId,
        is_active: true,
        updated_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq("id", phoneNumberId)
      .eq("organisation_id", orgId)
      .select()
      .single();

    if (updateError) {
      console.error("[assistants/launch] DB update error:", updateError);
      return NextResponse.json({ error: "Failed to link assistant to phone number" }, { status: 500 });
    }

    return NextResponse.json({
      message: `Assistant "${agentName}" is now handling calls on ${(phoneRow as { phone_number: string }).phone_number}.`,
      phoneNumber: updatedPhone,
    });
  } catch (error) {
    console.error("[assistants/launch] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
