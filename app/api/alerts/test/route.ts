/**
 * POST /api/alerts/test
 * Sends a test alert via the configured channels to verify the setup works.
 * Body: { channel: "telegram" | "whatsapp" }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndOrg } from "@/lib/org";
import { sendTelegramAlert, sendWhatsAppAlert } from "@/lib/alerts";

export async function POST(req: NextRequest) {
  const userAndOrg = await getCurrentUserAndOrg();
  if (!userAndOrg) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const channel = body.channel as "telegram" | "whatsapp" | undefined;

  const supabase = await createClient();
  const { data: config } = await supabase
    .from("organisation_alert_configs")
    .select("*")
    .eq("organisation_id", userAndOrg.organisationId)
    .maybeSingle();

  if (!config) {
    return NextResponse.json({ error: "No alert config saved yet. Save your settings first." }, { status: 400 });
  }

  const testMessage =
    `🔔 <b>Test Alert — CallTechAI</b>\n\n` +
    `✅ Your alert integration is working correctly!\n` +
    `You will receive notifications here for new calls and bookings.`;

  if (channel === "telegram") {
    if (!config.telegram_chat_id) {
      return NextResponse.json({ error: "Telegram Chat ID is missing. Enter your Chat ID first." }, { status: 400 });
    }
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return NextResponse.json({ error: "Telegram bot is not configured on the server." }, { status: 500 });
    }
    const result = await sendTelegramAlert(null, config.telegram_chat_id, testMessage);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, message: "Test Telegram message sent via @CallTechAIbot!" });
  }

  if (channel === "whatsapp") {
    if (!config.whatsapp_to_number || !config.whatsapp_from_number) {
      return NextResponse.json({ error: "WhatsApp numbers are not configured." }, { status: 400 });
    }
    // WhatsApp plain text (no HTML)
    const plainText =
      `🔔 Test Alert — CallTechAI\n\n` +
      `✅ Your WhatsApp alert integration is working correctly!\n` +
      `You will receive notifications here for new calls and bookings.`;
    const result = await sendWhatsAppAlert(config.whatsapp_from_number, config.whatsapp_to_number, plainText);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, message: "Test WhatsApp message sent!" });
  }

  return NextResponse.json({ error: "Specify channel: telegram or whatsapp" }, { status: 400 });
}
