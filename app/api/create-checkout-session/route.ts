import { NextRequest, NextResponse } from "next/server";
// import { stripe, STRIPE_PLANS } from "@/lib/stripe";
import { stripe } from "@/lib/stripe-server";
import { STRIPE_PLANS } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { billingCycle } = await req.json();

    if (!billingCycle || !["monthly", "yearly"].includes(billingCycle)) {
      return NextResponse.json(
        { error: "Invalid billing cycle" },
        { status: 400 },
      );
    }

    // Get or create customer
    let customerId: string;

    // Check if user already has a Stripe customer ID
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single();

    if (existingSubscription?.stripe_customer_id) {
      customerId = existingSubscription.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        metadata: {
          userId,
        },
      });
      customerId = customer.id;

      // Insert or update subscription record
      await supabase.from("subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        status: "inactive",
        plan_type: "basic",
        billing_cycle: billingCycle,
      });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price:
            STRIPE_PLANS.basic[billingCycle as "monthly" | "yearly"].priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard`,
      metadata: {
        userId,
        plan: "basic",
        billingCycle,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
