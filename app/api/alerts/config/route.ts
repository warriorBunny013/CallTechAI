/**
 * GET  /api/alerts/config  — fetch alert config for the current org
 * PUT  /api/alerts/config  — save alert config for the current org
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseService } from "@/lib/supabase/service";
import { getCurrentUserAndOrg } from "@/lib/org";

export async function GET() {
  const userAndOrg = await getCurrentUserAndOrg();
  if (!userAndOrg) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data } = await supabase
    .from("organisation_alert_configs")
    .select("*")
    .eq("organisation_id", userAndOrg.organisationId)
    .maybeSingle();

  return NextResponse.json({ config: data ?? null });
}

export async function PUT(req: NextRequest) {
  const userAndOrg = await getCurrentUserAndOrg();
  if (!userAndOrg) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const payload = {
    organisation_id: userAndOrg.organisationId,
    telegram_enabled: Boolean(body.telegram_enabled),
    /* bot token is managed centrally via env — never store user-provided tokens */
    telegram_bot_token: null,
    telegram_chat_id: body.telegram_chat_id?.trim() || null,
    whatsapp_enabled: Boolean(body.whatsapp_enabled),
    whatsapp_to_number: body.whatsapp_to_number?.trim() || null,
    whatsapp_from_number: body.whatsapp_from_number?.trim() || null,
    alert_on_new_call: body.alert_on_new_call !== false,
    alert_on_new_booking: body.alert_on_new_booking !== false,
    updated_at: new Date().toISOString(),
  };

  const serviceSupabase = getSupabaseService();
  const { error } = await serviceSupabase
    .from("organisation_alert_configs")
    .upsert(payload as never, { onConflict: "organisation_id" });

  if (error) {
    console.error("[alerts/config] upsert error:", error);
    return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
