"use client";

import type React from "react";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
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
import { ModeToggle } from "@/components/mode-toggle";
import {
  Home,
  Bot,
  MessageSquare,
  Phone,
  Mic,
  FileAudio,
  CreditCard,
  Loader2,
  CalendarDays,
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
import { BarChart2 } from "lucide-react";

function DemoLayoutContent({
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
  const { loading: subscriptionLoading, refetch } = useSubscription();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

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
        router.replace('/demo');
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
            router.replace('/demo');
          } else {
            console.error('Payment verification failed:', responseData);
            // Still refetch in case webhook updated the subscription
            await refetch();
            // Clear the session_id from URL even on failure
            router.replace('/demo');
          }
        } catch (error) {
          console.error('Error verifying payment in layout:', error);
          // Still refetch in case webhook updated the subscription
          await refetch();
          // Clear the session_id from URL even on error
          router.replace('/demo');
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

  // Voice demo never blocks on subscription: no paywall here.
  // Subscription/trial gating is only in dashboard layout; this route is for quick testing.

  return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <Sidebar className="w-56">
            <SidebarHeader className="flex flex-col items-center justify-center px-1 py-4">
              <div className="flex items-center gap-1 mb-4">
                <Image
                  src="/Calltechai-logo-svg.svg"
                  alt="CallTechAI Logo"
                  width={54}
                  height={54}
                  className="shrink-0"
                />
                 <span className="text-xl font-bold text-white">
                  CallTech<span className="text-[#84CC16]">AI</span>
                </span>
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
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/dashboard/analytics"}
                  >
                    <Link href="/dashboard/analytics">
                      <BarChart2 />
                      <span>Analytics</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/dashboard/bookings"}
                  >
                    <Link href="/dashboard/bookings">
                      <CalendarDays />
                      <span>Bookings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/demo"}>
                    <Link href="/demo">
                      <Mic />
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
                    <button type="button" onClick={handleLogout}>
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
            </header>
            <main className="flex-1 w-full p-6">{children}</main>
          </div>
        </div>
      </SidebarProvider>
  );
}

export default function DemoLayout({
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
      <DemoLayoutContent>{children}</DemoLayoutContent>
    </Suspense>
  );
}
