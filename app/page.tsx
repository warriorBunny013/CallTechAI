"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Check, Play, Calendar, MessageSquare, Bot, BarChart3, Clock, Globe, ArrowRight } from "lucide-react"
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs"

export default function LandingPage() {
  const [isAnnual, setIsAnnual] = useState(true)

  const pricing = {
    basic: { monthly: 99, annual: 79 },
    pro: { monthly: 199, annual: 159 },
    ultimate: { monthly: 299, annual: 239 },
  }
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-black/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-4">
            <SignedOut>
              <SignInButton>
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </SignInButton>
              <SignUpButton>
                <Button size="sm" className="bg-lime-500 hover:bg-lime-600 text-black font-semibold shadow-lg hover:shadow-xl transition-all duration-200">
                  Sign up
                </Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard">
                <Button size="sm" className="bg-lime-500 hover:bg-lime-600 text-black font-semibold shadow-lg hover:shadow-xl transition-all duration-200">
                  Dashboard
                </Button>
              </Link>
              <UserButton />
            </SignedIn>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-20 md:py-32 lg:py-40 bg-gradient-to-br from-lime-50 via-white to-lime-50/50 dark:from-black dark:via-gray-950 dark:to-black relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.05] bg-[size:20px_20px]" />
          <div className="container px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center justify-center space-y-6 text-center">
              <Badge className="bg-lime-100 text-lime-700 dark:bg-lime-950/50 dark:text-lime-300 border-lime-200 dark:border-lime-800 px-4 py-2 text-sm font-semibold">
                AI-Powered Voice Receptionist
              </Badge>
              <div className="space-y-4 max-w-[900px]">
                <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl bg-gradient-to-r from-black via-gray-900 to-black dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent">
                  The AI Voice Assistant That Sounds Human
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-600 dark:text-gray-300 text-sm sm:text-lg">
                  24/7 AI voice assistant that answers calls, books appointments to Google Calendar, and handles customer inquiries - all while sounding completely human.
                </p>
              </div>
              <div className="flex flex-col gap-3 min-[400px]:flex-row pt-4">
                <SignedOut>
                  <SignUpButton>
                    <Button size="lg" className="bg-lime-500 hover:bg-lime-600 text-black font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 px-8 py-6 text-lg group">
                      Start Free Trial
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Link href="/dashboard">
                    <Button size="lg" className="bg-lime-500 hover:bg-lime-600 text-black font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 px-8 py-6 text-lg">
                      Go to Dashboard
                    </Button>
                  </Link>
                </SignedIn>
                <Button size="lg" variant="outline" className="group border-2 border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-300 font-semibold px-8 py-6 text-lg">
                  <Play className="mr-2 h-5 w-5 text-lime-500 group-hover:text-white dark:group-hover:text-black transition-colors" />
                  Watch Demo
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

        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Powerful Features</h2>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Everything you need to automate your customer service and grow your business
                </p>
              </div>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-12 mt-12">
                <Card className="bg-white dark:bg-gray-900 border-2 border-black/10 dark:border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 rounded-2xl overflow-hidden">
                  <CardContent className="flex flex-col items-center space-y-4 p-8">
                    <div className="p-4 bg-gradient-to-br from-lime-100 to-lime-200 dark:from-lime-900/30 dark:to-lime-800/30 rounded-2xl shadow-lg">
                      <Calendar className="h-8 w-8 text-lime-600 dark:text-lime-400" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-2xl font-bold text-black dark:text-white">Real-Time Appointment Booking</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-center leading-relaxed">
                      Seamlessly integrates with Google Calendar. Books appointments instantly, sends confirmation emails, and syncs automatically.
                    </p>
                    <Badge className="bg-lime-100 text-lime-700 dark:bg-lime-950/50 dark:text-lime-300 border-lime-200 dark:border-lime-800 font-semibold">
                      Google Integration
                    </Badge>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-gray-900 border-2 border-black/10 dark:border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 rounded-2xl overflow-hidden">
                  <CardContent className="flex flex-col items-center space-y-4 p-8">
                    <div className="p-4 bg-gradient-to-br from-lime-100 to-lime-200 dark:from-lime-900/30 dark:to-lime-800/30 rounded-2xl shadow-lg">
                      <Bot className="h-8 w-8 text-lime-600 dark:text-lime-400" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-2xl font-bold text-black dark:text-white">Human-Like Voice Agents</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-center leading-relaxed">
                      Choose from 5-6 unique AI personas with distinct personalities. Natural conversations customers won't recognize as AI.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-gray-900 border-2 border-black/10 dark:border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 rounded-2xl overflow-hidden">
                  <CardContent className="flex flex-col items-center space-y-4 p-8">
                    <div className="p-4 bg-gradient-to-br from-lime-100 to-lime-200 dark:from-lime-900/30 dark:to-lime-800/30 rounded-2xl shadow-lg">
                      <Globe className="h-8 w-8 text-lime-600 dark:text-lime-400" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-2xl font-bold text-black dark:text-white">Multilingual Support</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-center leading-relaxed">
                      Serve customers in multiple languages. Break language barriers and expand your business reach globally.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-gray-900 border-2 border-black/10 dark:border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 rounded-2xl overflow-hidden">
                  <CardContent className="flex flex-col items-center space-y-4 p-8">
                    <div className="p-4 bg-gradient-to-br from-lime-100 to-lime-200 dark:from-lime-900/30 dark:to-lime-800/30 rounded-2xl shadow-lg">
                      <BarChart3 className="h-8 w-8 text-lime-600 dark:text-lime-400" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-2xl font-bold text-black dark:text-white">Advanced Analytics Dashboard</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-center leading-relaxed">
                      Access call recordings, AI-generated summaries, and detailed insights to optimize your customer service performance.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-gray-900 border-2 border-black/10 dark:border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 rounded-2xl overflow-hidden">
                  <CardContent className="flex flex-col items-center space-y-4 p-8">
                    <div className="p-4 bg-gradient-to-br from-lime-100 to-lime-200 dark:from-lime-900/30 dark:to-lime-800/30 rounded-2xl shadow-lg">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-8 w-8 text-lime-600 dark:text-lime-400"
                      >
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                        <path d="M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1" />
                        <path d="M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-black dark:text-white">Custom Intent Management</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-center leading-relaxed">
                      Configure responses for location, working hours, services, offers, and FAQs. Easy-to-manage intents for your business.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-gray-900 border-2 border-black/10 dark:border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 rounded-2xl overflow-hidden">
                  <CardContent className="flex flex-col items-center space-y-4 p-8">
                    <div className="p-4 bg-gradient-to-br from-lime-100 to-lime-200 dark:from-lime-900/30 dark:to-lime-800/30 rounded-2xl shadow-lg">
                      <Clock className="h-8 w-8 text-lime-600 dark:text-lime-400" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-2xl font-bold text-black dark:text-white">Smart Cost Management</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-center leading-relaxed">
                      Set working hours for your assistant to optimize costs. Only active when you need it, saving you money automatically.
                    </p>
                  </CardContent>
                </Card>

                {/* Coming Soon Card */}
                <Card className="relative bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-900/30 border-2 border-dashed border-gray-300 dark:border-gray-600 shadow-lg rounded-2xl overflow-hidden col-span-full md:col-span-2 lg:col-span-1">
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-lime-500 text-black border-0 shadow-lg font-bold">
                      Coming Soon
                    </Badge>
                  </div>
                  <CardContent className="flex flex-col items-center space-y-4 p-8">
                    <div className="p-4 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-2xl shadow-lg opacity-80">
                      <MessageSquare className="h-8 w-8 text-gray-600 dark:text-gray-400" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-300">WhatsApp & Telegram Integration</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-center leading-relaxed">
                      Voice message responses for sales inquiries on WhatsApp and Telegram. Expand your customer communication channels.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="w-full py-16 md:py-24 lg:py-32 bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-950">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">How It Works</h2>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Get your AI receptionist up and running in 4 simple steps
                </p>
              </div>
            </div>

            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Step 1 */}
                <Card className="relative bg-white dark:bg-gray-900 border-2 border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-lime-500 to-lime-600 flex items-center justify-center text-white text-xl font-black shadow-lg">
                        1
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-black dark:text-white">Connect Your Phone Number</h3>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        Input your clinic or shop phone number. Our system integrates seamlessly with your existing setup.
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Step 2 */}
                <Card className="relative bg-white dark:bg-gray-900 border-2 border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-lime-500 to-lime-600 flex items-center justify-center text-white text-xl font-black shadow-lg">
                        2
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-black dark:text-white">Create Custom Intents</h3>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        Configure responses about your location, working hours, services, offers, and booking procedures.
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Step 3 */}
                <Card className="relative bg-white dark:bg-gray-900 border-2 border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-lime-500 to-lime-600 flex items-center justify-center text-white text-xl font-black shadow-lg">
                        3
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-black dark:text-white">Choose Your AI Assistant</h3>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        Select from our persona library of advanced AI voice agents with unique personalities and multilingual capabilities.
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Step 4 */}
                <Card className="relative bg-white dark:bg-gray-900 border-2 border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-lime-500 to-lime-600 flex items-center justify-center text-white text-xl font-black shadow-lg">
                        4
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-black dark:text-white">Go Live!</h3>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        Your AI assistant is ready to handle calls, book appointments to Google Calendar, and manage inquiries 24/7.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="w-full py-16 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-3">
                <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl bg-gradient-to-r from-black to-gray-800 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
                  Simple, Transparent Pricing
                </h2>
                <p className="mx-auto max-w-[700px] text-gray-600 md:text-lg dark:text-gray-300">
                  Choose the plan that works best for your business
                </p>
              </div>
              
              {/* Billing Toggle */}
              <div className="flex items-center gap-4 mt-6 p-4 bg-gradient-to-r from-lime-50 to-lime-100/50 dark:from-lime-950/20 dark:to-lime-900/10 rounded-2xl border-2 border-lime-200 dark:border-lime-800 shadow-lg">
                <Label htmlFor="billing-toggle" className={`text-sm font-semibold cursor-pointer transition-colors ${!isAnnual ? 'text-gray-600 dark:text-gray-400' : 'text-lime-700 dark:text-lime-300'}`}>
                  Monthly
                </Label>
                <Switch
                  id="billing-toggle"
                  checked={isAnnual}
                  onCheckedChange={setIsAnnual}
                  className="data-[state=checked]:bg-lime-500"
                />
                <Label htmlFor="billing-toggle" className={`text-sm font-semibold cursor-pointer transition-colors ${isAnnual ? 'text-lime-700 dark:text-lime-300' : 'text-gray-600 dark:text-gray-400'}`}>
                  Annual
                </Label>
                {isAnnual && (
                  <Badge className="bg-lime-500 text-black font-bold text-xs px-2 py-1 ml-2">
                    Save 20%
                  </Badge>
                )}
              </div>
              
              <div className="grid py-5 grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-6 mt-12 max-w-7xl">
                {/* Trial Plan */}
                <Card className="flex flex-col border-2 border-black/10 dark:border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="text-3xl mb-2">🆓</div>
                    <CardTitle className="text-2xl font-bold">Trial</CardTitle>
                    <CardDescription className="text-base">Free Trial (7 days)</CardDescription>
                    <div className="mt-6 text-5xl font-extrabold text-black dark:text-white">
                      $0
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-3 text-left">
                      <li className="flex items-center">
                        <Check className="mr-3 h-5 w-5 text-lime-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">1 assistant</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-3 h-5 w-5 text-lime-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">1 phone number</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-3 h-5 w-5 text-lime-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">500 included minutes</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-3 h-5 w-5 text-lime-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">Limited GPT mode</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-3 h-5 w-5 text-lime-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">Basic call flow</span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full bg-lime-500 hover:bg-lime-600 text-black font-bold shadow-lg hover:shadow-xl transition-all duration-300 py-6 text-lg">Start Free Trial</Button>
                  </CardFooter>
                </Card>

                {/* Basic Plan */}
                <Card className="flex flex-col border-2 border-black/10 dark:border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="text-3xl mb-2">💡</div>
                    <CardTitle className="text-2xl font-bold">Basic</CardTitle>
                    <CardDescription className="text-base">For small businesses</CardDescription>
                    <div className="mt-6">
                      <div className="text-5xl font-extrabold text-black dark:text-white">
                        ${isAnnual ? pricing.basic.annual : pricing.basic.monthly}<span className="text-lg font-normal text-gray-500">/month</span>
                      </div>
                      {isAnnual ? (
                        <div className="text-sm text-gray-500 mt-1 line-through">${pricing.basic.monthly}/month</div>
                      ) : (
                        <div className="text-sm text-lime-600 dark:text-lime-400 mt-1 font-semibold">or ${pricing.basic.annual}/month billed annually</div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-3 text-left">
                      <li className="flex items-center">
                        <Check className="mr-3 h-5 w-5 text-lime-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">1 assistant</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-3 h-5 w-5 text-lime-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">1 phone number</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-3 h-5 w-5 text-lime-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">500 included minutes</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-3 h-5 w-5 text-lime-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">Limited GPT mode</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-3 h-5 w-5 text-lime-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">Standard support (24-48h)</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-3 h-5 w-5 text-lime-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">Basic customization</span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full bg-lime-500 hover:bg-lime-600 text-black font-bold shadow-lg hover:shadow-xl transition-all duration-300 py-6 text-lg">Get Started</Button>
                  </CardFooter>
                </Card>

                {/* Pro Plan */}
                <Card className="flex flex-col border-2 border-lime-500 shadow-2xl relative scale-105 rounded-2xl overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 z-10">
                    <div className="py-2 px-4 text-sm font-bold bg-lime-500 text-black rounded-t-4xl w-full text-center mx-auto shadow-lg">POPULAR</div>
                  </div>
                  <CardHeader className="pt-12 pb-4">
                    <div className="text-3xl mb-2">🚀</div>
                    <CardTitle className="text-2xl font-bold">Pro</CardTitle>
                    <CardDescription className="text-base">For growing businesses</CardDescription>
                    <div className="mt-6">
                      <div className="text-5xl font-extrabold text-black dark:text-white">
                        ${isAnnual ? pricing.pro.annual : pricing.pro.monthly}<span className="text-lg font-normal text-gray-500">/month</span>
                      </div>
                      {isAnnual ? (
                        <div className="text-sm text-gray-500 mt-1 line-through">${pricing.pro.monthly}/month</div>
                      ) : (
                        <div className="text-sm text-lime-600 dark:text-lime-400 mt-1 font-semibold">or ${pricing.pro.annual}/month billed annually</div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-3 text-left">
                      <li className="flex items-center">
                        <Check className="mr-3 h-5 w-5 text-lime-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">3 assistants</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-3 h-5 w-5 text-lime-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">2 phone numbers</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-3 h-5 w-5 text-lime-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">1000 included minutes</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-3 h-5 w-5 text-lime-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">Limited+ GPT mode</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-3 h-5 w-5 text-lime-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">Basic analytics</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-3 h-5 w-5 text-lime-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">Custom FAQ & integrations</span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full bg-lime-500 hover:bg-lime-600 text-black font-bold shadow-xl hover:shadow-2xl transition-all duration-300 py-6 text-lg">Get Started</Button>
                  </CardFooter>
                </Card>

                {/* Ultimate Plan */}
                <Card className="flex flex-col border-2 border-black/10 dark:border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="text-3xl mb-2">👑</div>
                    <CardTitle className="text-2xl font-bold">Ultimate</CardTitle>
                    <CardDescription className="text-base">Premium automation</CardDescription>
                    <div className="mt-6">
                      <div className="text-5xl font-extrabold text-black dark:text-white">
                        ${isAnnual ? pricing.ultimate.annual : pricing.ultimate.monthly}<span className="text-lg font-normal text-gray-500">/month</span>
                      </div>
                      {isAnnual ? (
                        <div className="text-sm text-gray-500 mt-1 line-through">${pricing.ultimate.monthly}/month</div>
                      ) : (
                        <div className="text-sm text-lime-600 dark:text-lime-400 mt-1 font-semibold">or ${pricing.ultimate.annual}/month billed annually</div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-3 text-left">
                      <li className="flex items-center">
                        <Check className="mr-3 h-5 w-5 text-lime-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">5 assistants</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-3 h-5 w-5 text-lime-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">3 phone numbers</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-3 h-5 w-5 text-lime-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">2000 included minutes</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-3 h-5 w-5 text-lime-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">Full GPT mode</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-3 h-5 w-5 text-lime-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">Full analytics</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-3 h-5 w-5 text-lime-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">VIP support (1-4h)</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-3 h-5 w-5 text-lime-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">Full onboarding</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-3 h-5 w-5 text-lime-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">CRM & advanced integrations</span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full bg-lime-500 hover:bg-lime-600 text-black font-bold shadow-lg hover:shadow-xl transition-all duration-300 py-6 text-lg">Get Started</Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-950">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Frequently Asked Questions
                </h2>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Everything you need to know about CallTechAI
                </p>
              </div>
            </div>
            <div className="mx-auto max-w-3xl">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1" className="border-2 border-black/10 dark:border-white/10 rounded-xl mb-4 px-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <AccordionTrigger className="text-left text-lg font-bold text-black dark:text-white hover:text-lime-600 dark:hover:text-lime-400 py-6">
                    How does CallTechAI work?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-700 dark:text-gray-300 leading-relaxed pb-6 pt-2">
                    CallTechAI uses advanced AI to answer your business phone calls 24/7. It understands customer questions, provides accurate responses based on your configured intents, books appointments directly into your Google Calendar with automatic email confirmations, and can transfer calls to human agents when needed.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2" className="border-2 border-black/10 dark:border-white/10 rounded-xl mb-4 px-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <AccordionTrigger className="text-left text-lg font-bold text-black dark:text-white hover:text-lime-600 dark:hover:text-lime-400 py-6">
                    Can I customize the voice and responses?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-700 dark:text-gray-300 leading-relaxed pb-6 pt-2">
                    Absolutely! Choose from 5-6 unique AI personas with distinct personalities and voices. Customize greetings, configure intents for your location, working hours, services, offers, and booking procedures. Create specific responses for different customer inquiries through our easy-to-use intent management system.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3" className="border-2 border-black/10 dark:border-white/10 rounded-xl mb-4 px-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <AccordionTrigger className="text-left text-lg font-bold text-black dark:text-white hover:text-lime-600 dark:hover:text-lime-400 py-6">
                    How does the Google Calendar integration work?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-700 dark:text-gray-300 leading-relaxed pb-6 pt-2">
                    Our AI assistant seamlessly integrates with Google Calendar. When a customer books an appointment during a call, it's automatically added to your calendar in real-time. Both you and your customer receive confirmation emails with all the appointment details. No manual intervention required!
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4" className="border-2 border-black/10 dark:border-white/10 rounded-xl mb-4 px-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <AccordionTrigger className="text-left text-lg font-bold text-black dark:text-white hover:text-lime-600 dark:hover:text-lime-400 py-6">
                    What languages are supported?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-700 dark:text-gray-300 leading-relaxed pb-6 pt-2">
                    CallTechAI supports multiple languages to serve diverse customer bases worldwide. Language availability varies by plan, with higher-tier plans offering the most comprehensive multilingual support. This allows you to serve customers in their preferred language automatically.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5" className="border-2 border-black/10 dark:border-white/10 rounded-xl mb-4 px-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <AccordionTrigger className="text-left text-lg font-bold text-black dark:text-white hover:text-lime-600 dark:hover:text-lime-400 py-6">
                    Can I access call recordings and analytics?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-700 dark:text-gray-300 leading-relaxed pb-6 pt-2">
                    Yes! All calls are recorded and available in your dashboard. You get complete call recordings, AI-generated summaries of each conversation, and detailed analytics to track performance and optimize your customer service. Analytics features vary by plan level.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-6" className="border-2 border-black/10 dark:border-white/10 rounded-xl px-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <AccordionTrigger className="text-left text-lg font-bold text-black dark:text-white hover:text-lime-600 dark:hover:text-lime-400 py-6">
                    How do I manage costs?
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-700 dark:text-gray-300 leading-relaxed pb-6 pt-2">
                    Set specific working hours for your AI assistant through the dashboard to optimize costs. The assistant will only be active during your configured hours, automatically saving you money. Each plan includes a set number of minutes, and you can monitor usage in real-time. Upgrade or downgrade your plan anytime as your needs change.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-20 md:py-32 bg-gradient-to-br from-lime-500 via-lime-600 to-lime-500 dark:from-lime-600 dark:via-lime-700 dark:to-lime-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
          <div className="container px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center justify-center space-y-6 text-center max-w-3xl mx-auto">
              <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-black dark:text-white">
                Ready to Transform Your Business?
              </h2>
              <p className="max-w-[600px] text-black/80 dark:text-white/80 text-lg md:text-xl leading-relaxed font-medium">
                Start your 7-day free trial today. No credit card required. Setup in minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <SignedOut>
                  <SignUpButton>
                    <Button size="lg" className="bg-black hover:bg-gray-900 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 px-10 py-7 text-lg group">
                      Start Free Trial
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Link href="/dashboard">
                    <Button size="lg" className="bg-black hover:bg-gray-900 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 px-10 py-7 text-lg group">
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </SignedIn>
                <Button size="lg" variant="outline" className="border-2 border-black dark:border-white hover:bg-black/10 dark:hover:bg-white/10 text-black dark:text-white transition-all duration-300 font-bold px-10 py-7 text-lg">
                  Contact Sales
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full border-t border-black/10 dark:border-white/10 bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-950 py-8 md:py-0">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 md:h-20">
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">© 2025 CallTechAI. All rights reserved.</p>
          <nav className="flex gap-6 sm:gap-8">
            <Link href="#" className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-lime-600 dark:hover:text-lime-400 transition-colors">
              Terms
            </Link>
            <Link href="#" className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-lime-600 dark:hover:text-lime-400 transition-colors">
              Privacy
            </Link>
            <Link href="#" className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-lime-600 dark:hover:text-lime-400 transition-colors">
              Contact
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}