"use client"

import { useMemo, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import {
  Check, ArrowUpRight, Zap, Clock, TrendingUp, AlertTriangle,
  Star, Loader2, CreditCard, CheckCircle2,
} from "lucide-react"
import { useSubscription } from "@/hooks/use-subscription"
import { useCallLogs } from "@/hooks/use-call-logs"

/* ─── Plan definitions ──────────────────────────────────────────────────── */
const PLANS = [
  {
    id: "starter",
    label: "Starter Package",
    badge: "SOLO",
    badgeColor: "bg-white/10 text-white/60 dark:bg-white/10 dark:text-white/60 bg-gray-100 text-gray-500",
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
      "WhatsApp or Telegram alerts",
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
      "WhatsApp + Telegram alerts",
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
      "WhatsApp + Telegram alerts",
      "Google Calendar sync",
      "Call recordings + AI summaries",
      "Full analytics suite",
      "Unlimited custom intents",
      "Priority phone + chat support",
    ],
    checkColor: "text-purple-400",
  },
]

const TRIAL_MINUTES = 40

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function getPlanLabel(planType: string | null | undefined, isTrial: boolean): string {
  if (isTrial) return "7-day Free Trial"
  if (!planType) return "No Active Plan"
  const map: Record<string, string> = {
    trial: "7-day Free Trial",
    starter: "Starter Package",
    growth: "Growth Package",
    pro: "Pro Package",
    basic: "Starter Package",
  }
  return map[planType.toLowerCase()] ?? planType
}

function getPlanMinutes(planType: string | null | undefined): number {
  if (!planType) return 0
  const map: Record<string, number> = {
    starter: 250,
    growth: 500,
    pro: 1000,
    basic: 250,
  }
  return map[planType.toLowerCase()] ?? 250
}

function getUpgradeSuggestion(planType: string | null | undefined, isTrial: boolean) {
  if (isTrial || !planType || planType.toLowerCase() === "trial") return PLANS[0]
  if (planType.toLowerCase() === "starter" || planType.toLowerCase() === "basic") return PLANS[1]
  if (planType.toLowerCase() === "growth") return PLANS[2]
  return null
}

/* ─── Usage Bar ──────────────────────────────────────────────────────────── */
function UsageBar({ used, total, isTrial }: { used: number; total: number; isTrial: boolean }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0
  const isWarning = pct >= 75 && pct < 100
  const isOver = pct >= 100

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${isOver ? "text-red-400" : isWarning ? "text-amber-400" : "text-gray-700 dark:text-gray-200"}`}>
          {used.toFixed(1)} / {total} minutes used {isTrial ? "total" : "this billing period"}
        </span>
        <span className={`text-xs font-bold tabular-nums ${isOver ? "text-red-400" : isWarning ? "text-amber-400" : "text-[#84CC16]"}`}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            isOver ? "bg-gradient-to-r from-red-500 to-red-400" :
            isWarning ? "bg-gradient-to-r from-amber-400 to-amber-300" :
            "bg-gradient-to-r from-[#84CC16] to-[#A3E635]"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>0 min</span>
        <span>{total} min limit</span>
      </div>
      {isWarning && (
        <p className="text-xs text-amber-400 font-medium flex items-center gap-1.5 pt-0.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Approaching your {isTrial ? "trial" : "monthly"} limit — upgrade soon
        </p>
      )}
      {isOver && (
        <p className="text-xs text-red-400 font-semibold flex items-center gap-1.5 pt-0.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {isTrial ? "Trial minutes exhausted" : "Monthly limit reached"} — upgrade to keep your AI answering calls
        </p>
      )}
    </div>
  )
}

/* ─── Checkout handler ───────────────────────────────────────────────────── */
function useCheckout() {
  const [loading, setLoading] = useState(false)

  const startCheckout = async (billingCycle: "monthly" | "yearly" = "monthly") => {
    try {
      setLoading(true)
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingCycle }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create checkout session")
      if (data.url) window.location.href = data.url
    } catch (err) {
      toast({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Failed to start checkout",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return { startCheckout, loading }
}

/* ─── Main content ───────────────────────────────────────────────────────── */
function PricingContent() {
  const { hasActiveSubscription, canAccess, subscription, trialEndsAt, loading: subLoading, refetch } = useSubscription()
  const { calls, loading: callsLoading } = useCallLogs()
  const { startCheckout, loading: checkoutLoading } = useCheckout()
  const searchParams = useSearchParams()

  const isTrial = !hasActiveSubscription && canAccess
  const planType = subscription?.plan_type ?? null
  const billingCycle = subscription?.billing_cycle ?? null
  const planLabel = getPlanLabel(planType, isTrial)
  const minutesAllowed = isTrial ? TRIAL_MINUTES : getPlanMinutes(planType)
  const nextPlan = getUpgradeSuggestion(planType, isTrial)

  /* Detect successful Stripe payment return */
  const justPaid = searchParams.get("session_id") && !subLoading

  /* ── Usage calculation ── */
  const minutesUsed = useMemo(() => {
    if (isTrial) {
      /* Trial: all-time total */
      return calls.reduce((sum, c) => sum + (c.durationSeconds ?? 0), 0) / 60
    }
    /* Paid: minutes since billing period start */
    const periodStart = subscription?.current_period_start
      ? new Date(subscription.current_period_start)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    return calls
      .filter((c) => new Date(c.createdAt) >= periodStart)
      .reduce((sum, c) => sum + (c.durationSeconds ?? 0), 0) / 60
  }, [calls, isTrial, subscription])

  const isAtLimit = minutesUsed >= minutesAllowed
  const showUpgradePrompt = isAtLimit || isTrial

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#0A0A0A] dark:via-black dark:to-[#0A0A0A] p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-8 pb-16">

          {/* ── Header ── */}
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent">
              Subscription
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-400">
              Manage your plan and monitor your usage
            </p>
          </div>

          {/* ── Payment success banner ── */}
          {justPaid && (
            <div className="flex items-center gap-3 rounded-2xl border border-[#84CC16]/30 bg-[#84CC16]/10 px-5 py-4">
              <CheckCircle2 className="h-5 w-5 text-[#84CC16] shrink-0" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">Payment successful!</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Your subscription has been activated. It may take a moment to reflect.</p>
              </div>
            </div>
          )}

          {/* ── Current Plan Card ── */}
          <div className={`relative rounded-2xl border-2 p-6 md:p-8 transition-all ${
            hasActiveSubscription
              ? "border-[#84CC16]/40 bg-gradient-to-br from-[#84CC16]/8 via-[#84CC16]/4 to-transparent"
              : isTrial
              ? "border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent"
              : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5"
          }`}>

            {subLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-6 w-44 bg-gray-200 dark:bg-white/10 rounded-lg" />
                <div className="h-4 w-32 bg-gray-200 dark:bg-white/10 rounded" />
                <div className="h-3 w-full bg-gray-200 dark:bg-white/10 rounded-full mt-6" />
              </div>
            ) : (
              <>
                {/* Plan header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {hasActiveSubscription ? (
                        <Badge className="bg-[#84CC16]/15 text-[#84CC16] border border-[#84CC16]/30 font-semibold text-xs">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#84CC16] animate-pulse mr-1.5 inline-block" />
                          Active
                        </Badge>
                      ) : isTrial ? (
                        <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Free Trial
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 font-semibold text-xs">
                          No Active Plan
                        </Badge>
                      )}
                      {billingCycle && (
                        <Badge variant="outline" className="text-xs font-medium border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                          {billingCycle === "yearly" ? "Annual billing" : "Monthly billing"}
                        </Badge>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{planLabel}</h2>
                    {isTrial && trialEndsAt && (
                      <p className="text-sm text-amber-400 font-medium mt-1">
                        Trial ends {new Date(trialEndsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                    {hasActiveSubscription && subscription?.current_period_end && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Renews {new Date(subscription.current_period_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2">
                      <Clock className="h-4 w-4 text-[#84CC16]" />
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{minutesAllowed} min</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{isTrial ? "total" : "/mo"}</span>
                    </div>
                  </div>
                </div>

                {/* Usage bar */}
                <div className="p-4 md:p-5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-4 w-4 text-[#84CC16]" />
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      Minutes usage
                    </span>
                    {isTrial && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">(entire trial period)</span>
                    )}
                    {!isTrial && subscription?.current_period_start && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        (since {new Date(subscription.current_period_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })})
                      </span>
                    )}
                  </div>
                  {callsLoading ? (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-4 w-52 bg-gray-200 dark:bg-white/10 rounded" />
                      <div className="h-3 w-full bg-gray-200 dark:bg-white/10 rounded-full" />
                    </div>
                  ) : (
                    <UsageBar used={minutesUsed} total={minutesAllowed} isTrial={isTrial} />
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── Upgrade Prompt ── */}
          {!subLoading && showUpgradePrompt && nextPlan && (
            <div className="relative overflow-hidden rounded-2xl border-2 border-[#84CC16]/50 bg-gradient-to-br from-[#84CC16]/12 via-[#84CC16]/5 to-transparent p-6 md:p-8">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#84CC16]/15 rounded-full blur-3xl pointer-events-none" />
              <div className="relative">
                <div className="flex items-start gap-3 mb-5">
                  <div className="p-2.5 rounded-xl bg-[#84CC16]/20 shrink-0">
                    <Zap className="h-5 w-5 text-[#84CC16]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {isAtLimit
                        ? isTrial
                          ? "Trial minutes used up — upgrade to continue"
                          : "Monthly limit reached — upgrade for more"
                        : "Unlock more with a full subscription"}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      {isTrial
                        ? "Subscribe to keep your AI receptionist answering calls 24/7."
                        : `Get ${nextPlan.minutesIncluded} minutes/month with the ${nextPlan.label}.`}
                    </p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{nextPlan.label}</p>
                    <p className="text-2xl font-extrabold text-gray-900 dark:text-white">${nextPlan.monthlyPrice}<span className="text-sm font-normal text-gray-500 dark:text-gray-400">/mo</span></p>
                    <p className="text-xs text-[#84CC16] font-semibold mt-1">{nextPlan.minutesIncluded} min/mo · {nextPlan.callRange}</p>
                  </div>
                  <div className="flex flex-col gap-2.5 justify-center">
                    <Button
                      onClick={() => startCheckout("monthly")}
                      disabled={checkoutLoading}
                      className="bg-[#84CC16] hover:bg-[#65A30D] text-black font-bold h-11 rounded-xl shadow-lg shadow-[#84CC16]/25 hover:shadow-[#84CC16]/40 transition-all"
                    >
                      {checkoutLoading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading…</>
                      ) : (
                        <><CreditCard className="mr-2 h-4 w-4" />Subscribe Monthly</>
                      )}
                    </Button>
                    <Button
                      onClick={() => startCheckout("yearly")}
                      disabled={checkoutLoading}
                      variant="outline"
                      className="border-[#84CC16]/40 text-[#84CC16] hover:bg-[#84CC16]/10 font-semibold h-10 rounded-xl transition-all"
                    >
                      Pay Yearly · Save 40%
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── All Plans ── */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">All plans</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {PLANS.map((plan) => {
                const isCurrent = !isTrial && planType &&
                  (planType.toLowerCase() === plan.id ||
                   (planType.toLowerCase() === "basic" && plan.id === "starter"))
                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-2xl border-2 p-5 transition-all duration-300 ${
                      isCurrent
                        ? "border-[#84CC16] bg-[#84CC16]/5 shadow-lg shadow-[#84CC16]/10"
                        : plan.highlight
                        ? "border-[#84CC16]/30 bg-white dark:bg-white/5 hover:border-[#84CC16]/60"
                        : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-gray-300 dark:hover:border-white/20"
                    }`}
                  >
                    {isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="rounded-full bg-[#84CC16] px-3 py-0.5 text-xs font-bold text-black shadow">Current plan</span>
                      </div>
                    )}
                    {!isCurrent && plan.highlight && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="rounded-full bg-[#84CC16]/70 px-3 py-0.5 text-xs font-bold text-black shadow">Most popular</span>
                      </div>
                    )}

                    <div className="mb-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider mb-2 ${plan.badgeColor}`}>
                        {plan.badge}
                      </span>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">{plan.label}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{plan.tagline}</p>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-extrabold text-gray-900 dark:text-white">${plan.monthlyPrice}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">/mo</span>
                      </div>
                      <p className={`text-xs font-semibold mt-1 ${plan.accentColor}`}>
                        {plan.minutesIncluded} min/mo · {plan.callRange}
                      </p>
                    </div>

                    <ul className="space-y-1.5 flex-1 mb-4">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className={`h-3.5 w-3.5 ${plan.checkColor} shrink-0 mt-0.5`} />
                          <span className="text-xs text-gray-600 dark:text-gray-400">{f}</span>
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      <div className="h-9 flex items-center justify-center rounded-xl border border-[#84CC16]/30 bg-[#84CC16]/10 text-xs font-bold text-[#84CC16]">
                        Your current plan
                      </div>
                    ) : (
                      <Button
                        onClick={() => startCheckout("monthly")}
                        disabled={checkoutLoading || subLoading}
                        size="sm"
                        className={`h-9 rounded-xl font-semibold text-xs ${
                          plan.highlight
                            ? "bg-[#84CC16] hover:bg-[#65A30D] text-black shadow-md shadow-[#84CC16]/20"
                            : "bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-900 dark:text-white"
                        }`}
                      >
                        {checkoutLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : hasActiveSubscription ? "Switch plan" : "Get started"}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Trust strip ── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Star, value: "7-day", label: "Free trial" },
              { icon: Check, value: "No card", label: "To start" },
              { icon: Zap, value: "Cancel", label: "Anytime" },
            ].map(({ icon: Icon, value, label }) => (
              <div key={value} className="py-5 px-4 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-center">
                <p className="font-bold text-lg text-[#84CC16]">{value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
      <Toaster />
    </>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-[#0A0A0A] dark:via-black dark:to-[#0A0A0A] p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-10 w-48 bg-gray-200 dark:bg-white/10 animate-pulse rounded-xl" />
          <div className="h-48 w-full bg-gray-200 dark:bg-white/10 animate-pulse rounded-2xl" />
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-64 bg-gray-200 dark:bg-white/10 animate-pulse rounded-2xl" />)}
          </div>
        </div>
      </div>
    }>
      <PricingContent />
    </Suspense>
  )
}
