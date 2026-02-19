/**
 * Fetch calls from VAPI API for a given phone number ID.
 * Used to get recordings from VAPI for numbers added in CallTechAI dashboard.
 */

const VAPI_BASE = "https://api.vapi.ai";

export interface VapiCall {
  id: string;
  status?: string;
  recordingUrl?: string;
  recording?: string; // VAPI sometimes uses this for recording URL
  transcript?: string;
  summary?: string;
  analysis?: unknown;
  metadata?: Record<string, unknown>;
  startedAt?: string;
  endedAt?: string;
  createdAt?: string;
  type?: string;
  phoneNumberId?: string;
  customer?: { number?: string };
  [key: string]: unknown;
}

/**
 * Fetch calls from VAPI for a phone number. Returns calls with recordings.
 */
export async function fetchVapiCallsForPhoneNumber(
  phoneNumberId: string,
  limit = 100,
  apiKey?: string
): Promise<VapiCall[]> {
  const key = apiKey ?? process.env.VAPI_API_KEY;
  if (!key || key === "your_vapi_api_key_here") {
    return [];
  }

  try {
    const params = new URLSearchParams({
      phoneNumberId,
      limit: String(limit),
    });
    const res = await fetch(`${VAPI_BASE}/call?${params}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn("[vapi-fetch-calls] GET calls failed:", res.status, await res.text());
      return [];
    }

    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (data?.calls && Array.isArray(data.calls)) return data.calls;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
  } catch (err) {
    console.error("[vapi-fetch-calls] Error:", err);
    return [];
  }
}
