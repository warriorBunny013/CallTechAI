// ============================================
// FILE: app/api/create-checkout-session/route.ts (UPDATED)
// ============================================
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-server";
import { STRIPE_PLANS } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { billingCycle } = await req.json();

    if (!billingCycle || !["monthly", "yearly"].includes(billingCycle)) {
      return NextResponse.json(
        { error: "Invalid billing cycle" },
        { status: 400 },
      );
    }

    // Get user email for Stripe customer
    const userEmail = user.emailAddresses[0]?.emailAddress || "";

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
        email: userEmail,
        metadata: {
          userId,
          clerkUserId: userId, // Store Clerk user ID
        },
      });
      customerId = customer.id;

      // Insert or update subscription record
      const { error: upsertError } = await supabase
        .from("subscriptions")
        .upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
            status: "inactive",
            plan_type: "basic",
            billing_cycle: billingCycle,
          },
          {
            onConflict: "user_id",
          },
        );

      if (upsertError) {
        console.error("Error creating subscription record:", upsertError);
      }
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
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/pricing`,
      metadata: {
        userId,
        clerkUserId: userId,
        plan: "basic",
        billingCycle,
      },
      customer_update: {
        address: "auto",
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
