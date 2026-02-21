import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-server";
import { getSupabaseService } from "@/lib/supabase/service";
import { getCurrentUserAndOrg } from "@/lib/org";

export async function POST(req: NextRequest) {
  try {
    const userAndOrg = await getCurrentUserAndOrg();

    if (!userAndOrg) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseService();

    let sessionId;
    try {
      const body = await req.json();
      sessionId = body.sessionId;
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Check if the session is completed and paid
    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    // If there's a subscription, retrieve it and update the database
    if (session.subscription && typeof session.subscription === "string") {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);

      console.log("Subscription data:", {
        id: subscription.id,
        status: subscription.status,
        current_period_start: (subscription as any).current_period_start,
        current_period_end: (subscription as any).current_period_end,
        type: typeof (subscription as any).current_period_start,
        type_end: typeof (subscription as any).current_period_end,
        items: subscription.items?.data?.[0]?.price?.recurring
      });

      // Calculate period dates - use current time as fallback for test environment
      const now = new Date();
      const currentPeriodStart = (subscription as any).current_period_start 
        ? new Date((subscription as any).current_period_start * 1000)
        : now;
      
      const currentPeriodEnd = (subscription as any).current_period_end 
        ? new Date((subscription as any).current_period_end * 1000)
        : new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days from now as fallback

      console.log("Calculated periods:", {
        start: currentPeriodStart.toISOString(),
        end: currentPeriodEnd.toISOString(),
        original_start: (subscription as any).current_period_start,
        original_end: (subscription as any).current_period_end
      });

      const rawCycle =
        (session.metadata?.billingCycle as string) ||
        subscription.items.data[0]?.price?.recurring?.interval ||
        "monthly";
      const billingCycle =
        rawCycle === "year" ? "yearly" : rawCycle === "month" ? "monthly" : rawCycle;

      // Update the subscription record
      const { data, error } = await supabase
        .from("subscriptions")
        .upsert(
          {
            user_id: userAndOrg.userId,
            organisation_id: userAndOrg.organisationId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            plan_type: "basic",
            billing_cycle: billingCycle,
            current_period_start: currentPeriodStart.toISOString(),
            current_period_end: currentPeriodEnd.toISOString(),
          },
          {
            onConflict: "user_id",
          },
        )
        .select();

      if (error) {
        console.error("Error updating subscription:", error);
        return NextResponse.json(
          { error: "Failed to update subscription" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        subscription: data[0],
        message: "Payment verified and subscription updated",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified",
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { 
        error: "Failed to verify payment",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 },
    );
  }
}
