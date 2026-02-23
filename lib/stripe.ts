import { loadStripe } from "@stripe/stripe-js";

// Client-side Stripe (safe for browser)
export const getStripe = () => {
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
};

// Plan features (safe for client-side)
export const PLAN_FEATURES = {
  basic: [
    "AI Voice Assistant",
    "Unlimited Calls",
    "Call Analytics",
    "Intent Management",
    "Email Support",
  ],
};

// Pricing configuration - use env vars for your Stripe account's price IDs
const PRICE_MONTHLY =
  process.env.STRIPE_PRICE_BASIC_MONTHLY ?? "price_1T31aQJKPoxaIirT7FW7LVBo";
const PRICE_YEARLY =
  process.env.STRIPE_PRICE_BASIC_YEARLY ?? "price_1T31cMJKPoxaIirTsqIk3hhN";

export const STRIPE_PLANS = {
  basic: {
    monthly: {
      priceId: PRICE_MONTHLY,
      amount: 9900, // $99.00 in cents
    },
    yearly: {
      priceId: PRICE_YEARLY,
      amount: 99900, // $999.00 in cents
    },
  },
};
