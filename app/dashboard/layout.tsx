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
} from "lucide-react";
import { SignedIn, SignOutButton, UserButton } from "@clerk/nextjs";
import { useSubscription } from "@/hooks/use-subscription";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [verificationAttempted, setVerificationAttempted] = useState(false);
  const { hasActiveSubscription, loading: subscriptionLoading, refetch } =
    useSubscription();

  // Prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if we're in the middle of payment verification
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    // Only run verification once per session
    if (sessionId && !verificationAttempted) {
      setVerificationAttempted(true);
      setIsVerifyingPayment(true);
      
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
            // Clear the session_id from URL to prevent re-running
            router.replace('/dashboard');
          } else {
            console.error('Payment verification failed:', responseData);
            // Still refetch in case webhook updated the subscription
            await refetch();
            // Clear the session_id from URL even on failure
            router.replace('/dashboard');
          }
        } catch (error) {
          console.error('Error verifying payment in layout:', error);
          // Still refetch in case webhook updated the subscription
          await refetch();
          // Clear the session_id from URL even on error
          router.replace('/dashboard');
        } finally {
          clearTimeout(maxTimeout);
          // Add a small delay to ensure subscription status is updated
          setTimeout(() => {
            setIsVerifyingPayment(false);
          }, 2000);
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

  // If no active subscription and not on pricing page, show pricing
  if (!hasActiveSubscription && pathname !== "/dashboard/pricing") {
    return (
      <SignedIn>
        <div className="min-h-screen bg-background">
          <header className="border-b">
            <div className="flex h-16 items-center gap-4 px-6">
              <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6 text-rose-500"
                >
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
                <span className="text-xl font-bold">CallTechAI</span>
              </Link>
              <div className="flex-1" />
              <ModeToggle />
              <UserButton />
            </div>
          </header>
          <main className="container mx-auto py-8">
            <Card className="max-w-md mx-auto">
              <CardHeader className="text-center">
                <CardTitle>Subscription Required</CardTitle>
                <CardDescription>
                  Please subscribe to access the dashboard features
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button asChild className="bg-rose-500 hover:bg-rose-600">
                  <Link href="/dashboard/pricing">View Pricing Plans</Link>
                </Button>
              </CardContent>
            </Card>
          </main>
        </div>
      </SignedIn>
    );
  }

  // Show full dashboard for subscribed users
  return (
    <SignedIn>
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
                  className="h-6 w-6 text-rose-500"
                >
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
                <span className="text-xl font-bold">CallTechAI</span>
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
                <SidebarMenuItem>
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
                    isActive={pathname === "/dashboard/recordings"}
                  >
                    <Link href="/dashboard/recordings">
                      <FileAudio />
                      <span>Call Recordings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
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
                </SidebarMenuItem>
                <SidebarMenuItem>
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
                </SidebarMenuItem>
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
                  <SignOutButton>
                    <SidebarMenuButton asChild>
                      <button>
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
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16,17 21,12 16,7" />
                          <line x1="21" x2="9" y1="12" y2="12" />
                        </svg>
                        <span>Logout</span>
                      </button>
                    </SidebarMenuButton>
                  </SignOutButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          </Sidebar>
          <div className="flex-1 flex flex-col">
            <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
              <SidebarTrigger />
              <div className="flex-1" />
              <ModeToggle />
              <UserButton />
            </header>
            <main className="flex-1 w-full p-6">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </SignedIn>
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
