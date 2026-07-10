import { NextRequest, NextResponse } from 'next/server';

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TG_DEFAULT_CHAT = process.env.TELEGRAM_DEFAULT_CHAT_ID;
const TW_SID = process.env.TWILIO_ACCOUNT_SID!;
const TW_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const TW_FROM = process.env.TWILIO_WHATSAPP_FROM!;
const WA_TEST_TO = process.env.WHATSAPP_TEST_TO; // можно передать dynamic "to" в body

async function sendTelegram(chatId: string | number, text: string) {
  const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function sendWhatsApp(to: string, text: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TW_SID}/Messages.json`;
  const form = new URLSearchParams();
  form.set('From', TW_FROM);
  form.set('To', to);
  form.set('Body', text);
  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${TW_SID}:${TW_TOKEN}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { text, telegramChatId, whatsappTo, channels } = await req.json();
    if (!text) return NextResponse.json({ ok: false, error: 'text is required' }, { status: 400 });

    const useTg = !channels || channels.includes('telegram');
    const useWa = !channels || channels.includes('whatsapp');

    const tasks: Promise<any>[] = [];
    if (useTg) {
      const chat = telegramChatId || TG_DEFAULT_CHAT;
      if (!chat) throw new Error('telegramChatId or TELEGRAM_DEFAULT_CHAT_ID is required');
      tasks.push(sendTelegram(chat, text));
    }
    if (useWa) {
      const to = whatsappTo || WA_TEST_TO;
      if (!to) throw new Error('whatsappTo or WHATSAPP_TEST_TO is required');
      tasks.push(sendWhatsApp(to, text));
    }

    await Promise.all(tasks);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('Notify error:', e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'notify' });
}