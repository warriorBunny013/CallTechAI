import Stripe from "stripe";

// Server-side Stripe instance (DO NOT import this in client components)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil", // Your preferred API version
  typescript: true,
});
