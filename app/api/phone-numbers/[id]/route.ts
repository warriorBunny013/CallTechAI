/**
 * Phone Number detail routes.
 *
 * PUT  – Link a specific organisation_assistants row to this phone number
 *        (optional: callers can override which ElevenLabs agent handles this line).
 * DELETE – Remove from our DB. Twilio webhook for the number can be cleared
 *          manually in the Twilio console if needed.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseService } from "@/lib/supabase/service";
import { getCurrentUserAndOrg } from "@/lib/org";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userAndOrg = await getCurrentUserAndOrg();
    if (!userAndOrg) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // assistantRowId = organisation_assistants.id  (preferred)
    // elevenLabsAgentId = raw ElevenLabs agent ID  (fallback)
    const { assistantRowId, elevenLabsAgentId, isActive } = body as {
      assistantRowId?: string;
      elevenLabsAgentId?: string;
      isActive?: boolean;
    };

    const supabase = await createClient();

    const { data: existingPhone, error: checkError } = await supabase
      .from("phone_numbers")
      .select("id, organisation_id")
      .eq("id", id)
      .eq("organisation_id", userAndOrg.organisationId)
      .single();

    if (checkError || !existingPhone) {
      return NextResponse.json({ error: "Phone number not found or unauthorized" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Resolve ElevenLabs agent ID from assistantRowId if provided
    if (assistantRowId) {
      const serviceSupabase = getSupabaseService();
      const { data: assistantRow } = await serviceSupabase
        .from("organisation_assistants")
        .select("elevenlabs_agent_id")
        .eq("id", assistantRowId)
        .eq("organisation_id", userAndOrg.organisationId)
        .maybeSingle();

      if (assistantRow) {
        updateData.assistant_id = assistantRowId;
        updateData.elevenlabs_agent_id = (assistantRow as { elevenlabs_agent_id: string }).elevenlabs_agent_id;
        updateData.is_active = true;
      }
    } else if (elevenLabsAgentId) {
      updateData.elevenlabs_agent_id = elevenLabsAgentId;
      updateData.is_active = true;
    }

    if (typeof isActive === "boolean") {
      updateData.is_active = isActive;
    }

    const { data: updatedPhone, error } = await supabase
      .from("phone_numbers")
      .update(updateData)
      .eq("id", id)
      .eq("organisation_id", userAndOrg.organisationId)
      .select()
      .single();

    if (error) {
      console.error("[phone-numbers PUT] Supabase error:", error);
      return NextResponse.json({ error: "Failed to update phone number" }, { status: 500 });
    }

    return NextResponse.json({ phoneNumber: updatedPhone });
  } catch (error) {
    console.error("[phone-numbers PUT] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userAndOrg = await getCurrentUserAndOrg();
    if (!userAndOrg) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createClient();

    // Verify ownership
    const { data: existingPhone, error: checkError } = await supabase
      .from("phone_numbers")
      .select("id")
      .eq("id", id)
      .eq("organisation_id", userAndOrg.organisationId)
      .single();

    if (checkError || !existingPhone) {
      return NextResponse.json({ error: "Phone number not found or unauthorized" }, { status: 404 });
    }

    const { error } = await supabase
      .from("phone_numbers")
      .delete()
      .eq("id", id)
      .eq("organisation_id", userAndOrg.organisationId);

    if (error) {
      console.error("[phone-numbers DELETE] Supabase error:", error);
      return NextResponse.json({ error: "Failed to delete phone number" }, { status: 500 });
    }

    return NextResponse.json({ message: "Phone number deleted successfully" });
  } catch (error) {
    console.error("[phone-numbers DELETE] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
