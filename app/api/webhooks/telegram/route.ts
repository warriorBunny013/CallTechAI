/**
 * POST /api/webhooks/telegram
 *
 * Telegram webhook for @CallTechAIbot.
 * When users send /start, the bot replies with their Chat ID.
 * Register this endpoint as the bot webhook:
 *   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/webhooks/telegram
 */

import { NextRequest, NextResponse } from "next/server";

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; first_name?: string; username?: string };
    chat: { id: number; type: string };
    text?: string;
  };
}

async function sendMessage(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const update = (await req.json()) as TelegramUpdate;
    const message = update.message;

    if (message?.text && message.chat) {
      const chatId = message.chat.id;
      const text = message.text.trim();
      const firstName = message.from?.first_name ?? "there";

      if (text === "/start" || text.startsWith("/start ")) {
        await sendMessage(
          chatId,
          `👋 Hi <b>${firstName}</b>! Welcome to <b>CallTechAI</b> alerts.\n\n` +
          `Your <b>Chat ID</b> is:\n<code>${chatId}</code>\n\n` +
          `Copy this number and paste it into the <b>Alerts</b> section of your CallTechAI dashboard to start receiving notifications.`
        );
      } else if (text === "/id" || text === "/chatid") {
        await sendMessage(
          chatId,
          `Your <b>Chat ID</b> is: <code>${chatId}</code>`
        );
      } else {
        await sendMessage(
          chatId,
          `ℹ️ Send /start to get your Chat ID, then paste it into your CallTechAI dashboard.`
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telegram-webhook] error:", err);
    return NextResponse.json({ ok: false }, { status: 200 }); // Always 200 to Telegram
  }
}
