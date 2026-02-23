import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-server";
import { STRIPE_PLANS } from "@/lib/stripe";
import { getSupabaseService } from "@/lib/supabase/service";
import { getCurrentUserAndOrg } from "@/lib/org";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // Validate required env vars early
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY is not set");
      return NextResponse.json(
        { error: "Payment configuration error. Please contact support." },
        { status: 500 },
      );
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("SUPABASE_SERVICE_ROLE_KEY is not set");
      return NextResponse.json(
        { error: "Server configuration error. Please contact support." },
        { status: 500 },
      );
    }

    const monthlyPriceId = STRIPE_PLANS.basic.monthly?.priceId;
    const yearlyPriceId = STRIPE_PLANS.basic.yearly?.priceId;
    if (
      !monthlyPriceId ||
      !yearlyPriceId ||
      !monthlyPriceId.startsWith("price_") ||
      !yearlyPriceId.startsWith("price_")
    ) {
      console.error(
        "Invalid Stripe price IDs. Set STRIPE_PRICE_BASIC_MONTHLY and STRIPE_PRICE_BASIC_YEARLY in env."
      );
      return NextResponse.json(
        { error: "Pricing not configured. Please contact support." },
        { status: 500 },
      );
    }

    const [userAndOrg, user] = await Promise.all([
      getCurrentUserAndOrg(),
      getCurrentUser(),
    ]);

    if (!userAndOrg || !user) {
      return NextResponse.json(
        { error: "Please sign in and ensure you have an organisation set up." },
        { status: 401 },
      );
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

    // Return sanitized error for debugging (no secrets)
    const message =
      error instanceof Error ? error.message : "Unknown error";
    const isStripeError =
      message.includes("No such price") ||
      message.includes("Invalid API Key") ||
      message.includes("api_key");
    const safeMessage = isStripeError
      ? "Stripe configuration error. Ensure price IDs match your Stripe account."
      : "Failed to create checkout session";

    return NextResponse.json(
      { error: safeMessage },
      { status: 500 },
    );
  }
}
