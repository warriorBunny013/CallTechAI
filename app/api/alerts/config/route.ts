/**
 * GET  /api/alerts/config  — fetch alert config for the current org
 * PUT  /api/alerts/config  — save alert trigger preferences
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseService } from "@/lib/supabase/service";
import { getCurrentUserAndOrg } from "@/lib/org";
import { ensureTelegramConnectToken } from "@/lib/telegram-connect";

export async function GET() {
  const userAndOrg = await getCurrentUserAndOrg();
  if (!userAndOrg) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data } = await supabase
    .from("organisation_alert_configs")
    .select(
      "telegram_enabled, telegram_chat_id, alert_on_new_call, alert_on_new_booking, updated_at"
    )
    .eq("organisation_id", userAndOrg.organisationId)
    .maybeSingle();

  return NextResponse.json({ config: data ?? null });
}

export async function PUT(req: NextRequest) {
  const userAndOrg = await getCurrentUserAndOrg();
  if (!userAndOrg) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const serviceSupabase = getSupabaseService();

  // Preserve existing Telegram link; only update triggers (and optional manual chat id)
  const { data: existing } = await serviceSupabase
    .from("organisation_alert_configs")
    .select("telegram_chat_id, telegram_enabled, telegram_connect_token")
    .eq("organisation_id", userAndOrg.organisationId)
    .maybeSingle();

  let connectToken = (existing as { telegram_connect_token?: string } | null)?.telegram_connect_token;
  if (!connectToken) {
    ({ token: connectToken } = await ensureTelegramConnectToken(userAndOrg.organisationId));
  }

  const manualChatId =
    typeof body.telegram_chat_id === "string" ? body.telegram_chat_id.trim() : null;
  const chatId =
    manualChatId ||
    (existing as { telegram_chat_id?: string } | null)?.telegram_chat_id ||
    null;

  const telegramEnabled =
    body.telegram_enabled !== undefined
      ? Boolean(body.telegram_enabled)
      : !!(existing as { telegram_enabled?: boolean } | null)?.telegram_enabled;

  const payload = {
    organisation_id: userAndOrg.organisationId,
    telegram_connect_token: connectToken,
    telegram_enabled: telegramEnabled && !!chatId,
    telegram_bot_token: null,
    telegram_chat_id: chatId,
    whatsapp_enabled: false,
    whatsapp_to_number: null,
    whatsapp_from_number: null,
    alert_on_new_call: body.alert_on_new_call !== false,
    alert_on_new_booking: body.alert_on_new_booking !== false,
    updated_at: new Date().toISOString(),
  };

  const { error } = await serviceSupabase
    .from("organisation_alert_configs")
    .upsert(payload as never, { onConflict: "organisation_id" });

  if (error) {
    console.error("[alerts/config] upsert error:", error);
    return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
