import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Error fetching subscription:", error);
      return NextResponse.json(
        { error: "Failed to fetch subscription" },
        { status: 500 },
      );
    }

    if (!subscription) {
      return NextResponse.json({
        hasActiveSubscription: false,
        subscription: null,
      });
    }

    // Check if subscription is active and not expired
    const now = new Date();
    const isActive =
      (subscription.status === "active" || subscription.status === "trialing") &&
      subscription.current_period_end &&
      new Date(subscription.current_period_end) > now;

    return NextResponse.json({
      hasActiveSubscription: isActive,
      subscription: {
        status: subscription.status,
        plan_type: subscription.plan_type,
        billing_cycle: subscription.billing_cycle,
        current_period_end: subscription.current_period_end,
        current_period_start: subscription.current_period_start,
      },
    });
  } catch (error) {
    console.error("Error checking subscription status:", error);
    return NextResponse.json(
      { error: "Failed to check subscription status" },
      { status: 500 },
    );
  }
}
