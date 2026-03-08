/**
 * Delete the current org's assistant (unlink from org and phone numbers, delete from VAPI).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndOrg } from "@/lib/org";
import { setVapiPhoneNumberAssistant } from "@/lib/vapi-phone-number";

const VAPI_BASE = "https://api.vapi.ai";

export async function DELETE() {
  try {
    const userAndOrg = await getCurrentUserAndOrg();
    if (!userAndOrg) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    const { data: org } = await supabase
      .from("organisations")
      .select("id, selected_voice_agent_id")
      .eq("id", userAndOrg.organisationId)
      .single();

    const assistantId = (org as { selected_voice_agent_id?: string | null } | null)?.selected_voice_agent_id ?? null;
    if (!assistantId) {
      return NextResponse.json(
        { error: "No assistant to delete" },
        { status: 404 }
      );
    }

    const vapiApiKey = process.env.VAPI_API_KEY;

    // Unlink all org phone numbers from this assistant
    const { data: phones } = await supabase
      .from("phone_numbers")
      .select("vapi_phone_number_id")
      .eq("organisation_id", userAndOrg.organisationId);

    for (const p of phones ?? []) {
      const vid = (p as { vapi_phone_number_id?: string }).vapi_phone_number_id;
      if (vid && vapiApiKey) {
        await setVapiPhoneNumberAssistant(vid, null, vapiApiKey);
      }
    }

    // Clear org's selected assistant
    const { error: updateError } = await supabase
      .from("organisations")
      .update({
        selected_voice_agent_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userAndOrg.organisationId);

    if (updateError) {
      console.error("[assistants/delete] Org update failed:", updateError);
      return NextResponse.json(
        { error: "Failed to unlink assistant from organisation" },
        { status: 500 }
      );
    }

    // Delete assistant from VAPI
    if (vapiApiKey && vapiApiKey !== "your_vapi_api_key_here") {
      const delRes = await fetch(`${VAPI_BASE}/assistant/${encodeURIComponent(assistantId)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${vapiApiKey}`,
        },
      });
      if (!delRes.ok) {
        console.warn("[assistants/delete] VAPI DELETE failed (assistant may already be gone):", delRes.status);
      }
    }

    return NextResponse.json({
      message: "Assistant deleted successfully",
    });
  } catch (err) {
    console.error("[assistants/delete] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
