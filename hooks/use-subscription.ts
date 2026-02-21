import { useState, useEffect, useCallback } from "react";

const SUBSCRIPTION_CACHE_KEY = "calltech_subscription_cache";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes – avoid refetch on every nav/code change

interface Subscription {
  status: string;
  plan_type: string;
  billing_cycle: string;
  current_period_end: string | null;
  current_period_start: string | null;
}

interface CachedSubscription {
  canAccess: boolean;
  hasActiveSubscription: boolean;
  trialEnded: boolean;
  subscriptionExpired: boolean;
  trialEndsAt: string | null;
  subscription: Subscription | null;
  fetchedAt: number;
}

interface UseSubscriptionReturn {
  hasActiveSubscription: boolean;
  canAccess: boolean;
  trialEnded: boolean;
  subscriptionExpired: boolean;
  trialEndsAt: string | null;
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function getCached(): CachedSubscription | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SUBSCRIPTION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSubscription;
    if (parsed.fetchedAt && Date.now() - parsed.fetchedAt < CACHE_TTL_MS) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function setCached(data: Omit<CachedSubscription, "fetchedAt">) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      SUBSCRIPTION_CACHE_KEY,
      JSON.stringify({ ...data, fetchedAt: Date.now() })
    );
  } catch {
    // ignore
  }
}

export function useSubscription(): UseSubscriptionReturn {
  const cached = typeof window !== "undefined" ? getCached() : null;
  const [hasActiveSubscription, setHasActiveSubscription] = useState(
    cached?.hasActiveSubscription ?? false
  );
  const [canAccess, setCanAccess] = useState(cached?.canAccess ?? false);
  const [trialEnded, setTrialEnded] = useState(cached?.trialEnded ?? false);
  const [subscriptionExpired, setSubscriptionExpired] = useState(
    cached?.subscriptionExpired ?? false
  );
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(
    cached?.trialEndsAt ?? null
  );
  const [subscription, setSubscription] = useState<Subscription | null>(
    cached?.subscription ?? null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptionStatus = useCallback(async (options?: { background?: boolean }) => {
    const background = options?.background ?? false;
    try {
      if (!background) setLoading(true);
      setError(null);

      const response = await fetch("/api/subscription-status");
      const data = await response.json();

      if (response.status === 401) {
        setHasActiveSubscription(false);
        setCanAccess(false);
        setTrialEnded(false);
        setSubscriptionExpired(false);
        setTrialEndsAt(null);
        setSubscription(null);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch subscription status");
      }

      const hasAccess = data.canAccess ?? false;
      const hasSub = data.hasActiveSubscription ?? false;
      const trialEnd = data.trialEnded ?? false;
      const subExpired = data.subscriptionExpired ?? false;
      const trial = data.trialEndsAt ?? null;
      const sub = data.subscription ?? null;

      setHasActiveSubscription(hasSub);
      setCanAccess(hasAccess);
      setTrialEnded(trialEnd);
      setSubscriptionExpired(subExpired);
      setTrialEndsAt(trial);
      setSubscription(sub);

      setCached({
        canAccess: hasAccess,
        hasActiveSubscription: hasSub,
        trialEnded: trialEnd,
        subscriptionExpired: subExpired,
        trialEndsAt: trial,
        subscription: sub,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      // On error, keep previous cached state so we don't flash paywall
      const prev = getCached();
      if (prev) {
        setCanAccess(prev.canAccess);
        setHasActiveSubscription(prev.hasActiveSubscription);
        setTrialEnded(prev.trialEnded ?? false);
        setSubscriptionExpired(prev.subscriptionExpired ?? false);
        setTrialEndsAt(prev.trialEndsAt);
        setSubscription(prev.subscription);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cachedNow = getCached();
    if (cachedNow && (cachedNow.fetchedAt ?? 0) > 0 && Date.now() - cachedNow.fetchedAt < CACHE_TTL_MS) {
      setCanAccess(cachedNow.canAccess);
      setHasActiveSubscription(cachedNow.hasActiveSubscription ?? false);
      setTrialEnded(cachedNow.trialEnded ?? false);
      setSubscriptionExpired(cachedNow.subscriptionExpired ?? false);
      setTrialEndsAt(cachedNow.trialEndsAt ?? null);
      setSubscription(cachedNow.subscription ?? null);
      setLoading(false);
      fetchSubscriptionStatus({ background: true });
      return;
    }
    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  return {
    hasActiveSubscription,
    canAccess,
    trialEnded,
    subscriptionExpired,
    trialEndsAt,
    subscription,
    loading,
    error,
    refetch: fetchSubscriptionStatus,
  };
}
