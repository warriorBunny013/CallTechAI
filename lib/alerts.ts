/**
 * Alert / notification helpers for Telegram.
 * Used after new calls and new bookings to notify the organisation admin.
 */

export interface AlertConfig {
  telegram_enabled: boolean;
  telegram_bot_token?: string | null;
  telegram_chat_id: string | null;
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

// ── Dispatch ─────────────────────────────────────────────────────────────────

export async function dispatchAlerts(
  config: AlertConfig,
  event: AlertEvent,
  message: string
): Promise<void> {
  if (event === "new_call" && !config.alert_on_new_call) return;
  if (event === "new_booking" && !config.alert_on_new_booking) return;

  if (!config.telegram_enabled || !config.telegram_chat_id) return;

  const result = await sendTelegramAlert(null, config.telegram_chat_id, message);
  if (!result.ok) {
    console.error("[alerts] Telegram dispatch failed:", result.error);
  }
}

// ── Message builders ──────────────────────────────────────────────────────────

export function buildCallAlertMessage(opts: {
  orgName: string;
  callerPhone?: string | null;
  assistantPhone?: string | null;
  durationSeconds?: number;
  summary?: string | null;
  conversationId?: string;
}): string {
  const mins = opts.durationSeconds ? Math.floor(opts.durationSeconds / 60) : 0;
  const secs = opts.durationSeconds ? opts.durationSeconds % 60 : 0;
  const duration =
    opts.durationSeconds && opts.durationSeconds > 0
      ? mins > 0
        ? `${mins}m ${String(secs).padStart(2, "0")}s`
        : `${secs}s`
      : "Unknown";

  const lines = [
    `📞 <b>New Call — ${escapeTelegramHtml(opts.orgName)}</b>`,
    "",
    `👤 <b>Caller:</b> ${escapeTelegramHtml(opts.callerPhone || "Unknown")}`,
  ];

  if (opts.assistantPhone) {
    lines.push(`📱 <b>Your number:</b> ${escapeTelegramHtml(opts.assistantPhone)}`);
  }

  lines.push(`⏱ <b>Duration:</b> ${duration}`, `✅ <b>Status:</b> Completed`);

  if (opts.summary?.trim()) {
    const trimmed = opts.summary.trim().slice(0, 500);
    lines.push("", `📝 <b>AI Summary:</b> ${escapeTelegramHtml(trimmed)}`);
  }

  lines.push("", `Handled by your AI assistant`);

  return lines.join("\n");
}

function escapeTelegramHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

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
