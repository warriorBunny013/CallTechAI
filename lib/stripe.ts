import { loadStripe } from "@stripe/stripe-js";
import type { BillingCycle, PlanId } from "@/lib/pricing-plans";

// Client-side Stripe (safe for browser)
export const getStripe = () => {
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
};

export type StripePlanConfig = {
  monthly: { priceId: string; amount: number };
  yearly: { priceId: string; amount: number };
};

const STARTER_MONTHLY =
  process.env.STRIPE_PRICE_STARTER_MONTHLY ??
  process.env.STRIPE_PRICE_BASIC_MONTHLY ??
  "price_1T31aQJKPoxaIirT7FW7LVBo";
const STARTER_YEARLY =
  process.env.STRIPE_PRICE_STARTER_YEARLY ??
  process.env.STRIPE_PRICE_BASIC_YEARLY ??
  "price_1T31cMJKPoxaIirTsqIk3hhN";
const GROWTH_MONTHLY =
  process.env.STRIPE_PRICE_GROWTH_MONTHLY ?? STARTER_MONTHLY;
const GROWTH_YEARLY =
  process.env.STRIPE_PRICE_GROWTH_YEARLY ?? STARTER_YEARLY;
const PRO_MONTHLY = process.env.STRIPE_PRICE_PRO_MONTHLY ?? STARTER_MONTHLY;
const PRO_YEARLY = process.env.STRIPE_PRICE_PRO_YEARLY ?? STARTER_YEARLY;

export const STRIPE_PLANS: Record<PlanId, StripePlanConfig> = {
  starter: {
    monthly: { priceId: STARTER_MONTHLY, amount: 9900 },
    yearly: { priceId: STARTER_YEARLY, amount: 99900 },
  },
  growth: {
    monthly: { priceId: GROWTH_MONTHLY, amount: 24900 },
    yearly: { priceId: GROWTH_YEARLY, amount: 249900 },
  },
  pro: {
    monthly: { priceId: PRO_MONTHLY, amount: 59900 },
    yearly: { priceId: PRO_YEARLY, amount: 599900 },
  },
};

const VALID_PLANS: PlanId[] = ["starter", "growth", "pro"];

export function isValidPlanId(plan: string): plan is PlanId {
  return VALID_PLANS.includes(plan as PlanId);
}

export function getStripePriceId(
  plan: PlanId,
  billingCycle: BillingCycle
): string {
  return STRIPE_PLANS[plan][billingCycle].priceId;
}

/** Resolve plan id from a Stripe price ID (webhook fallback). */
export function planIdFromPriceId(priceId: string): PlanId | null {
  for (const plan of VALID_PLANS) {
    if (
      STRIPE_PLANS[plan].monthly.priceId === priceId ||
      STRIPE_PLANS[plan].yearly.priceId === priceId
    ) {
      return plan;
    }
  }
  return null;
}
