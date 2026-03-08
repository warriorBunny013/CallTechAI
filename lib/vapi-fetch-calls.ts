/**
 * Fetch calls from VAPI API for a given phone number ID.
 * Used to get recordings from VAPI for numbers added in CallTechAI dashboard.
 * Results are cached in-memory (5 min TTL) to reduce Vapi API calls.
 */

import { getCached, setCached, VAPI_CALLS_TTL_MS } from "./vapi-cache";

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

  const cacheKey = `vapi:calls:${phoneNumberId}:${limit}`;
  const cached = getCached<VapiCall[]>(cacheKey);
  if (cached) {
    return cached;
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

    const raw = await res.json();
    let calls: VapiCall[] = [];
    if (Array.isArray(raw)) calls = raw;
    else if (raw?.calls && Array.isArray(raw.calls)) calls = raw.calls;
    else if (raw?.data && Array.isArray(raw.data)) calls = raw.data;

    setCached(cacheKey, calls, VAPI_CALLS_TTL_MS);
    return calls;
  } catch (err) {
    console.error("[vapi-fetch-calls] Error:", err);
    return [];
  }
}
