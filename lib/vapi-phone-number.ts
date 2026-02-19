/**
 * Helpers for syncing VAPI phone numbers with CallTechAI assistant selection.
 * When you add a number in CallTechAI or change the assistant, we update VAPI
 * so the dashboard shows the correct assistant for inbound calls.
 */

const VAPI_BASE = "https://api.vapi.ai";

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
