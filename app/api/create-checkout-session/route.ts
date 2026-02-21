import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-server";
import { STRIPE_PLANS } from "@/lib/stripe";
import { getSupabaseService } from "@/lib/supabase/service";
import { getCurrentUserAndOrg } from "@/lib/org";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const [userAndOrg, user] = await Promise.all([
      getCurrentUserAndOrg(),
      getCurrentUser(),
    ]);

    if (!userAndOrg || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { billingCycle } = await req.json();

    if (!billingCycle || !["monthly", "yearly"].includes(billingCycle)) {
      return NextResponse.json(
        { error: "Invalid billing cycle" },
        { status: 400 },
      );
    }

    const userEmail = user.email ?? "";

    const supabase = getSupabaseService();
    let customerId: string;

    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userAndOrg.userId)
      .maybeSingle();

    if (existingSubscription?.stripe_customer_id) {
      customerId = existingSubscription.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          userId: userAndOrg.userId,
          organisationId: userAndOrg.organisationId,
        },
      });
      customerId = customer.id;

      const { error: upsertError } = await supabase
        .from("subscriptions")
        .upsert(
          {
            user_id: userAndOrg.userId,
            organisation_id: userAndOrg.organisationId,
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
        return NextResponse.json(
          { error: "Failed to create subscription record" },
          { status: 500 },
        );
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
        userId: userAndOrg.userId,
        organisationId: userAndOrg.organisationId,
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
