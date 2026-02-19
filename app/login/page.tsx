"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message || "Invalid email or password");
        toast({
          title: "Login failed",
          description: signInError.message || "Invalid email or password",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (data.session) {
        // Ensure profile exists (e.g. after email confirmation or first login)
        await fetch("/api/auth/complete-signup", { method: "POST" });

        toast({
          title: "Welcome back",
          description: "Redirecting to dashboard...",
        });
        router.push("/dashboard");
        router.refresh();
      } else {
        setError("No session returned. Please try again.");
        toast({
          title: "Login failed",
          description: "No session returned. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Login error:", err);
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md shadow-xl border-2 border-black/10 dark:border-white/10">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-2xl font-bold">Log in</CardTitle>
          <CardDescription>
            Sign in to your CallTechAI account
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
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
              Log in
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-medium text-lime-600 dark:text-lime-400 hover:underline">
                Start free trial
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
