import { NextRequest, NextResponse } from 'next/server';

type TgUser = { id: number; username?: string; first_name?: string; last_name?: string };
type TgMsg = { message_id: number; chat: { id: number; type: string }; text?: string; from?: TgUser };
type TgUpdate = { update_id: number; message?: TgMsg; edited_message?: TgMsg; callback_query?: any };

const TG = {
  token: process.env.TELEGRAM_BOT_TOKEN!,
  apiBase: (token: string) => `https://api.telegram.org/bot${token}`,
};

async function tgSendMessage(chatId: number | string, text: string) {
  const url = `${TG.apiBase(TG.token)}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('TG sendMessage error:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const update = (await req.json()) as TgUpdate;
    const msg = update.message || update.edited_message;
    if (!msg) return NextResponse.json({ ok: true });

    const text = (msg.text || '').trim();
    const from = msg.from?.username || msg.from?.first_name || 'user';

    // ↓ тут твоя логика: распарсить заказ/команду и т.д.
    // Для теста: просто эхо-ответ
    if (text) {
      await tgSendMessage(msg.chat.id, `Принято, ${from}! Вы написали: "${text}"`);
      // тут же можно пушнуть событие ассистенту / сохранить в БД
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('TG webhook error:', e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}

// GET — healthcheck
export async function GET() {
  return NextResponse.json({ ok: true, service: 'telegram-webhook' });
}