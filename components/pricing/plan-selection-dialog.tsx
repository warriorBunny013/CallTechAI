"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Loader2, CreditCard } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  PRICING_PLANS,
  yearlyDisplayPrice,
  type BillingCycle,
  type PlanId,
} from "@/lib/pricing-plans";

interface PlanSelectionDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When false, user cannot close without choosing a plan */
  dismissible?: boolean;
}

export function PlanSelectionDialog({
  open,
  onOpenChange,
  dismissible = false,
}: PlanSelectionDialogProps) {
  const [isYearly, setIsYearly] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);

  const startCheckout = async (plan: PlanId, billingCycle: BillingCycle) => {
    try {
      setLoadingPlan(plan);
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billingCycle }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      toast({
        title: "Something went wrong",
        description:
          err instanceof Error ? err.message : "Failed to start checkout",
        variant: "destructive",
      });
      setLoadingPlan(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={dismissible ? onOpenChange : undefined}
    >
      <DialogContent
        className="sm:max-w-4xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => {
          if (!dismissible) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (!dismissible) e.preventDefault();
        }}
      >
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-2xl font-bold">
            Choose your plan
          </DialogTitle>
          <DialogDescription>
            Select a plan to activate your account. You&apos;ll complete payment
            securely via Stripe.
          </DialogDescription>
        </DialogHeader>

        {/* Monthly / Yearly toggle */}
        <div className="flex items-center justify-center gap-4 py-2">
          <span
            className={`text-sm font-semibold transition-colors ${!isYearly ? "text-foreground" : "text-muted-foreground"}`}
          >
            Monthly
          </span>
          <button
            type="button"
            onClick={() => setIsYearly(!isYearly)}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none ${isYearly ? "bg-lime-500" : "bg-muted"}`}
            aria-label="Toggle billing period"
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${isYearly ? "translate-x-8" : "translate-x-1"}`}
            />
          </button>
          <span
            className={`text-sm font-semibold transition-colors ${isYearly ? "text-foreground" : "text-muted-foreground"}`}
          >
            Yearly
          </span>
          {isYearly && (
            <span className="px-3 py-1 rounded-full bg-lime-500 text-black text-xs font-bold">
              40% OFF
            </span>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {PRICING_PLANS.map((plan) => {
            const displayPrice = isYearly
              ? yearlyDisplayPrice(plan.monthlyPrice)
              : plan.monthlyPrice;
            const isLoading = loadingPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border-2 p-5 transition-all ${
                  plan.highlight
                    ? "border-lime-500/50 bg-lime-500/5 shadow-lg shadow-lime-500/10"
                    : "border-border bg-card"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-lime-500 px-3 py-0.5 text-xs font-bold text-black shadow">
                      Most popular
                    </span>
                  </div>
                )}

                <div className="mb-3">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider mb-2 ${plan.badgeColor}`}
                  >
                    {plan.badge}
                  </span>
                  <h3 className="text-base font-bold">{plan.label}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {plan.tagline}
                  </p>
                </div>

                <div className="mb-4">
                  {isYearly && (
                    <span className="text-sm text-muted-foreground line-through mr-2">
                      ${plan.monthlyPrice}
                    </span>
                  )}
                  <div className="flex items-baseline gap-1 inline-flex">
                    <span className="text-2xl font-extrabold">
                      ${displayPrice}
                    </span>
                    <span className="text-xs text-muted-foreground">/mo</span>
                  </div>
                  {isYearly && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      billed annually
                    </p>
                  )}
                  <p className={`text-xs font-semibold mt-1 ${plan.accentColor}`}>
                    {plan.minutesIncluded} min/mo · {plan.callRange}
                  </p>
                </div>

                <ul className="space-y-1.5 flex-1 mb-4">
                  {plan.features.slice(0, 5).map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check
                        className={`h-3.5 w-3.5 ${plan.checkColor} shrink-0 mt-0.5`}
                      />
                      <span className="text-xs text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() =>
                    startCheckout(plan.id, isYearly ? "yearly" : "monthly")
                  }
                  disabled={!!loadingPlan}
                  className={`h-10 rounded-xl font-semibold text-sm ${
                    plan.highlight
                      ? "bg-lime-500 hover:bg-lime-600 text-black"
                      : ""
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading…
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Get {plan.label.split(" ")[0]}
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
