'use client';
import { useState } from 'react';

export default function MessagingPage() {
  const [text, setText] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [whatsappTo, setWhatsappTo] = useState('');
  const [status, setStatus] = useState<string|null>(null);

  async function send() {
    setStatus('Sending...');
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          text,
          telegramChatId: telegramChatId || undefined,
          whatsappTo: whatsappTo || undefined,
          channels: ['telegram','whatsapp']
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unknown error');
      setStatus('✅ Sent successfully');
    } catch (e:any) {
      setStatus('❌ Error: ' + e.message);
    }
  }

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Messaging Tester</h1>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col">
          <span className="text-sm text-gray-600">Message text</span>
          <textarea
            className="border p-2 rounded"
            rows={3}
            value={text}
            onChange={e=>setText(e.target.value)}
          />
        </label>

        <label className="flex flex-col">
          <span className="text-sm text-gray-600">Telegram Chat ID (optional)</span>
          <input
            className="border p-2 rounded"
            type="text"
            value={telegramChatId}
            onChange={e=>setTelegramChatId(e.target.value)}
            placeholder="e.g. 123456789"
          />
        </label>

        <label className="flex flex-col">
          <span className="text-sm text-gray-600">WhatsApp To (optional)</span>
          <input
            className="border p-2 rounded"
            type="text"
            value={whatsappTo}
            onChange={e=>setWhatsappTo(e.target.value)}
            placeholder="e.g. whatsapp:+1XXXXXXXXXX"
          />
        </label>

        <button
          onClick={send}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Send
        </button>

        {status && <div className="mt-2">{status}</div>}
      </div>
    </main>
  );
}