"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { PlanSelectionDialog } from "@/components/pricing/plan-selection-dialog";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPricing = searchParams.get("from") === "pricing";
  const checkoutCancelled = searchParams.get("checkout") === "cancelled";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    organisation_name: "",
  });

  useEffect(() => {
    if (checkoutCancelled) {
      setShowPlanDialog(true);
      toast({
        title: "Checkout cancelled",
        description: "Choose a plan to continue activating your account.",
      });
    }
  }, [checkoutCancelled]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            full_name: form.full_name.trim(),
            phone: form.phone.trim() || undefined,
            organisation_name: form.organisation_name.trim(),
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        toast({
          title: "Sign up failed",
          description: signUpError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError("User not created. Please try again.");
        toast({
          title: "Sign up failed",
          description: "User not created. Please try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (authData.session) {
        const res = await fetch("/api/auth/complete-signup", { method: "POST" });
        const completeData = await res.json();
        if (!res.ok) {
          console.error("Complete signup error:", completeData);
          setError(completeData.error || "Profile setup failed. You can try logging in.");
          toast({
            title: "Account created",
            description: "Profile setup had an issue. Try logging in.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        toast({
          title: "Account created",
          description: "Choose a plan to activate your subscription.",
        });
        setShowPlanDialog(true);
        setLoading(false);
      } else {
        setError("");
        toast({
          title: "Check your email",
          description:
            "We sent you a confirmation link. Click it to activate your account, then log in.",
        });
        router.push("/login");
        router.refresh();
      }
    } catch (err) {
      console.error("Signup error:", err);
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md shadow-xl border-2 border-black/10 dark:border-white/10">
          <CardHeader className="text-center space-y-1">
            <CardTitle className="text-2xl font-bold">
              {fromPricing ? "Create your account" : "Get started with CallTechAI"}
            </CardTitle>
            <CardDescription>
              {fromPricing
                ? "Sign up, then choose a plan to activate your AI receptionist."
                : "Create your account, then pick a subscription plan."}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {error}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name *</Label>
                <Input
                  id="full_name"
                  placeholder="Jane Smith"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  required
                  disabled={loading}
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Work email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jane@company.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  minLength={6}
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 234 567 8900"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  disabled={loading}
                  autoComplete="tel"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organisation_name">Organisation name *</Label>
                <Input
                  id="organisation_name"
                  placeholder="Acme Inc."
                  value={form.organisation_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, organisation_name: e.target.value }))
                  }
                  required
                  disabled={loading}
                  autoComplete="organization"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full bg-lime-500 hover:bg-lime-600 text-black font-semibold"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-medium text-lime-600 dark:text-lime-400 hover:underline"
                >
                  Log in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>

      <PlanSelectionDialog open={showPlanDialog} dismissible={false} />
    </>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-lime-500" />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
