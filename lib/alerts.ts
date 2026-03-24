/**
 * Alert / notification helpers for Telegram and WhatsApp (Twilio).
 * Used after new calls and new bookings to notify the organisation admin.
 */

export interface AlertConfig {
  telegram_enabled: boolean;
  /** @deprecated Bot token is now managed centrally via TELEGRAM_BOT_TOKEN env var */
  telegram_bot_token?: string | null;
  telegram_chat_id: string | null;
  whatsapp_enabled: boolean;
  whatsapp_to_number: string | null;
  whatsapp_from_number: string | null;
  alert_on_new_call: boolean;
  alert_on_new_booking: boolean;
}

export type AlertEvent = "new_call" | "new_booking";

// ── Telegram ─────────────────────────────────────────────────────────────────

/**
 * Send a Telegram message via the central @CallTechAIbot.
 * The bot token is read from TELEGRAM_BOT_TOKEN env var.
 * Users only need to provide their personal Chat ID.
 */
export async function sendTelegramAlert(
  _ignoredBotToken: string | null | undefined,
  chatId: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return { ok: false, error: "Telegram bot not configured on server (TELEGRAM_BOT_TOKEN missing)" };
  }
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
        }),
      }
    );
    const data = (await res.json()) as { ok: boolean; description?: string };
    if (!data.ok) return { ok: false, error: data.description ?? "Unknown Telegram error" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Telegram request failed" };
  }
}

// ── WhatsApp via Twilio ───────────────────────────────────────────────────────

export async function sendWhatsAppAlert(
  fromNumber: string,
  toNumber: string,
  body: string
): Promise<{ ok: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return { ok: false, error: "Twilio credentials not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN)" };
  }

  const from = fromNumber.startsWith("whatsapp:") ? fromNumber : `whatsapp:${fromNumber}`;
  const to = toNumber.startsWith("whatsapp:") ? toNumber : `whatsapp:${toNumber}`;

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        },
        body: new URLSearchParams({ From: from, To: to, Body: body }).toString(),
      }
    );
    const data = (await res.json()) as { sid?: string; message?: string; code?: number };
    if (!data.sid) return { ok: false, error: data.message ?? "WhatsApp send failed" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "WhatsApp request failed" };
  }
}

// ── Dispatch ─────────────────────────────────────────────────────────────────

export async function dispatchAlerts(
  config: AlertConfig,
  event: AlertEvent,
  message: string
): Promise<void> {
  if (event === "new_call" && !config.alert_on_new_call) return;
  if (event === "new_booking" && !config.alert_on_new_booking) return;

  const results: Promise<{ ok: boolean; error?: string }>[] = [];

  if (config.telegram_enabled && config.telegram_chat_id) {
    results.push(sendTelegramAlert(null, config.telegram_chat_id, message));
  }

  if (
    config.whatsapp_enabled &&
    config.whatsapp_to_number &&
    config.whatsapp_from_number
  ) {
    results.push(
      sendWhatsAppAlert(config.whatsapp_from_number, config.whatsapp_to_number, message)
    );
  }

  if (results.length === 0) return;

  const settled = await Promise.allSettled(results);
  settled.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`[alerts] dispatch[${i}] rejected:`, r.reason);
    } else if (!r.value.ok) {
      console.error(`[alerts] dispatch[${i}] failed:`, r.value.error);
    }
  });
}

// ── Message builders ──────────────────────────────────────────────────────────

export function buildBookingAlertMessage(opts: {
  orgName: string;
  customerName: string;
  customerEmail: string;
  purpose: string;
  date: string;
  time: string;
  customerPhone?: string;
  summary?: string;
}): string {
  const lines = [
    `📅 <b>New Booking — ${opts.orgName}</b>`,
    "",
    `👤 <b>Customer:</b> ${opts.customerName}`,
    `📧 <b>Email:</b> ${opts.customerEmail}`,
  ];

  if (opts.customerPhone) {
    lines.push(`📱 <b>Phone:</b> ${opts.customerPhone}`);
  }

  lines.push(
    `📋 <b>Purpose:</b> ${opts.purpose}`,
    `🗓 <b>Date:</b> ${opts.date}`,
    `🕐 <b>Time:</b> ${opts.time}`
  );

  if (opts.summary) {
    lines.push("", `📝 <b>AI Summary:</b> ${opts.summary.trim()}`);
  }

  lines.push("", `Booked via your AI assistant`);

  return lines.join("\n");
}
