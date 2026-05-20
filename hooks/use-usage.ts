import { useState, useEffect, useCallback } from "react";

export interface UsageData {
  minutesUsed: number;
  totalCalls: number;
  totalSeconds: number;
  isTrial: boolean;
  periodStart: string | null;
  periodEnd: string | null;
}

export function useUsage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/usage");
      if (!res.ok) throw new Error(`Failed to fetch usage: ${res.status}`);
      const json = (await res.json()) as UsageData;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return { data, loading, error, refetch: fetchUsage };
}
