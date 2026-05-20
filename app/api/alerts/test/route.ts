/**
 * POST /api/alerts/test
 * Sends a test Telegram alert to verify the setup works.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndOrg } from "@/lib/org";
import { sendTelegramAlert } from "@/lib/alerts";

export async function POST(req: NextRequest) {
  const userAndOrg = await getCurrentUserAndOrg();
  if (!userAndOrg) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const overrideChatId =
    typeof body.chat_id === "string" ? body.chat_id.trim() : null;

  const supabase = await createClient();
  const { data: config } = await supabase
    .from("organisation_alert_configs")
    .select("telegram_enabled, telegram_chat_id")
    .eq("organisation_id", userAndOrg.organisationId)
    .maybeSingle();

  const chatId = overrideChatId || config?.telegram_chat_id?.trim() || null;

  if (!chatId) {
    return NextResponse.json(
      { error: "Enter your Telegram Chat ID first, or connect via the one-click flow." },
      { status: 400 }
    );
  }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: "Telegram bot is not configured on the server." }, { status: 500 });
  }

  const testMessage =
    `🔔 <b>Test Alert — CallTechAI</b>\n\n` +
    `✅ Your Telegram alerts are working!\n` +
    `You'll receive notifications here when your AI assistant books an appointment.`;

  const result = await sendTelegramAlert(null, chatId, testMessage);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ ok: true, message: "Test message sent via @CallTechAIbot!" });
}
