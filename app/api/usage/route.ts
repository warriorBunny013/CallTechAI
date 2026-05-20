/**
 * Subscription usage — billable minutes from ElevenLabs + Supabase merged call data.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/org";
import { getSupabaseService } from "@/lib/supabase/service";
import { fetchOrgCalls, filterBillableCalls } from "@/lib/org-call-data";

export async function GET(_request: NextRequest) {
  try {
    const userAndOrg = await getCurrentUserAndOrg();
    if (!userAndOrg) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = userAndOrg.organisationId;
    const supabase = getSupabaseService();

    const { data: profile } = await supabase
      .from("profiles")
      .select("trial_ends_at")
      .eq("id", userAndOrg.userId)
      .maybeSingle();

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("status, current_period_start, current_period_end, plan_type")
      .eq("organisation_id", orgId)
      .maybeSingle();

    const now = new Date();
    const trialEndsAt = (profile as { trial_ends_at?: string } | null)?.trial_ends_at ?? null;
    const hasActiveSubscription =
      !!subscription &&
      (subscription.status === "active" || subscription.status === "trialing") &&
      subscription.current_period_end &&
      new Date(subscription.current_period_end as string) > now;
    const isTrial = !hasActiveSubscription && !!trialEndsAt && new Date(trialEndsAt) > now;

    let periodStart: Date | undefined;
    if (!isTrial && subscription?.current_period_start) {
      periodStart = new Date(subscription.current_period_start as string);
    }

    const allCalls = await fetchOrgCalls(orgId, {
      limit: 1000,
      startDate: periodStart,
    });

    const billableCalls = filterBillableCalls(allCalls);
    const minutesUsed =
      Math.round(
        (billableCalls.reduce((sum, c) => sum + c.durationSeconds, 0) / 60) * 100
      ) / 100;

    const totalCalls = billableCalls.length;
    const totalSeconds = billableCalls.reduce((sum, c) => sum + c.durationSeconds, 0);

    return NextResponse.json({
      minutesUsed,
      totalCalls,
      totalSeconds,
      isTrial: !!isTrial,
      periodStart: periodStart?.toISOString() ?? null,
      periodEnd: subscription?.current_period_end ?? null,
    });
  } catch (err) {
    console.error("[usage] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
