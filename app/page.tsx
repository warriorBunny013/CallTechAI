"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import {
  Check, Play, Calendar, MessageSquare, Bot, BarChart3, Globe, ArrowRight,
  PhoneCall, Zap, BrainCircuit, TrendingUp, Menu, X,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LogOut } from "lucide-react"

export default function LandingPage() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user ?? null)
        setAuthLoading(false)
      })
      .catch(() => setAuthLoading(false))
  }, [])

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    setUser(null)
    router.push("/")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-black/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-lime-500 shrink-0"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
            <span className="text-xl font-bold bg-gradient-to-r from-lime-500 to-lime-600 bg-clip-text text-transparent">
              CallTechAI
            </span>
          </div>

          <nav className="hidden md:flex gap-6">
            <Link href="#features" className="text-sm font-medium hover:underline">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium hover:underline">
              How it Works
            </Link>
            <Link href="#pricing" className="text-sm font-medium hover:underline">
              Pricing
            </Link>
            <Link href="#faq" className="text-sm font-medium hover:underline">
              FAQ
            </Link>
          </nav>

          <div className="flex items-center gap-2 md:gap-4">
            {!authLoading && !user && (
              <>
                <Button variant="ghost" size="sm" className="hidden md:inline-flex" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button
                  size="sm"
                  className="bg-lime-500 hover:bg-lime-400 text-black font-bold shadow-[0_0_16px_rgba(132,204,22,0.45)] hover:shadow-[0_0_28px_rgba(132,204,22,0.7)] transition-all duration-300"
                  asChild
                >
                  <Link href="/signup">Get Started</Link>
                </Button>
              </>
            )}
            {!authLoading && user && (
              <>
                <Button
                  size="sm"
                  className="bg-lime-500 hover:bg-lime-400 text-black font-bold shadow-[0_0_16px_rgba(132,204,22,0.45)] hover:shadow-[0_0_28px_rgba(132,204,22,0.7)] transition-all duration-300"
                  asChild
                >
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full hidden md:inline-flex">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-lime-500/20 text-lime-600 dark:text-lime-400 text-sm">
                          {(user.email?.[0] ?? "U").toUpperCase()}
                        </AvatarFallback>
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
              </>
            )}
            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-black/10 dark:border-white/10 bg-background/98 backdrop-blur px-4 py-4 flex flex-col gap-1">
            {[
              { href: "#features", label: "Features" },
              { href: "#how-it-works", label: "How it Works" },
              { href: "#pricing", label: "Pricing" },
              { href: "#faq", label: "FAQ" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium py-2.5 px-3 rounded-lg hover:bg-lime-500/10 hover:text-lime-600 dark:hover:text-lime-400 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            {!authLoading && !user && (
              <Link
                href="/login"
                className="text-sm font-medium py-2.5 px-3 rounded-lg hover:bg-lime-500/10 hover:text-lime-600 dark:hover:text-lime-400 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Log in
              </Link>
            )}
            {!authLoading && user && (
              <button
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="text-sm font-medium py-2.5 px-3 rounded-lg hover:bg-red-500/10 hover:text-red-600 transition-colors text-left flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            )}
          </div>
        )}
      </header>
      <main className="flex-1">
        <section className="w-full py-14 md:py-32 lg:py-40 bg-gradient-to-br from-lime-50 via-white to-lime-50/50 dark:from-black dark:via-gray-950 dark:to-black relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.05] bg-[size:20px_20px]" />
          <div className="container px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center justify-center space-y-7 text-center">
              <Badge className="bg-lime-100 text-lime-700 dark:bg-lime-950/60 dark:text-lime-300 border-lime-200 dark:border-lime-800 px-4 py-1.5 text-sm font-semibold rounded-full">
                AI-Powered Voice Receptionist
              </Badge>

              <div className="space-y-5 max-w-[900px]">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl bg-gradient-to-b from-black via-gray-900 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                  The AI Voice Assistant That Sounds Human
                </h1>
                <p className="mx-auto max-w-[680px] text-gray-600 dark:text-gray-300 text-base sm:text-lg leading-relaxed">
                  24/7 AI voice assistant that answers calls, handles customer inquiries, and notifies you instantly — all while sounding completely human.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row pt-2 w-full sm:w-auto">
                {!authLoading && !user && (
                  <Button
                    size="lg"
                    className="bg-lime-500 hover:bg-lime-400 text-black font-bold px-6 py-5 sm:px-9 sm:py-6 text-base sm:text-lg shadow-[0_0_30px_rgba(132,204,22,0.55)] hover:shadow-[0_0_45px_rgba(132,204,22,0.8)] hover:scale-105 transition-all duration-300 group rounded-xl w-full sm:w-auto"
                    asChild
                  >
                    <Link href="/signup">
                      Get Started — Free
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                )}
                {!authLoading && user && (
                  <Button
                    size="lg"
                    className="bg-lime-500 hover:bg-lime-400 text-black font-bold px-6 py-5 sm:px-9 sm:py-6 text-base sm:text-lg shadow-[0_0_30px_rgba(132,204,22,0.55)] hover:shadow-[0_0_45px_rgba(132,204,22,0.8)] hover:scale-105 transition-all duration-300 rounded-xl w-full sm:w-auto"
                    asChild
                  >
                    <Link href="/dashboard">Go to Dashboard</Link>
                  </Button>
                )}
                <Button
                  size="lg"
                  variant="outline"
                  className="group border-2 border-black/20 dark:border-white/20 hover:border-lime-500/50 hover:bg-lime-500/5 dark:hover:bg-lime-500/10 hover:shadow-[0_0_20px_rgba(132,204,22,0.2)] transition-all duration-300 font-semibold px-6 py-5 sm:px-9 sm:py-6 text-base sm:text-lg rounded-xl w-full sm:w-auto"
                  asChild
                >
                  <Link href="https://calendly.com/igorkholin89/30min?month=2026-03">
                    {/* <Play className="mr-2 h-5 w-5 text-lime-500" /> */}
                    Book a Demo
                  </Link>
                </Button>
              </div>

              {/* Stats */}
              {/* <div className="grid grid-cols-3 gap-8 pt-12 max-w-3xl">
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-lime-600 to-lime-700 dark:from-lime-400 dark:to-lime-500 bg-clip-text text-transparent">99.9%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-semibold mt-2">Uptime</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-lime-600 to-lime-700 dark:from-lime-400 dark:to-lime-500 bg-clip-text text-transparent">24/7</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-semibold mt-2">Available</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-lime-600 to-lime-700 dark:from-lime-400 dark:to-lime-500 bg-clip-text text-transparent">70%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-semibold mt-2">Cost Savings</div>
                </div>
              </div> */}
            </div>
          </div>
        </section>

        {/* ── FEATURES ────────────────────────────────────────────────────── */}
        <section id="features" className="w-full py-16 md:py-28 lg:py-36">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-14">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Powerful Features</h2>
              <p className="mx-auto max-w-[680px] text-muted-foreground md:text-xl">
                Everything you need to automate your customer service and grow your business
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {/* Calendar — Coming Soon */}
              <Card className="relative bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-900/30 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl overflow-hidden opacity-80">
                <div className="absolute top-4 right-4">
                  <Badge className="bg-lime-500 text-black border-0 font-bold text-xs">Coming Soon</Badge>
                </div>
                <CardContent className="flex flex-col items-center space-y-4 p-8">
                  <div className="p-4 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-2xl">
                    <Calendar className="h-8 w-8 text-gray-500 dark:text-gray-400" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">Real-Time Appointment Booking</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-center text-sm leading-relaxed">
                    Integrates directly with Google Calendar. The AI books appointments on live calls, syncing everything automatically — no manual work required.
                  </p>
                </CardContent>
              </Card>

              {/* Voice Agents */}
              <Card className="bg-white dark:bg-gray-900 border-2 border-black/10 dark:border-white/10 shadow-lg hover:shadow-2xl hover:-translate-y-2 hover:border-lime-500/40 hover:shadow-lime-500/10 transition-all duration-300 rounded-2xl overflow-hidden">
                <CardContent className="flex flex-col items-center space-y-4 p-8">
                  <div className="p-4 bg-gradient-to-br from-lime-100 to-lime-200 dark:from-lime-900/30 dark:to-lime-800/30 rounded-2xl">
                    <Bot className="h-8 w-8 text-lime-600 dark:text-lime-400" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-bold">Human-Like Voice Agents</h3>
                  <p className="text-muted-foreground text-center text-sm leading-relaxed">
                    Choose from our vast collection of premium AI voice personas with distinct personalities and voices. Natural conversations your customers will genuinely love.
                  </p>
                </CardContent>
              </Card>

              {/* Multilingual */}
              <Card className="bg-white dark:bg-gray-900 border-2 border-black/10 dark:border-white/10 shadow-lg hover:shadow-2xl hover:-translate-y-2 hover:border-lime-500/40 hover:shadow-lime-500/10 transition-all duration-300 rounded-2xl overflow-hidden">
                <CardContent className="flex flex-col items-center space-y-4 p-8">
                  <div className="p-4 bg-gradient-to-br from-lime-100 to-lime-200 dark:from-lime-900/30 dark:to-lime-800/30 rounded-2xl">
                    <Globe className="h-8 w-8 text-lime-600 dark:text-lime-400" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-bold">Multilingual Support</h3>
                  <p className="text-muted-foreground text-center text-sm leading-relaxed">
                    Currently fluent in English &amp; Russian, with more languages rolling out soon. Serve every customer in the language they're most comfortable with.
                  </p>
                </CardContent>
              </Card>

              {/* Analytics */}
              <Card className="bg-white dark:bg-gray-900 border-2 border-black/10 dark:border-white/10 shadow-lg hover:shadow-2xl hover:-translate-y-2 hover:border-lime-500/40 hover:shadow-lime-500/10 transition-all duration-300 rounded-2xl overflow-hidden">
                <CardContent className="flex flex-col items-center space-y-4 p-8">
                  <div className="p-4 bg-gradient-to-br from-lime-100 to-lime-200 dark:from-lime-900/30 dark:to-lime-800/30 rounded-2xl">
                    <BarChart3 className="h-8 w-8 text-lime-600 dark:text-lime-400" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-bold">Advanced Analytics Dashboard</h3>
                  <p className="text-muted-foreground text-center text-sm leading-relaxed">
                    Every call is recorded with an AI-generated summary. Deep-dive into insights, track trends, and continuously improve your customer service.
                  </p>
                </CardContent>
              </Card>

              {/* Intent Management */}
              <Card className="bg-white dark:bg-gray-900 border-2 border-black/10 dark:border-white/10 shadow-lg hover:shadow-2xl hover:-translate-y-2 hover:border-lime-500/40 hover:shadow-lime-500/10 transition-all duration-300 rounded-2xl overflow-hidden">
                <CardContent className="flex flex-col items-center space-y-4 p-8">
                  <div className="p-4 bg-gradient-to-br from-lime-100 to-lime-200 dark:from-lime-900/30 dark:to-lime-800/30 rounded-2xl">
                    <BrainCircuit className="h-8 w-8 text-lime-600 dark:text-lime-400" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-bold">Custom Intent Management</h3>
                  <p className="text-muted-foreground text-center text-sm leading-relaxed">
                    Your central hub for all business information. Add your hours, services, pricing, FAQs, and more — your AI reads it all and answers every call accurately and confidently.
                  </p>
                </CardContent>
              </Card>

              {/* WhatsApp / Telegram — Coming Soon */}
              <Card className="relative bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-900/30 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl overflow-hidden opacity-80">
                <div className="absolute top-4 right-4">
                  <Badge className="bg-lime-500 text-black border-0 font-bold text-xs">Coming Soon</Badge>
                </div>
                <CardContent className="flex flex-col items-center space-y-4 p-8">
                  <div className="p-4 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-2xl">
                    <MessageSquare className="h-8 w-8 text-gray-500 dark:text-gray-400" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">WhatsApp &amp; Telegram Alerts</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-center text-sm leading-relaxed">
                    Every call received and every booking made will instantly send a detailed summary notification to your WhatsApp or Telegram — so you're always in the loop.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
        <section id="how-it-works" className="w-full py-16 md:py-28 lg:py-36 bg-gradient-to-b from-white to-gray-50/80 dark:from-black dark:to-gray-950">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-3 text-center mb-14">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">How It Works</h2>
              <p className="mx-auto max-w-[680px] text-muted-foreground md:text-xl">
                From zero to a live AI receptionist in 5 simple steps
              </p>
            </div>

            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                {
                  icon: <Zap className="h-6 w-6 text-white" />,
                  title: "Sign Up for Your 7-Day Free Trial",
                  desc: "No credit card needed. Create your account and get instant full access to the platform — ready to explore everything from day one.",
                },
                {
                  icon: <PhoneCall className="h-6 w-6 text-white" />,
                  title: "Get Your Dedicated Phone Number",
                  desc: "A local number matching your area code is automatically assigned to your account. No porting required — it's ready to receive calls immediately.",
                },
                {
                  icon: <BrainCircuit className="h-6 w-6 text-white" />,
                  title: "Create Your Custom Intents",
                  desc: "Add your business information: location, opening hours, services, pricing, FAQs, and more. This is the brain your AI uses to answer every call perfectly.",
                },
                {
                  icon: <Bot className="h-6 w-6 text-white" />,
                  title: "Choose Your AI Assistant",
                  desc: "Browse our library of premium AI voice personas. Pick the one that best fits your brand — each has a unique tone, personality, and style that sounds completely natural.",
                },
                {
                  icon: <TrendingUp className="h-6 w-6 text-white" />,
                  title: "Track Performance & Grow",
                  desc: "Listen to recordings, read AI-generated summaries, and monitor live analytics. Understand every call, fine-tune your setup, and watch customer satisfaction grow.",
                },
              ].map((step, i) => (
                <Card
                  key={i}
                  className={`relative bg-white dark:bg-gray-900 border-2 border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-md hover:shadow-xl hover:border-lime-500/40 hover:shadow-lime-500/10 transition-all duration-300 ${i === 4 ? "md:col-span-2 md:max-w-lg md:mx-auto w-full" : ""}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-lime-500 to-lime-600 flex items-center justify-center shadow-[0_0_16px_rgba(132,204,22,0.4)]">
                      {step.icon}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-lime-600 dark:text-lime-400 uppercase tracking-widest">Step {i + 1}</span>
                      </div>
                      <h3 className="text-lg font-bold">{step.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="w-full py-16 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-3">
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl bg-gradient-to-r from-black to-gray-800 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
                  Simple, Transparent Pricing
                </h2>
                <p className="mx-auto max-w-[700px] text-gray-600 md:text-lg dark:text-gray-300">
                  One flat rate. No hidden fees. 7-day free trial included.
                </p>
              </div>

              <div className="grid py-5 grid-cols-1 gap-8 md:grid-cols-2 lg:gap-10 mt-8 max-w-4xl w-full">
                {/* Standard Plan */}
                <Card className="flex flex-col border-2 border-lime-500 shadow-2xl relative rounded-2xl overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 z-10">
                    <div className="py-2 px-4 text-sm font-bold bg-lime-500 text-black w-full text-center shadow-lg">
                      MOST POPULAR
                    </div>
                  </div>
                  <CardHeader className="pt-12 pb-4">
                    <div className="text-3xl mb-2">🚀</div>
                    <CardTitle className="text-2xl font-bold">Standard</CardTitle>
                    <CardDescription className="text-base">For clinics &amp; small businesses</CardDescription>
                    <div className="mt-6">
                      <div className="text-5xl font-extrabold text-black dark:text-white">
                        $99<span className="text-lg font-normal text-gray-500">/month</span>
                      </div>
                      <div className="text-sm text-lime-600 dark:text-lime-400 mt-1 font-semibold">
                        7-day free trial — no credit card required
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-3 text-left">
                      {[
                        "1 phone number",
                        "Generous call minutes included",
                        "AI-generated call summaries",
                        "Standard support (24–48h)",
                        "Intent management",
                        "Advanced analytics dashboard",
                      ].map((f) => (
                        <li key={f} className="flex items-center">
                          <Check className="mr-3 h-5 w-5 text-lime-500 flex-shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300">{f}</span>
                        </li>
                      ))}
                      {[
                        "Appointment booking",
                        "Telegram & WhatsApp integration",
                      ].map((f) => (
                        <li key={f} className="flex items-center gap-3">
                          <Check className="h-5 w-5 text-lime-500 flex-shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300">{f}</span>
                          <Badge className="bg-lime-100 text-lime-700 dark:bg-lime-950/50 dark:text-lime-300 border-lime-200 dark:border-lime-800 text-[10px] px-1.5 py-0.5 font-bold shrink-0">
                            Soon
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full bg-lime-500 hover:bg-lime-600 text-black font-bold shadow-xl hover:shadow-2xl transition-all duration-300 py-6 text-lg"
                      asChild
                    >
                      <Link href="/signup">Get Started — Free Trial</Link>
                    </Button>
                  </CardFooter>
                </Card>

                {/* Custom Plan */}
                <Card className="flex flex-col border-2 border-black/10 dark:border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="text-3xl mb-2">👑</div>
                    <CardTitle className="text-2xl font-bold">Custom</CardTitle>
                    <CardDescription className="text-base">For agencies &amp; multi-location businesses</CardDescription>
                    <div className="mt-6">
                      <div className="text-5xl font-extrabold text-black dark:text-white">
                        Custom
                      </div>
                      <div className="text-sm text-gray-500 mt-1">Tailored pricing for your needs</div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-3 text-left">
                      {[
                        "Multiple assistants",
                        "Multiple phone numbers",
                        "Unlimited minutes",
                        "AI-generated call summaries",
                        "VIP support (1–4h response)",
                        "Intent management",
                        "Advanced analytics dashboard",
                      ].map((f) => (
                        <li key={f} className="flex items-center">
                          <Check className="mr-3 h-5 w-5 text-lime-500 flex-shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300">{f}</span>
                        </li>
                      ))}
                      {[
                        "Appointment booking",
                        "WhatsApp & Telegram alerts",
                      ].map((f) => (
                        <li key={f} className="flex items-center gap-3">
                          <Check className="h-5 w-5 text-lime-500 flex-shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300">{f}</span>
                          <Badge className="bg-lime-100 text-lime-700 dark:bg-lime-950/50 dark:text-lime-300 border-lime-200 dark:border-lime-800 text-[10px] px-1.5 py-0.5 font-bold shrink-0">
                            Soon
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full bg-black hover:bg-gray-900 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black font-bold shadow-lg hover:shadow-xl transition-all duration-300 py-6 text-lg"
                      asChild
                    >
                      <a href="https://calendly.com/igorkholin89/30min?month=2026-03">
                        Book a Demo 
                      </a>
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <section id="faq" className="w-full py-16 md:py-28 lg:py-36 bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-950">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-3 text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Frequently Asked Questions
              </h2>
              <p className="mx-auto max-w-[680px] text-muted-foreground md:text-xl">
                Everything you need to know about CallTechAI
              </p>
            </div>

            <div className="mx-auto max-w-3xl">
              <Accordion type="single" collapsible className="w-full space-y-3">
                {[
                  {
                    q: "How does CallTechAI work?",
                    a: "CallTechAI assigns a dedicated phone number to your business. When a customer calls, our AI voice assistant answers instantly, 24/7 — understanding their questions and responding accurately based on the business information you've configured. Every call is logged, recorded, and summarised automatically.",
                  },
                  {
                    q: "Will customers know they're talking to an AI?",
                    a: "Most won't. Our premium AI voice personas are designed to sound natural and conversational. You choose the personality and voice that fits your brand, and the assistant responds fluidly — no robotic tone, no awkward pauses.",
                  },
                  {
                    q: "Can I customise the voice and what it says?",
                    a: "Yes, fully. Choose from our vast collection of premium AI voice personas with distinct personalities. Then configure your intents — adding your exact business information, services, FAQs, hours, and more. Your AI will reflect your brand perfectly.",
                  },
                  {
                    q: "What languages are currently supported?",
                    a: "Right now CallTechAI supports English and Russian. We're actively working on expanding to more languages very soon — stay tuned for updates!",
                  },
                  {
                    q: "Is the Google Calendar integration available now?",
                    a: "Appointment booking via Google Calendar is currently in development and coming very soon. Once live, the AI will be able to book appointments directly into your calendar during live calls — fully automated.",
                  },
                  {
                    q: "Can I access call recordings and analytics?",
                    a: "Yes. Every call is recorded and available in your dashboard. You'll also get AI-generated summaries of each conversation and a full advanced analytics view to track performance, call volumes, trends, and more — all in one place.",
                  },
                  {
                    q: "How quickly can I get set up?",
                    a: "Most businesses are live within 2 minutes. Sign up, get your number, add your business information as intents, pick your AI persona, and you're ready. No technical knowledge required.",
                  },
                  {
                    q: "Is there a contract or minimum commitment?",
                    a: "No contracts, no lock-in. Cancel your subscription at any time. You'll keep access until the end of your current billing period. We also offer a 7-day free trial with no credit card required.",
                  },
                  {
                    q: "What happens after my free trial ends?",
                    a: "After 7 days, you'll need an active subscription to continue using CallTechAI. We'll remind you before the trial ends. If you don't subscribe, your account is paused — no charges, no surprises.",
                  },
                ].map((item, i) => (
                  <AccordionItem
                    key={i}
                    value={`item-${i}`}
                    className="border-2 border-black/10 dark:border-white/10 rounded-xl px-6 shadow-sm hover:shadow-md hover:border-lime-500/30 transition-all duration-200"
                  >
                    <AccordionTrigger className="text-left text-base font-semibold text-black dark:text-white hover:text-lime-600 dark:hover:text-lime-400 py-5 hover:no-underline">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed pb-5 pt-1 text-sm">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-20 md:py-32 bg-gradient-to-br from-lime-500 via-lime-600 to-lime-500 dark:from-lime-600 dark:via-lime-700 dark:to-lime-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
          <div className="container px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center justify-center space-y-6 text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl text-black dark:text-white">
                Ready to Transform Your Business?
              </h2>
              <p className="max-w-[600px] text-black/80 dark:text-white/80 text-base sm:text-lg md:text-xl leading-relaxed font-medium">
                Start your 7-day free trial today. No credit card required. Setup in minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4 w-full sm:w-auto">
                {!authLoading && !user && (
                  <Button size="lg" className="bg-black hover:bg-gray-900 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 px-7 py-5 sm:px-10 sm:py-7 text-base sm:text-lg group w-full sm:w-auto" asChild>
                    <Link href="/signup">
                      Start Free Trial
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                )}
                {!authLoading && user && (
                  <Button size="lg" className="bg-black hover:bg-gray-900 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 px-7 py-5 sm:px-10 sm:py-7 text-base sm:text-lg group w-full sm:w-auto" asChild>
                    <Link href="/dashboard">
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                )}
                <Button size="lg" variant="outline" className="border-2 border-black dark:border-white hover:bg-black/10 dark:hover:bg-white/10 text-black dark:text-white transition-all duration-300 font-bold px-7 py-5 sm:px-10 sm:py-7 text-base sm:text-lg w-full sm:w-auto">
                  <a href="mailto:infocalltechai@gmail.com?subject=Sales%20Inquiry">
                    Contact Sales
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full border-t border-black/10 dark:border-white/10 bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-950 py-8">
        <div className="container px-4 md:px-6 flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium text-center md:text-left">© 2026 CallTechAI. All rights reserved.</p>

          <div className="flex flex-col items-center gap-3 text-sm text-gray-600 dark:text-gray-400 sm:flex-row sm:gap-4">
            <a href="tel:+15304990632" className="flex items-center gap-1.5 hover:text-lime-600 dark:hover:text-lime-400 transition-colors font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              +1 (530) 499-0632
            </a>
            <a href="mailto:infocalltechai@gmail.com" className="flex items-center gap-1.5 hover:text-lime-600 dark:hover:text-lime-400 transition-colors font-medium break-all sm:break-normal">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              infocalltechai@gmail.com
            </a>
          </div>

          <nav className="flex gap-6">
            <Link href="/terms" className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-lime-600 dark:hover:text-lime-400 transition-colors">Terms</Link>
            <Link href="/privacy" className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-lime-600 dark:hover:text-lime-400 transition-colors">Privacy</Link>
            <a href="mailto:infocalltechai@gmail.com" className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-lime-600 dark:hover:text-lime-400 transition-colors">Contact</a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
