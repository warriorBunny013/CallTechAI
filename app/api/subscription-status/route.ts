import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getOrganisationIdForUser } from "@/lib/org";

const TRIAL_DAYS = 7;

/**
 * Access logic (exactly as specified):
 * - New user → 7-day free trial → immediate dashboard access.
 * - Paid user (monthly/yearly) → dashboard access until subscription expires.
 * - Only after trial AND subscription have ended → show payment popup and block access.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAuth = await createClient();

    const organisationId = await getOrganisationIdForUser(user.id);

    const [profileRes, subscriptionRes] = await Promise.all([
      supabaseAuth
        .from("profiles")
        .select("trial_ends_at")
        .eq("id", user.id)
        .single(),
      organisationId
        ? supabaseAuth
            .from("subscriptions")
            .select("*")
            .eq("organisation_id", organisationId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    let profile = profileRes.data;
    const subscription = subscriptionRes.data ?? null;

    if (subscriptionRes.error && subscriptionRes.error.code !== "PGRST116") {
      console.error("Error fetching subscription:", subscriptionRes.error);
      return NextResponse.json(
        { error: "Failed to fetch subscription" },
        { status: 500 },
      );
    }

    if (profileRes.error && profileRes.error.code !== "PGRST116") {
      console.error("Error fetching profile:", profileRes.error);
      return NextResponse.json(
        { error: "Failed to fetch profile" },
        { status: 500 },
      );
    }

    const now = new Date();

    if (!profile) {
      const trialEndsAt = new Date(now);
      trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);
      const { data: authUser } = await supabaseAuth.auth.getUser();
      const metadata = (authUser.user?.user_metadata ?? {}) as Record<string, string>;
      const { error: insertError } = await supabaseAuth.from("profiles").insert({
        id: user.id,
        full_name: (metadata.full_name as string)?.trim() || "User",
        email: authUser.user?.email ?? user.email ?? "",
        phone: (metadata.phone as string)?.trim() || null,
        organisation_name: (metadata.organisation_name as string)?.trim() || "My Organisation",
        trial_ends_at: trialEndsAt.toISOString(),
      });
      if (insertError) {
        console.error("Error creating profile for new user:", insertError);
        return NextResponse.json(
          { error: "Failed to create profile" },
          { status: 500 },
        );
      }
      profile = { trial_ends_at: trialEndsAt.toISOString() };
    }

    const trialEndsAt = profile?.trial_ends_at ?? null;
    const hasActiveSubscription =
      !!subscription &&
      (subscription.status === "active" || subscription.status === "trialing") &&
      subscription.current_period_end &&
      new Date(subscription.current_period_end) > now;

    const trialStillActive = trialEndsAt && new Date(trialEndsAt) > now;
    const canAccess = hasActiveSubscription || trialStillActive;

    return NextResponse.json({
      hasActiveSubscription,
      canAccess,
      trialEndsAt: trialEndsAt ?? null,
      subscription: subscription
        ? {
            status: subscription.status,
            plan_type: subscription.plan_type,
            billing_cycle: subscription.billing_cycle,
            current_period_end: subscription.current_period_end,
            current_period_start: subscription.current_period_start,
          }
        : null,
    });
  } catch (error) {
    console.error("Error checking subscription status:", error);
    return NextResponse.json(
      { error: "Failed to check subscription status" },
      { status: 500 },
    );
  }
}
