/**
 * Current organisation for the authenticated user.
 * GET: return org (id, name, selected_voice_agent_id)
 * PATCH: update selected_voice_agent_id and/or name.
 * When assistant changes, sync to all VAPI phone numbers for this org.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndOrg } from "@/lib/org";
import { setVapiPhoneNumberAssistant } from "@/lib/vapi-phone-number";
import { syncOrgIntentsToVapi } from "@/lib/vapi-update-assistant";

export async function GET() {
  const userAndOrg = await getCurrentUserAndOrg();
  if (!userAndOrg) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: organisation, error } = await supabase
    .from("organisations")
    .select("id, name, selected_voice_agent_id")
    .eq("id", userAndOrg.organisationId)
    .single();

  if (error || !organisation) {
    return NextResponse.json(
      { error: "Organisation not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ organisation });
}

export async function PATCH(req: NextRequest) {
  const userAndOrg = await getCurrentUserAndOrg();
  if (!userAndOrg) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { selected_voice_agent_id, name } = body;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (selected_voice_agent_id !== undefined) {
    updates.selected_voice_agent_id =
      selected_voice_agent_id === "" || selected_voice_agent_id == null
        ? null
        : String(selected_voice_agent_id);
  }
  if (name !== undefined && typeof name === "string" && name.trim()) {
    updates.name = name.trim();
  }

  if (Object.keys(updates).length <= 1) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: organisation, error } = await supabase
    .from("organisations")
    .update(updates)
    .eq("id", userAndOrg.organisationId)
    .select("id, name, selected_voice_agent_id")
    .single();

  if (error) {
    console.error("[organisation PATCH]", error);
    return NextResponse.json(
      { error: "Failed to update organisation" },
      { status: 500 }
    );
  }

  // Sync assistant to all VAPI phone numbers for this org
  // so edits in CallTechAI are reflected in VAPI dashboard
  if (selected_voice_agent_id !== undefined) {
    const { data: phones } = await supabase
      .from("phone_numbers")
      .select("vapi_phone_number_id")
      .eq("organisation_id", userAndOrg.organisationId);
    const assistantId =
      selected_voice_agent_id === "" || selected_voice_agent_id == null
        ? null
        : String(selected_voice_agent_id);
    for (const p of phones ?? []) {
      const vid = (p as { vapi_phone_number_id?: string }).vapi_phone_number_id;
      if (vid) {
        await setVapiPhoneNumberAssistant(vid, assistantId);
      }
    }
    // Sync org intents to the new VAPI assistant's system prompt
    await syncOrgIntentsToVapi(userAndOrg.organisationId, supabase);
  }

  return NextResponse.json({ organisation });
}
