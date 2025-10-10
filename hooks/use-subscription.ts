import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

interface Subscription {
  status: string;
  plan_type: string;
  billing_cycle: string;
  current_period_end: string | null;
  current_period_start: string | null;
}

interface UseSubscriptionReturn {
  hasActiveSubscription: boolean;
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const { isLoaded, isSignedIn } = useUser();
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptionStatus = async () => {
    if (!isLoaded || !isSignedIn) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/subscription-status");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch subscription status");
      }

      setHasActiveSubscription(data.hasActiveSubscription);
      setSubscription(data.subscription);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionStatus();
  }, [isLoaded, isSignedIn]);

  return {
    hasActiveSubscription,
    subscription,
    loading,
    error,
    refetch: fetchSubscriptionStatus,
  };
}
