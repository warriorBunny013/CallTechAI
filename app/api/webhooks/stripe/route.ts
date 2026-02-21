import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-server";
import { getSupabaseService } from "@/lib/supabase/service";
import { getOrganisationIdForUserService } from "@/lib/org";
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

    console.log(`Webhook received: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(
          event.data.object as Stripe.Subscription,
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
  if (!metadata) {
    console.error("No metadata in checkout session");
    return;
  }

  const { userId, organisationId: metaOrgId, plan, billingCycle } = metadata;

  if (!userId) {
    console.error("No userId in metadata");
    return;
  }

  const organisationId =
    metaOrgId ?? (await getOrganisationIdForUserService(userId));

  if (!organisationId) {
    console.error("No organisationId for user:", userId);
    return;
  }

  console.log(`Processing checkout for user: ${userId}, org: ${organisationId}`);

  const supabase = getSupabaseService();

  if (session.subscription && typeof session.subscription === "string") {
    try {
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription,
      );

      console.log(`Subscription retrieved: ${subscription.id}`);

      const now = new Date();
      const currentPeriodStart = (subscription as any).current_period_start
        ? new Date((subscription as any).current_period_start * 1000)
        : now;
      const currentPeriodEnd = (subscription as any).current_period_end
        ? new Date((subscription as any).current_period_end * 1000)
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from("subscriptions")
        .upsert(
          {
            user_id: userId,
            organisation_id: organisationId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            plan_type: plan || "basic",
            billing_cycle:
              billingCycle === "year"
                ? "yearly"
                : billingCycle === "month"
                  ? "monthly"
                  : billingCycle || "monthly",
            current_period_start: currentPeriodStart.toISOString(),
            current_period_end: currentPeriodEnd.toISOString(),
          },
          { onConflict: "user_id" },
        )
        .select();

      if (error) {
        console.error("Error upserting subscription:", error);
        throw error;
      }

      console.log("Subscription upserted successfully:", data);
    } catch (error) {
      console.error("Error handling checkout session completed:", error);
      throw error;
    }
  } else {
    console.error("No subscription ID in checkout session");
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    console.log(`Creating subscription: ${subscription.id}`);

    const customer = await stripe.customers.retrieve(
      subscription.customer as string,
    );

    if (!customer || customer.deleted) {
      console.error("Customer not found for subscription:", subscription.id);
      return;
    }

    const meta = (customer as any).metadata ?? {};
    const userId = meta.userId;
    const organisationId =
      meta.organisationId ?? (await getOrganisationIdForUserService(userId));

    if (!userId) {
      console.error(
        "No userId found in customer metadata for subscription:",
        subscription.id,
      );
      return;
    }

    if (!organisationId) {
      console.error("No organisationId for user:", userId);
      return;
    }

    const now = new Date();
    const currentPeriodStart = (subscription as any).current_period_start
      ? new Date((subscription as any).current_period_start * 1000)
      : now;
    const currentPeriodEnd = (subscription as any).current_period_end
      ? new Date((subscription as any).current_period_end * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const supabase = getSupabaseService();
    const { data, error } = await supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          organisation_id: organisationId,
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          plan_type: "basic",
          billing_cycle: (() => {
            const i =
              subscription.items.data[0]?.price?.recurring?.interval || "month";
            return i === "year" ? "yearly" : i === "month" ? "monthly" : "monthly";
          })(),
          current_period_start: currentPeriodStart.toISOString(),
          current_period_end: currentPeriodEnd.toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select();

    if (error) {
      console.error("Error creating subscription:", error);
      throw error;
    }

    console.log("Subscription created successfully:", data);
  } catch (error) {
    console.error("Error handling subscription created:", error);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    console.log(`Updating subscription: ${subscription.id}`);

    const now = new Date();
    const currentPeriodStart = (subscription as any).current_period_start
      ? new Date((subscription as any).current_period_start * 1000)
      : now;
    const currentPeriodEnd = (subscription as any).current_period_end
      ? new Date((subscription as any).current_period_end * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const supabase = getSupabaseService();
    const { data, error } = await supabase
      .from("subscriptions")
      .update({
        status: subscription.status,
        current_period_start: currentPeriodStart.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id)
      .select();

    if (error) {
      console.error("Error updating subscription:", error);
      throw error;
    }

    console.log("Subscription updated successfully:", data);
  } catch (error) {
    console.error("Error handling subscription updated:", error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    console.log(`Deleting subscription: ${subscription.id}`);

    const supabase = getSupabaseService();
    const { data, error } = await supabase
      .from("subscriptions")
      .update({
        status: "canceled",
      })
      .eq("stripe_subscription_id", subscription.id)
      .select();

    if (error) {
      console.error("Error deleting subscription:", error);
      throw error;
    }

    console.log("Subscription canceled successfully:", data);
  } catch (error) {
    console.error("Error handling subscription deleted:", error);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    const subscriptionId = (invoice as any).subscription;

    if (subscriptionId && typeof subscriptionId === "string") {
      console.log(`Payment succeeded for subscription: ${subscriptionId}`);

      const supabase = getSupabaseService();
      const { data, error } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
        })
        .eq("stripe_subscription_id", subscriptionId)
        .select();

      if (error) {
        console.error("Error updating payment succeeded:", error);
        throw error;
      }

      console.log("Payment succeeded updated:", data);
    }
  } catch (error) {
    console.error("Error handling payment succeeded:", error);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    const subscriptionId = (invoice as any).subscription;

    if (subscriptionId && typeof subscriptionId === "string") {
      console.log(`Payment failed for subscription: ${subscriptionId}`);

      const supabase = getSupabaseService();
      const { data, error } = await supabase
        .from("subscriptions")
        .update({
          status: "past_due",
        })
        .eq("stripe_subscription_id", subscriptionId)
        .select();

      if (error) {
        console.error("Error updating payment failed:", error);
        throw error;
      }

      console.log("Payment failed updated:", data);
    }
  } catch (error) {
    console.error("Error handling payment failed:", error);
  }
}
