import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const TW = {
  sid: process.env.TWILIO_ACCOUNT_SID!,
  token: process.env.TWILIO_AUTH_TOKEN!,
  from: process.env.TWILIO_WHATSAPP_FROM!,
};

// (опционально) проверка подписи Twilio
function verifyTwilioSignature(req: NextRequest, body: URLSearchParams) {
  const url = req.nextUrl.origin + req.nextUrl.pathname; // полный путь вебхука без query
  const signature = req.headers.get('x-twilio-signature') || '';
  const data: Record<string, string> = {};
  Array.from(body.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .forEach(([k, v]) => (data[k] = v));

  const payload = Object.values(data).reduce((acc, v) => (acc += v), url);
  const expected = crypto.createHmac('sha1', TW.token).update(payload).digest('base64');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const params = new URLSearchParams();
    for (const [k, v] of form.entries()) params.append(k, String(v));

    // (опционально) в sandbox часто не проверяют подпись, можно отключить если мешает:
    // if (!verifyTwilioSignature(req, params)) {
    //   return NextResponse.json({ ok: false, error: 'Invalid Twilio signature' }, { status: 403 });
    // }

    const from = params.get('From') || '';
    const to = params.get('To') || '';
    const body = (params.get('Body') || '').trim();

    console.log('WA INCOMING:', { from, to, body });

    // Твоя логика: распарсить заказ/команду и т.д.
    // Ответ пользователю:
    await sendWhatsApp(from, `Приняли сообщение: "${body}"`);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('WA webhook error:', e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}

// исходящее сообщение через Twilio Messages API
async function sendWhatsApp(to: string, text: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TW.sid}/Messages.json`;
  const form = new URLSearchParams();
  form.set('From', TW.from);
  form.set('To', to);
  form.set('Body', text);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${TW.sid}:${TW.token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('Twilio send error:', err);
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'whatsapp-webhook' });
}