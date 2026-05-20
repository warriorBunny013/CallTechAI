/**
 * POST /api/webhooks/telegram
 *
 * Telegram webhook for @CallTechAIbot.
 * - Deep link connect: /start connect_<token> → links chat to org automatically
 * - Fallback: /start or /id → returns Chat ID for manual setup
 */

import { NextRequest, NextResponse } from "next/server";
import {
  linkTelegramChatByToken,
  parseConnectTokenFromStart,
  TELEGRAM_BOT_USERNAME,
} from "@/lib/telegram-connect";

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

    if (!message?.text || !message.chat) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const firstName = message.from?.first_name ?? "there";

    const connectToken = parseConnectTokenFromStart(text);
    if (connectToken) {
      const result = await linkTelegramChatByToken(connectToken, chatId, firstName);

      if (result.ok) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.calltechai.com";
        await sendMessage(
          chatId,
          `✅ <b>Connected to CallTechAI!</b>\n\n` +
            `Hi <b>${firstName}</b>, you'll receive alerts here for:\n` +
            `• Completed calls (caller, duration, AI summary)\n` +
            `• New appointments booked by your AI assistant\n\n` +
            `Return to your dashboard — the page will update automatically.\n` +
            `<a href="${appUrl}/dashboard/alerts">Open Alerts Settings</a>`
        );
      } else {
        await sendMessage(
          chatId,
          `❌ <b>Connection failed</b>\n\n${result.error}\n\n` +
            `Go to CallTechAI → Alerts and click <b>Connect Telegram</b> to get a fresh link.`
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (text === "/start" || text.startsWith("/start ")) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.calltechai.com";
      await sendMessage(
        chatId,
        `👋 Hi <b>${firstName}</b>!\n\n` +
          `To connect alerts the easy way, open CallTechAI and click <b>Connect Telegram</b> — we'll link your account automatically.\n\n` +
          `<a href="${appUrl}/dashboard/alerts">Open CallTechAI Alerts</a>\n\n` +
          `Or paste this Chat ID manually:\n<code>${chatId}</code>`
      );
    } else if (text === "/id" || text === "/chatid") {
      await sendMessage(chatId, `Your <b>Chat ID</b> is:\n<code>${chatId}</code>`);
    } else if (text === "/help") {
      await sendMessage(
        chatId,
        `ℹ️ <b>${TELEGRAM_BOT_USERNAME}</b> sends CallTechAI alerts.\n\n` +
          `• Connect via dashboard: click <b>Connect Telegram</b>\n` +
          `• Or send /id to see your Chat ID\n` +
          `• Send /help anytime for this message`
      );
    } else {
      await sendMessage(
        chatId,
        `Use <b>Connect Telegram</b> in your CallTechAI dashboard for one-click setup.\n\n` +
          `Send /help for options · /id for your Chat ID`
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telegram-webhook] error:", err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
