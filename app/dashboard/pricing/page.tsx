"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { PLAN_FEATURES } from "@/lib/stripe";
import { useSubscription } from "@/hooks/use-subscription";

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState(false);
  const { hasActiveSubscription, subscription } = useSubscription();

  const handleSubscribe = async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          billingCycle: isYearly ? "yearly" : "monthly",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Subscription error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to start subscription process",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const monthlyPrice = 99;
  const yearlyPrice = 999;
  const yearlyMonthlyEquivalent = Math.round(yearlyPrice / 12);
  const savings = monthlyPrice * 12 - yearlyPrice;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Choose Your Plan</h1>
        <p className="text-muted-foreground mt-2">
          Get started with CallTechAI's powerful voice assistant platform
        </p>
      </div>

      <div className="flex items-center justify-center space-x-4">
        <Label
          htmlFor="yearly-toggle"
          className={!isYearly ? "font-semibold" : ""}
        >
          Monthly
        </Label>
        <Switch
          id="yearly-toggle"
          checked={isYearly}
          onCheckedChange={setIsYearly}
        />
        <Label
          htmlFor="yearly-toggle"
          className={isYearly ? "font-semibold" : ""}
        >
          Yearly
        </Label>
        {isYearly && (
          <Badge
            variant="outline"
            className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
          >
            Save ${savings}
          </Badge>
        )}
      </div>

      <div className="flex justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Basic Plan</CardTitle>
            <CardDescription>
              Perfect for getting started with AI voice assistance
            </CardDescription>
            <div className="mt-4">
              <div className="text-4xl font-bold">
                ${isYearly ? yearlyMonthlyEquivalent : monthlyPrice}
                <span className="text-lg font-normal text-muted-foreground">
                  /month
                </span>
              </div>
              {isYearly && (
                <div className="text-sm text-muted-foreground mt-1">
                  Billed annually at ${yearlyPrice}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {PLAN_FEATURES.basic.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            {hasActiveSubscription ? (
              <div className="w-full text-center space-y-2">
                <Badge
                  variant="outline"
                  className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                >
                  Current Plan
                </Badge>
                {subscription && (
                  <p className="text-sm text-muted-foreground">
                    {subscription.billing_cycle === "yearly"
                      ? "Annual"
                      : "Monthly"}{" "}
                    billing
                    {subscription.current_period_end && (
                      <>
                        {" "}
                        • Renews{" "}
                        {new Date(
                          subscription.current_period_end,
                        ).toLocaleDateString()}
                      </>
                    )}
                  </p>
                )}
              </div>
            ) : (
              <Button
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full bg-rose-500 hover:bg-rose-600"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Get Started
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Future plans - commented out */}
      {/*
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="opacity-50">
          <CardHeader className="text-center">
            <CardTitle>Professional</CardTitle>
            <CardDescription>For growing businesses</CardDescription>
            <div className="text-3xl font-bold mt-4">$199/month</div>
          </CardHeader>
          <CardFooter>
            <Button disabled className="w-full">Coming Soon</Button>
          </CardFooter>
        </Card>

        <Card className="opacity-50">
          <CardHeader className="text-center">
            <CardTitle>Enterprise</CardTitle>
            <CardDescription>For large organizations</CardDescription>
            <div className="text-3xl font-bold mt-4">Custom</div>
          </CardHeader>
          <CardFooter>
            <Button disabled className="w-full">Coming Soon</Button>
          </CardFooter>
        </Card>
      </div>
      */}
    </div>
  );
}
