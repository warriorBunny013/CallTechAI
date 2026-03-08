/**
 * In-memory TTL cache for Vapi API responses.
 * Survives across requests within the same process lifetime.
 * Keyed by phone number ID or assistant ID to avoid stale cross-org data.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

export const VAPI_CALLS_TTL_MS = 5 * 60 * 1000;     // 5 minutes
export const VAPI_ASSISTANT_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCached<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/** Remove all cache entries whose key starts with the given prefix. */
export function invalidateCacheByPrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

/** Invalidate cached calls for a specific Vapi phone number ID. */
export function invalidateVapiCallsCache(vapiPhoneNumberId: string): void {
  invalidateCacheByPrefix(`vapi:calls:${vapiPhoneNumberId}`);
}

/** Invalidate cached assistant config for a specific assistant ID. */
export function invalidateVapiAssistantCache(assistantId: string): void {
  cache.delete(`vapi:assistant:${assistantId}`);
}
