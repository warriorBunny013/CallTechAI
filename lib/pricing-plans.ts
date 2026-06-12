/**
 * Shared subscription plan definitions for landing, signup, and dashboard pricing.
 */

export type PlanId = "starter" | "growth" | "pro";
export type BillingCycle = "monthly" | "yearly";

export const YEARLY_DISCOUNT = 0.4;

export interface PricingPlan {
  id: PlanId;
  label: string;
  badge: string;
  badgeColor: string;
  accentColor: string;
  highlight: boolean;
  monthlyPrice: number;
  minutesIncluded: number;
  callRange: string;
  tagline: string;
  features: string[];
  checkColor: string;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "starter",
    label: "Starter Package",
    badge: "SOLO",
    badgeColor:
      "bg-white/10 text-white/60 dark:bg-white/10 dark:text-white/60 bg-gray-100 text-gray-500",
    accentColor: "text-[#84CC16]",
    highlight: false,
    monthlyPrice: 99,
    minutesIncluded: 250,
    callRange: "60–120 calls/month",
    tagline: "Freelancers · solo trades · consultants",
    features: [
      "1 AI receptionist number",
      "1 voice persona",
      "1 language (English)",
      "Telegram alerts",
      "Google Calendar sync",
      "Call recordings + AI summaries",
      "Analytics dashboard",
      "Custom intents",
      "Email support",
    ],
    checkColor: "text-[#84CC16]",
  },
  {
    id: "growth",
    label: "Growth Package",
    badge: "MOST POPULAR",
    badgeColor: "bg-[#84CC16]/15 text-[#84CC16]",
    accentColor: "text-[#84CC16]",
    highlight: true,
    monthlyPrice: 249,
    minutesIncluded: 500,
    callRange: "~150–250 calls/month",
    tagline: "Salons · clinics · agencies · SMBs",
    features: [
      "3 AI receptionist numbers",
      "3 voice personas",
      "English + Russian",
      "Telegram alerts",
      "Google Calendar sync",
      "Call recordings + AI summaries",
      "Advanced analytics + trends",
      "Unlimited custom intents",
      "Priority chat support",
    ],
    checkColor: "text-[#84CC16]",
  },
  {
    id: "pro",
    label: "Pro Package",
    badge: "BUSINESS+",
    badgeColor: "bg-purple-500/15 text-purple-400",
    accentColor: "text-purple-400",
    highlight: false,
    monthlyPrice: 599,
    minutesIncluded: 1000,
    callRange: "300–500 calls/month",
    tagline: "Multi-location · high-volume · restaurants",
    features: [
      "10 AI receptionist numbers",
      "10 voice personas",
      "All languages supported",
      "Telegram alerts",
      "Google Calendar sync",
      "Call recordings + AI summaries",
      "Full analytics suite",
      "Unlimited custom intents",
      "Priority phone + chat support",
    ],
    checkColor: "text-purple-400",
  },
];

export function yearlyDisplayPrice(monthlyPrice: number): number {
  return Math.round(monthlyPrice * (1 - YEARLY_DISCOUNT));
}

export function normalizePlanId(plan: string | null | undefined): PlanId | null {
  if (!plan) return null;
  const p = plan.toLowerCase();
  if (p === "basic" || p === "starter") return "starter";
  if (p === "growth") return "growth";
  if (p === "pro") return "pro";
  return null;
}

export function getPlanLabel(
  planType: string | null | undefined,
  isTrial: boolean
): string {
  if (isTrial) return "7-day Free Trial";
  if (!planType) return "No Active Plan";
  const id = normalizePlanId(planType);
  if (id) return PRICING_PLANS.find((p) => p.id === id)?.label ?? planType;
  return planType;
}

export function getPlanMinutes(planType: string | null | undefined): number {
  const id = normalizePlanId(planType);
  if (!id) return 0;
  return PRICING_PLANS.find((p) => p.id === id)?.minutesIncluded ?? 250;
}
