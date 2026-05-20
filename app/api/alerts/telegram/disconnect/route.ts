/**
 * POST /api/alerts/telegram/disconnect
 * Removes Telegram link for the current org and issues a fresh connect token.
 */

import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/org";
import { getSupabaseService } from "@/lib/supabase/service";
import {
  ensureTelegramConnectToken,
  generateTelegramConnectToken,
} from "@/lib/telegram-connect";

export async function POST() {
  const userAndOrg = await getCurrentUserAndOrg();
  if (!userAndOrg) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseService();
    const newToken = generateTelegramConnectToken();

    const { error } = await supabase.from("organisation_alert_configs").upsert(
      {
        organisation_id: userAndOrg.organisationId,
        telegram_enabled: false,
        telegram_chat_id: null,
        telegram_connect_token: newToken,
        telegram_bot_token: null,
        whatsapp_enabled: false,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "organisation_id" }
    );

    if (error) {
      console.error("[alerts/telegram/disconnect] error:", error);
      return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
    }

    const { connectUrl } = await ensureTelegramConnectToken(userAndOrg.organisationId);

    return NextResponse.json({ ok: true, connectUrl });
  } catch (err) {
    console.error("[alerts/telegram/disconnect] error:", err);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
