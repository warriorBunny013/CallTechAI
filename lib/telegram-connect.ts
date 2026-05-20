import crypto from "crypto";
import { getSupabaseService } from "@/lib/supabase/service";

export const TELEGRAM_BOT_USERNAME = "CallTechAIbot";

export function generateTelegramConnectToken(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function buildTelegramConnectUrl(token: string): string {
  return `https://t.me/${TELEGRAM_BOT_USERNAME}?start=connect_${token}`;
}

export function parseConnectTokenFromStart(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/start")) return null;
  const payload = trimmed.split(/\s+/)[1];
  if (!payload?.startsWith("connect_")) return null;
  const token = payload.slice("connect_".length).trim();
  return token.length > 0 ? token : null;
}

/** Ensure the org has a connect token; create config row if needed. */
export async function ensureTelegramConnectToken(
  organisationId: string
): Promise<{ token: string; connectUrl: string }> {
  const supabase = getSupabaseService();

  const { data: existing } = await supabase
    .from("organisation_alert_configs")
    .select("telegram_connect_token")
    .eq("organisation_id", organisationId)
    .maybeSingle();

  let token = (existing as { telegram_connect_token?: string } | null)?.telegram_connect_token;

  if (!token) {
    token = generateTelegramConnectToken();
    const { error } = await supabase.from("organisation_alert_configs").upsert(
      {
        organisation_id: organisationId,
        telegram_connect_token: token,
        telegram_enabled: false,
        telegram_bot_token: null,
        whatsapp_enabled: false,
        alert_on_new_call: true,
        alert_on_new_booking: true,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "organisation_id" }
    );
    if (error) throw error;
  }

  return { token, connectUrl: buildTelegramConnectUrl(token) };
}

/** Link a Telegram chat to an org via connect token (called from bot webhook). */
export async function linkTelegramChatByToken(
  token: string,
  chatId: number,
  firstName?: string
): Promise<{ ok: boolean; organisationId?: string; error?: string }> {
  const supabase = getSupabaseService();

  const { data: config } = await supabase
    .from("organisation_alert_configs")
    .select("organisation_id")
    .eq("telegram_connect_token", token)
    .maybeSingle();

  if (!config) {
    return { ok: false, error: "Invalid or expired connect link. Open CallTechAI and click Connect again." };
  }

  const organisationId = (config as { organisation_id: string }).organisation_id;

  const { error } = await supabase.from("organisation_alert_configs").upsert(
    {
      organisation_id: organisationId,
      telegram_connect_token: token,
      telegram_chat_id: String(chatId),
      telegram_enabled: true,
      telegram_bot_token: null,
      whatsapp_enabled: false,
      alert_on_new_call: true,
      alert_on_new_booking: true,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "organisation_id" }
  );

  if (error) {
    console.error("[telegram-connect] link error:", error);
    return { ok: false, error: "Could not save your Telegram connection. Please try again." };
  }

  console.log(
    `[telegram-connect] Linked chat ${chatId} (${firstName ?? "user"}) → org ${organisationId}`
  );

  return { ok: true, organisationId };
}

export function maskChatId(chatId: string): string {
  if (chatId.length <= 4) return chatId;
  return `${"*".repeat(Math.max(0, chatId.length - 4))}${chatId.slice(-4)}`;
}
