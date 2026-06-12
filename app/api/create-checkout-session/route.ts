import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-server";
import { getStripePriceId, isValidPlanId, STRIPE_PLANS } from "@/lib/stripe";
import type { BillingCycle, PlanId } from "@/lib/pricing-plans";
import { getSupabaseService } from "@/lib/supabase/service";
import { getCurrentUserAndOrg } from "@/lib/org";
import { getCurrentUser } from "@/lib/auth";

function validatePriceIds(): string | null {
  for (const plan of ["starter", "growth", "pro"] as PlanId[]) {
    for (const cycle of ["monthly", "yearly"] as BillingCycle[]) {
      const priceId = STRIPE_PLANS[plan][cycle].priceId;
      if (!priceId || !priceId.startsWith("price_")) {
        return `Invalid Stripe price ID for ${plan} ${cycle}. Set STRIPE_PRICE_* env vars.`;
      }
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
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

    const priceError = validatePriceIds();
    if (priceError) {
      console.error(priceError);
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

    const body = await req.json();
    const plan: PlanId = isValidPlanId(body.plan) ? body.plan : "starter";
    const billingCycle: BillingCycle =
      body.billingCycle === "yearly" ? "yearly" : "monthly";

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
            plan_type: plan,
            billing_cycle: billingCycle,
          },
          { onConflict: "user_id" },
        );

      if (upsertError) {
        console.error("Error creating subscription record:", upsertError);
        return NextResponse.json(
          { error: "Failed to create subscription record" },
          { status: 500 },
        );
      }
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: getStripePriceId(plan, billingCycle),
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${appUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/signup?checkout=cancelled`,
      metadata: {
        userId: userAndOrg.userId,
        organisationId: userAndOrg.organisationId,
        plan,
        billingCycle,
      },
      customer_update: {
        address: "auto",
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);

    const message =
      error instanceof Error ? error.message : "Unknown error";
    const isStripeError =
      message.includes("No such price") ||
      message.includes("Invalid API Key") ||
      message.includes("api_key");
    const safeMessage = isStripeError
      ? "Stripe configuration error. Ensure price IDs match your Stripe account."
      : "Failed to create checkout session";

    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
