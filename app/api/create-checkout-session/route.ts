// ============================================
// FILE: app/api/create-checkout-session/route.ts (UPDATED)
// ============================================
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-server";
import { STRIPE_PLANS } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { billingCycle } = await req.json();

    if (!billingCycle || !["monthly", "yearly"].includes(billingCycle)) {
      return NextResponse.json(
        { error: "Invalid billing cycle" },
        { status: 400 },
      );
    }

    const userEmail = user.email || "";

    let customerId: string;

    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (existingSubscription?.stripe_customer_id) {
      customerId = existingSubscription.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;

      const { error: upsertError } = await supabase
        .from("subscriptions")
        .upsert(
          {
            user_id: user.id,
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
        userId: user.id,
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
