import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-server";
import { supabase } from "@/lib/supabase";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
) {
  const metadata = session.metadata;
  if (!metadata) return;

  const { userId, plan, billingCycle } = metadata;

  if (session.subscription && typeof session.subscription === "string") {
    try {
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription,
      );

      // Type assertion for the subscription object
      const sub = subscription as any;

      await supabase
        .from("subscriptions")
        .update({
          stripe_subscription_id: subscription.id,
          status: "active",
          plan_type: plan,
          billing_cycle: billingCycle,
          current_period_start: new Date(
            sub.current_period_start * 1000,
          ).toISOString(),
          current_period_end: new Date(
            sub.current_period_end * 1000,
          ).toISOString(),
        })
        .eq("user_id", userId);
    } catch (error) {
      console.error("Error handling checkout session completed:", error);
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    // Type assertion for the subscription object
    const sub = subscription as any;

    await supabase
      .from("subscriptions")
      .update({
        status: subscription.status,
        current_period_start: new Date(
          sub.current_period_start * 1000,
        ).toISOString(),
        current_period_end: new Date(
          sub.current_period_end * 1000,
        ).toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id);
  } catch (error) {
    console.error("Error handling subscription updated:", error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    await supabase
      .from("subscriptions")
      .update({
        status: "canceled",
      })
      .eq("stripe_subscription_id", subscription.id);
  } catch (error) {
    console.error("Error handling subscription deleted:", error);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    // Type assertion for the invoice object
    const inv = invoice as any;

    if (inv.subscription && typeof inv.subscription === "string") {
      await supabase
        .from("subscriptions")
        .update({
          status: "active",
        })
        .eq("stripe_subscription_id", inv.subscription);
    }
  } catch (error) {
    console.error("Error handling payment succeeded:", error);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    // Type assertion for the invoice object
    const inv = invoice as any;

    if (inv.subscription && typeof inv.subscription === "string") {
      await supabase
        .from("subscriptions")
        .update({
          status: "past_due",
        })
        .eq("stripe_subscription_id", inv.subscription);
    }
  } catch (error) {
    console.error("Error handling payment failed:", error);
  }
}
