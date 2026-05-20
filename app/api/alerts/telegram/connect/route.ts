/**
 * GET /api/alerts/telegram/connect
 * Returns connect URL + current Telegram link status for the org.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndOrg } from "@/lib/org";
import {
  ensureTelegramConnectToken,
  maskChatId,
  TELEGRAM_BOT_USERNAME,
} from "@/lib/telegram-connect";

export async function GET() {
  const userAndOrg = await getCurrentUserAndOrg();
  if (!userAndOrg) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { connectUrl } = await ensureTelegramConnectToken(userAndOrg.organisationId);

    const supabase = await createClient();
    const { data: config } = await supabase
      .from("organisation_alert_configs")
      .select("telegram_enabled, telegram_chat_id, alert_on_new_call, alert_on_new_booking")
      .eq("organisation_id", userAndOrg.organisationId)
      .maybeSingle();

    const row = config as {
      telegram_enabled?: boolean;
      telegram_chat_id?: string | null;
      alert_on_new_call?: boolean;
      alert_on_new_booking?: boolean;
    } | null;

    const connected =
      row?.telegram_enabled === true && !!row?.telegram_chat_id?.trim();

    return NextResponse.json({
      botUsername: TELEGRAM_BOT_USERNAME,
      connectUrl,
      connected,
      chatIdMasked: row?.telegram_chat_id ? maskChatId(row.telegram_chat_id) : null,
      alertOnNewBooking: row?.alert_on_new_booking ?? true,
      alertOnNewCall: row?.alert_on_new_call ?? true,
    });
  } catch (err) {
    console.error("[alerts/telegram/connect] error:", err);
    return NextResponse.json({ error: "Failed to prepare Telegram connect" }, { status: 500 });
  }
}
