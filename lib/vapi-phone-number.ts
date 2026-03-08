/**
 * Helpers for syncing VAPI phone numbers with CallTechAI assistant selection.
 * When you add a number in CallTechAI or change the assistant, we update VAPI
 * so the dashboard shows the correct assistant for inbound calls.
 */

const VAPI_BASE = "https://api.vapi.ai";

const WEBHOOK_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://calltechai.com";
const WEBHOOK_URL = `${WEBHOOK_BASE_URL.replace(/\/$/, "")}/api/webhooks/vapi`;

/**
 * Set the server URL (webhook) on a VAPI phone number.
 * Ensures call completion webhooks are sent to CallTechAI.
 */
export async function setVapiPhoneNumberServerUrl(
  vapiPhoneNumberId: string,
  apiKey?: string
): Promise<boolean> {
  const key = apiKey ?? process.env.VAPI_API_KEY;
  if (!key || key === "your_vapi_api_key_here") return false;

  try {
    const res = await fetch(
      `${VAPI_BASE}/phone-number/${encodeURIComponent(vapiPhoneNumberId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          server: { url: WEBHOOK_URL, timeoutSeconds: 20 },
        }),
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      console.error("[vapi-phone-number] Server URL PATCH error:", res.status, errText);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[vapi-phone-number] Server URL error:", err);
    return false;
  }
}

/**
 * Set the assistant on a VAPI phone number (for inbound calls).
 * Used when adding a number in CallTechAI or when the org's assistant changes.
 */
export async function setVapiPhoneNumberAssistant(
  vapiPhoneNumberId: string,
  assistantId: string | null,
  apiKey?: string
): Promise<boolean> {
  const key = apiKey ?? process.env.VAPI_API_KEY;
  if (!key || key === "your_vapi_api_key_here") {
    return false;
  }

  try {
    const body: { assistantId?: string | null } = assistantId
      ? { assistantId }
      : { assistantId: null };
    const res = await fetch(
      `${VAPI_BASE}/phone-number/${encodeURIComponent(vapiPhoneNumberId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      console.error("[vapi-phone-number] PATCH error:", res.status, errText);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[vapi-phone-number] Error:", err);
    return false;
  }
}
