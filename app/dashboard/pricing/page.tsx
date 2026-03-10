"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Check,
  Loader2,
  Zap,
  PhoneCall,
  BarChart3,
  MessageSquare,
  Calendar,
  NotebookPen,
  HeadphonesIcon,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useSubscription } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";

const FEATURES = [
  { icon: <PhoneCall className="h-4 w-4" />, text: "Inbound AI calls" },
  { icon: <MessageSquare className="h-4 w-4" />, text: "Custom intent & FAQ management" },
  { icon: <NotebookPen className="h-4 w-4" />, text: "AI summarization of calls" },
  { icon: <BarChart3 className="h-4 w-4" />, text: "Call analytics & recordings" },
  { icon: <Zap className="h-4 w-4" />, text: "Real-time AI voice assistant" },
  { icon: <HeadphonesIcon className="h-4 w-4" />, text: "Priority support" },
];

const FAQS = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel at any time from your subscription settings. You'll keep access until the end of your current billing period.",
  },
  {
    q: "What happens after my free trial?",
    a: "After your 7-day trial you'll need an active subscription to continue using CallTechAI. We'll remind you before the trial ends.",
  },
  {
    q: "Is there a contract or commitment?",
    a: "No contracts. Monthly plans renew monthly, annual plans renew yearly — cancel whenever you want.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit and debit cards via Stripe. Your payment data is never stored on our servers.",
  },
  {
    q: "Can I switch from monthly to annual?",
    a: "Yes. You can change your billing cycle at any time. The switch takes effect at your next renewal date.",
  },
];

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { hasActiveSubscription, subscription } = useSubscription();

  const monthlyPrice = 99;
  const yearlyTotal = 999;
  const yearlyMonthly = Math.round(yearlyTotal / 12);
  const savings = monthlyPrice * 12 - yearlyTotal;
  const savingsPct = Math.round((savings / (monthlyPrice * 12)) * 100);

  const handleSubscribe = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingCycle: isYearly ? "yearly" : "monthly" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create checkout session");
      if (data.url) window.location.href = data.url;
    } catch (err) {
      toast({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Failed to start checkout",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-14 py-6 pb-16">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="text-center space-y-3">
        {/* <div className="inline-flex items-center gap-1.5 rounded-full border border-lime-500/30 bg-lime-500/10 px-3 py-1 text-xs font-medium text-lime-600 dark:text-lime-400">
          <Sparkles className="h-3.5 w-3.5" />
          Simple, transparent pricing
        </div> */}
        <h1 className="text-4xl font-bold tracking-tight">
          Current Plan
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
        Your active subscription details
        </p>
      </div>

      {/* ── Billing toggle ────────────────────────────────────────────────── */}
      {/* <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border bg-muted/50 p-1">
          <button
            onClick={() => setIsYearly(false)}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-medium transition-all",
              !isYearly
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsYearly(true)}
            className={cn(
              "flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all",
              isYearly
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Annual
            <span className="rounded-full bg-lime-500 px-2 py-0.5 text-[10px] font-bold text-black">
              -{savingsPct}%
            </span>
          </button>
        </div>
      </div> */}

      {/* ── Pricing card ──────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl border-2 border-lime-500/40 bg-gradient-to-b from-lime-500/5 to-transparent p-8 shadow-lg">
        {/* Most popular ribbon */}
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-lime-500 px-4 py-1 text-xs font-bold text-black shadow-md">
            Most popular
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          {/* Left: name + price */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Basic Plan</p>
              <h2 className="text-2xl font-bold mt-0.5">AI Voice Receptionist</h2>
              <p className="text-sm text-muted-foreground mt-1">Perfect for businesses ready to automate their phone line.</p>
            </div>

            <div className="flex items-end gap-1.5">
              <span className="text-5xl font-extrabold tracking-tight">
                ${isYearly ? yearlyMonthly : monthlyPrice}
              </span>
              <div className="pb-1 space-y-0.5">
                <p className="text-sm text-muted-foreground leading-none">/month</p>
                {isYearly && (
                  <p className="text-xs text-muted-foreground leading-none">
                    billed ${yearlyTotal}/year
                  </p>
                )}
              </div>
            </div>

            {isYearly && (
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-lime-500/30 bg-lime-500/10 px-3 py-1.5 text-sm font-medium text-lime-700 dark:text-lime-400">
                <Check className="h-3.5 w-3.5" />
                You save ${savings}/year vs monthly
              </div>
            )}
          </div>

          {/* Right: CTA */}
          <div className="flex flex-col gap-3 sm:items-end sm:min-w-[180px]">
            {hasActiveSubscription ? (
              <div className="space-y-2 sm:text-right">
                <Badge className="bg-lime-500/20 text-lime-700 dark:text-lime-400 border-lime-500/30 hover:bg-lime-500/20">
                  ✓ Active plan
                </Badge>
                {subscription && (
                  <p className="text-xs text-muted-foreground">
                    {subscription.billing_cycle === "yearly" ? "Annual" : "Monthly"} billing
                    {subscription.current_period_end && (
                      <>
                        {" "}· Renews{" "}
                        {new Date(subscription.current_period_end).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </>
                    )}
                  </p>
                )}
              </div>
            ) : (
              <>
                <Button
                  onClick={handleSubscribe}
                  disabled={loading}
                  size="lg"
                  className="bg-lime-500 hover:bg-lime-600 text-black font-bold shadow-md hover:shadow-lime-500/25 transition-all w-full sm:w-auto"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Get started
                </Button>
                <p className="text-xs text-muted-foreground sm:text-right">
                  7-day free trial · No card required
                </p>
              </>
            )}
          </div>
        </div>

        <Separator className="my-7" />

        {/* Features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FEATURES.map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lime-500/15 text-lime-600 dark:text-lime-400">
                {f.icon}
              </div>
              <span className="text-sm text-foreground">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Trust strip ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 divide-x rounded-xl border text-center overflow-hidden">
        {[
          { value: "7-day", label: "Free trial" },
          { value: "No card", label: "Required" },
          { value: "Cancel", label: "Anytime" },
        ].map(({ value, label }) => (
          <div key={value} className="py-5 px-2 space-y-0.5">
            <p className="font-bold text-lg text-lime-600 dark:text-lime-400">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold">Frequently asked questions</h2>
        <div className="space-y-2">
          {FAQS.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div key={i} className="rounded-xl border overflow-hidden">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium hover:bg-muted/50 transition-colors"
                >
                  {faq.q}
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-sm text-muted-foreground border-t bg-muted/20 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Toaster />
    </div>
  );
}
