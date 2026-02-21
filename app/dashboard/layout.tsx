"use client";

import type React from "react";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModeToggle } from "@/components/mode-toggle";
import {
  Home,
  Settings,
  MessageSquare,
  Zap,
  User2,
  FileAudio,
  Phone,
  CreditCard,
  Loader2,
  Bot,
  Clock,
} from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function UserMenu() {
  const router = useRouter();
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-lime-500/20 text-lime-600 dark:text-lime-400 text-sm">U</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  // Initialize isVerifyingPayment to true if session_id exists (synchronous check)
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.has('session_id');
    }
    return false;
  });
  const [verificationAttempted, setVerificationAttempted] = useState(false);
  const [paymentJustCompleted, setPaymentJustCompleted] = useState(false);
  const [overrideSubscriptionCheck, setOverrideSubscriptionCheck] = useState(false);
  const {
    canAccess,
    hasActiveSubscription,
    trialEnded,
    subscriptionExpired,
    subscription,
    loading: subscriptionLoading,
    refetch,
  } = useSubscription();

  // Prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // Clear override flag when subscription becomes active
  useEffect(() => {
    if (hasActiveSubscription && overrideSubscriptionCheck) {
      setOverrideSubscriptionCheck(false);
      setPaymentJustCompleted(false);
    }
  }, [hasActiveSubscription, overrideSubscriptionCheck]);

  // Check if we're in the middle of payment verification
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    // If we have a session_id, override subscription check to allow access
    if (sessionId) {
      setOverrideSubscriptionCheck(true);
    }
    
    // Only run verification once per session
    if (sessionId && !verificationAttempted) {
      setVerificationAttempted(true);
      setIsVerifyingPayment(true);
      // Immediately refetch subscription status when we detect a session_id
      refetch();
      
      // Set a maximum timeout for verification
      const maxTimeout = setTimeout(() => {
        console.log('Payment verification timeout, proceeding anyway');
        setIsVerifyingPayment(false);
        // Clear the session_id from URL on timeout
        router.replace('/dashboard');
      }, 15000); // 15 second timeout
      
      // Verify payment and update subscription
      const verifyPayment = async () => {
        try {
          console.log('Starting payment verification for session:', sessionId);
          
          const response = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId }),
          });

          let responseData;
          try {
            responseData = await response.json();
          } catch (jsonError) {
            console.error('JSON parse error:', jsonError);
            // If JSON parsing fails, try to get text response
            const textResponse = await response.text();
            console.error('Response text:', textResponse);
            throw new Error('Invalid JSON response from server');
          }

          console.log('Payment verification response:', responseData);

          if (response.ok) {
            console.log('Payment verified successfully');
            // Payment verified successfully, refetch subscription
            await refetch();
            
            // Poll for subscription status to become active (with max 10 attempts)
            let attempts = 0;
            let subscriptionActive = false;
            while (attempts < 10 && !subscriptionActive) {
              await new Promise(resolve => setTimeout(resolve, 500));
              await refetch();
              // Check if subscription is now active by fetching fresh status
              const statusResponse = await fetch('/api/subscription-status');
              const statusData = await statusResponse.json();
              if (statusData.hasActiveSubscription) {
                subscriptionActive = true;
                console.log('Subscription confirmed active');
                // Mark that payment just completed to allow access
                setPaymentJustCompleted(true);
                // Clear override since subscription is now confirmed active
                setOverrideSubscriptionCheck(false);
              }
              attempts++;
            }
            
            // Only clear the session_id from URL after confirming subscription is active
            // This ensures we don't block access prematurely
            if (subscriptionActive) {
              // Wait a bit more to ensure state has updated
              await new Promise(resolve => setTimeout(resolve, 1000));
              router.replace('/dashboard');
            } else {
              // If still not active after polling, clear session_id anyway but keep access
              console.warn('Subscription not yet active after polling, but allowing access');
              setPaymentJustCompleted(true);
              router.replace('/dashboard');
            }
          } else {
            console.error('Payment verification failed:', responseData);
            // Still refetch in case webhook updated the subscription
            await refetch();
            // Wait a bit and refetch again
            await new Promise(resolve => setTimeout(resolve, 1000));
            await refetch();
            // Check if subscription became active via webhook
            const statusResponse = await fetch('/api/subscription-status');
            const statusData = await statusResponse.json();
            if (statusData.hasActiveSubscription) {
              setPaymentJustCompleted(true);
              setOverrideSubscriptionCheck(false);
            }
            // Clear the session_id from URL even on failure
            router.replace('/dashboard');
          }
        } catch (error) {
          console.error('Error verifying payment in layout:', error);
          // Still refetch in case webhook updated the subscription
          await refetch();
          // Wait a bit and refetch again
          await new Promise(resolve => setTimeout(resolve, 1000));
          await refetch();
          // Check if subscription became active via webhook
          const statusResponse = await fetch('/api/subscription-status');
          const statusData = await statusResponse.json();
          if (statusData.hasActiveSubscription) {
            setPaymentJustCompleted(true);
            setOverrideSubscriptionCheck(false);
          }
          // Clear the session_id from URL even on error
          router.replace('/dashboard');
        } finally {
          clearTimeout(maxTimeout);
          // Add a small delay to ensure subscription status is updated before hiding loading
          setTimeout(() => {
            setIsVerifyingPayment(false);
          }, 500);
        }
      };

      // Add a small delay before starting verification to ensure Stripe has processed
      setTimeout(verifyPayment, 1000);
    }
  }, [searchParams, refetch, verificationAttempted]);

  if (!mounted) {
    return null;
  }

  // Show loading while checking subscription or verifying payment
  if (subscriptionLoading || isVerifyingPayment) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>{isVerifyingPayment ? "Verifying payment..." : "Loading..."}</p>
          {isVerifyingPayment && (
            <p className="text-sm text-muted-foreground mt-2">
              This may take a few moments...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Only block access when trial AND subscription have ended (not on pricing page or demo)
  const hasSessionId = searchParams.get("session_id");
  const showPaymentPopup =
    !canAccess &&
    pathname !== "/dashboard/pricing" &&
    pathname !== "/demo" &&
    !pathname.startsWith("/demo/") &&
    !isVerifyingPayment &&
    !hasSessionId &&
    !paymentJustCompleted &&
    !overrideSubscriptionCheck;

  return (
      <>
        {/* Payment popup: only after trial AND subscription have ended */}
        <Dialog open={showPaymentPopup} onOpenChange={() => {}}>
          <DialogContent
            className="sm:max-w-md"
            onPointerDownOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>
                {subscriptionExpired
                  ? "Subscription ended — Renew to continue"
                  : "Trial ended — Subscribe to continue"}
              </DialogTitle>
              <DialogDescription>
                {subscriptionExpired ? (
                  <>
                    Your{" "}
                    {subscription?.billing_cycle === "yearly"
                      ? "annual"
                      : "monthly"}{" "}
                    subscription has ended. Renew to keep using CallTechAI.
                  </>
                ) : (
                  <>
                    Your 7-day free trial has ended. Choose a monthly or annual
                    plan to keep using CallTechAI.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button asChild className="w-full sm:w-auto bg-lime-500 hover:bg-lime-600 text-black font-semibold">
                <Link href="/dashboard/pricing">
                  {subscriptionExpired ? "Renew subscription" : "View pricing (monthly or annual)"}
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full sm:w-auto">
                <Link href="/">Leave dashboard</Link>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <Sidebar className="w-56">
            <SidebarHeader className="flex flex-col items-center justify-center px-1 py-4">
              <div className="flex items-center gap-2 mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6 text-lime-500"
                >
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
                <span className="text-xl font-bold bg-gradient-to-r from-lime-500 to-lime-600 bg-clip-text text-transparent">CallTechAI</span>
              </div>
              <SidebarSeparator />
            </SidebarHeader>
            <SidebarContent className="px-1">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/dashboard"}
                  >
                    <Link href="/dashboard">
                      <Home />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {/* <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/dashboard/customization"}
                  >
                    <Link href="/dashboard/customization" className="flex items-center gap-2 w-full">
                      <Settings />
                      <span>Customization</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400">
                        Upcoming
                      </Badge>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem> */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/dashboard/assistants"}
                  >
                    <Link href="/dashboard/assistants">
                      <Bot />
                      <span>Assistants</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/dashboard/intents"}
                  >
                    <Link href="/dashboard/intents">
                      <MessageSquare />
                      <span>Intents</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/dashboard/phone-numbers"}
                  >
                    <Link href="/dashboard/phone-numbers">
                      <Phone />
                      <span>Phone Numbers</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/dashboard/recordings"}
                  >
                    <Link href="/dashboard/recordings">
                      <FileAudio />
                      <span>Call Recordings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {/* <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/dashboard/analytics"}
                  >
                    <Link href="/dashboard/analytics" className="flex items-center gap-2 w-full">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M3 3v18h18" />
                        <path d="M18 17V9" />
                        <path d="M13 17V5" />
                        <path d="M8 17v-3" />
                      </svg>
                      <span>Analytics</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400">
                        Upcoming
                      </Badge>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem> */}
                {/* <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/dashboard/working-hours"}
                  >
                    <Link href="/dashboard/working-hours">
                      <Clock />
                      <span>Working Hours</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem> */}
                {/* <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/dashboard/advanced"}
                  >
                    <Link href="/dashboard/advanced" className="flex items-center gap-2 w-full">
                      <Zap />
                      <span>Advanced</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400">
                        Upcoming
                      </Badge>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem> */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/demo"}>
                    <Link href="/demo">
                      <Phone />
                      <span>Voice Demo</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="px-1 py-4">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/dashboard/pricing"}
                  >
                    <Link href="/dashboard/pricing">
                      <CreditCard />
                      <span>Subscription</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {/* <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/dashboard/profile"}
                  >
                    <Link href="/dashboard/profile">
                      <User2 />
                      <span>Profile</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem> */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <button type="button" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/"; }}>
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          </Sidebar>
          <div className="flex-1 flex flex-col">
            <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
              <SidebarTrigger />
              <div className="flex-1" />
              <ModeToggle />
              <UserMenu />
            </header>
            <main className="flex-1 w-full p-6">{children}</main>
          </div>
        </div>
      </SidebarProvider>
      </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    }>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}
