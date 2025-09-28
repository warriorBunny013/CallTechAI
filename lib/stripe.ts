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

// Pricing configuration (safe for client-side)
export const STRIPE_PLANS = {
  basic: {
    monthly: {
      priceId: "price_1SCMSuKOgBMfPIX7aANUP6Lz", // Replace with your actual Stripe Price ID
      amount: 9900, // $99.00 in cents
    },
    yearly: {
      priceId: "price_1SAv7hKOgBMfPIX7RNegQViK", // Replace with your actual Stripe Price ID
      amount: 99900, // $999.00 in cents
    },
  },
};
