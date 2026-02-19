import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching subscription:", error);
      return NextResponse.json(
        { error: "Failed to fetch subscription" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      userId: user.id,
      subscription,
      hasSubscription: !!subscription,
      subscriptionStatus: subscription?.status,
      stripeSubscriptionId: subscription?.stripe_subscription_id,
    });
  } catch (error) {
    console.error("Error checking subscription:", error);
    return NextResponse.json(
      { error: "Failed to check subscription" },
      { status: 500 },
    );
  }
}
