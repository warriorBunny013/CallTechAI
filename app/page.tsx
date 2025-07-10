import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Play } from "lucide-react"
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
              className="h-6 w-6 text-rose-500"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
            <span className="text-xl font-bold">CallTechAI</span>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link href="#features" className="text-sm font-medium hover:underline">
              Features
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
                <Button size="sm" className="bg-rose-500 hover:bg-rose-600">
                  Sign up
                </Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard">
                <Button size="sm" className="bg-rose-500 hover:bg-rose-600">
                  Dashboard
                </Button>
              </Link>
              <UserButton />
            </SignedIn>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-rose-50 dark:bg-rose-950/20">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2 max-w-[800px]">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
                  The AI Voice Assistant That Sounds Human
                </h1>
                <p className="mx-auto max-w-[600px] text-gray-500 md:text-xl dark:text-gray-400">
                  Multilingual, natural-sounding calls that delight your customers.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <SignedOut>
                  <SignUpButton>
                    <Button size="lg" className="bg-rose-500 hover:bg-rose-600">
                      Get Started
                    </Button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Link href="/dashboard">
                    <Button size="lg" className="bg-rose-500 hover:bg-rose-600">
                      Go to Dashboard
                    </Button>
                  </Link>
                </SignedIn>
                <Button size="lg" variant="outline" className="group">
                  <Play className="mr-2 h-4 w-4 text-rose-500 group-hover:text-rose-600" />
                  Try Demo Call
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Key Features</h2>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Everything you need for exceptional customer service
                </p>
              </div>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:gap-12 mt-8">
                <Card className="bg-white dark:bg-gray-800 border-0 shadow-md">
                  <CardContent className="flex flex-col items-center space-y-2 p-6">
                    <div className="p-2 bg-rose-100 rounded-full dark:bg-rose-900">
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
                        className="h-6 w-6 text-rose-500"
                      >
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" x2="12" y1="19" y2="22" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold">Human-like Voice</h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Natural-sounding voices your customers won't recognize as AI
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-800 border-0 shadow-md">
                  <CardContent className="flex flex-col items-center space-y-2 p-6">
                    <div className="p-2 bg-rose-100 rounded-full dark:bg-rose-900">
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
                        className="h-6 w-6 text-rose-500"
                      >
                        <path d="m5 8 6 6" />
                        <path d="m4 14 6-6 2-3" />
                        <path d="M2 5h12" />
                        <path d="M7 2h1" />
                        <path d="m22 22-5-5" />
                        <path d="M17 8v9" />
                        <path d="M12 17h9" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold">Multilingual</h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Fluent in both Russian and English to serve diverse customer bases
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-800 border-0 shadow-md">
                  <CardContent className="flex flex-col items-center space-y-2 p-6">
                    <div className="p-2 bg-rose-100 rounded-full dark:bg-rose-900">
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
                        className="h-6 w-6 text-rose-500"
                      >
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                        <path d="M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1" />
                        <path d="M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold">Custom Intents</h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Easily configure how your assistant responds to different customer inquiries
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="w-full py-12 md:py-24 lg:py-32 bg-gray-50 dark:bg-gray-900">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Simple, Transparent Pricing
                </h2>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Choose the plan that works best for your business
                </p>
              </div>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:gap-12 mt-8">
                <Card className="flex flex-col">
                  <CardHeader>
                    <CardTitle>Basic</CardTitle>
                    <CardDescription>For small businesses</CardDescription>
                    <div className="mt-4 text-4xl font-bold">
                      $99<span className="text-sm font-normal text-gray-500">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-2 text-left">
                      <li className="flex items-center">
                        <Check className="mr-2 h-4 w-4 text-green-500" />
                        <span>Up to 100 calls per month</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-2 h-4 w-4 text-green-500" />
                        <span>English language support</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-2 h-4 w-4 text-green-500" />
                        <span>3 custom intents</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-2 h-4 w-4 text-green-500" />
                        <span>Email support</span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full bg-rose-500 hover:bg-rose-600">Get Started</Button>
                  </CardFooter>
                </Card>
                <Card className="flex flex-col border-rose-500 shadow-lg relative">
                  <div className="absolute top-0 left-0 right-0">
                    <div className="py-1 px-3 text-xs bg-rose-500 text-white rounded-t-lg w-fit mx-auto">POPULAR</div>
                  </div>
                  <CardHeader className="pt-8">
                    <CardTitle>Pro</CardTitle>
                    <CardDescription>For growing businesses</CardDescription>
                    <div className="mt-4 text-4xl font-bold">
                      $199<span className="text-sm font-normal text-gray-500">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-2 text-left">
                      <li className="flex items-center">
                        <Check className="mr-2 h-4 w-4 text-green-500" />
                        <span>Up to 500 calls per month</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-2 h-4 w-4 text-green-500" />
                        <span>English & Russian support</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-2 h-4 w-4 text-green-500" />
                        <span>10 custom intents</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-2 h-4 w-4 text-green-500" />
                        <span>Priority email support</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-2 h-4 w-4 text-green-500" />
                        <span>CRM integration</span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full bg-rose-500 hover:bg-rose-600">Get Started</Button>
                  </CardFooter>
                </Card>
                <Card className="flex flex-col">
                  <CardHeader>
                    <CardTitle>Ultimate</CardTitle>
                    <CardDescription>For large enterprises</CardDescription>
                    <div className="mt-4 text-4xl font-bold">
                      $299<span className="text-sm font-normal text-gray-500">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-2 text-left">
                      <li className="flex items-center">
                        <Check className="mr-2 h-4 w-4 text-green-500" />
                        <span>Unlimited calls</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-2 h-4 w-4 text-green-500" />
                        <span>All language options</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-2 h-4 w-4 text-green-500" />
                        <span>Unlimited custom intents</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-2 h-4 w-4 text-green-500" />
                        <span>24/7 phone support</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-2 h-4 w-4 text-green-500" />
                        <span>All integrations</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="mr-2 h-4 w-4 text-green-500" />
                        <span>Custom voice options</span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full bg-rose-500 hover:bg-rose-600">Get Started</Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="w-full py-12 md:py-24 lg:py-32">
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
            <div className="mx-auto grid max-w-5xl gap-6">
              {[
                {
                  question: "How does CallTechAI work?",
                  answer:
                    "CallTechAI answers your business phone calls using advanced AI technology. It understands caller questions, provides accurate responses based on your configured intents, and can transfer calls to human agents when needed.",
                },
                {
                  question: "Can I customize the voice and responses?",
                  answer:
                    "Yes! You can select from multiple voice options, customize greetings, and create specific responses for different types of customer inquiries through our intent management system.",
                },
                {
                  question: "What languages are supported?",
                  answer:
                    "Currently, CallTechAI supports English and Russian. We're actively working on adding more languages in the future.",
                },
                {
                  question: "How do I integrate CallTechAI with my existing phone system?",
                  answer:
                    "Integration is simple. We provide a dedicated phone number that forwards to your existing system when needed, or you can use our API to integrate with your current telephony infrastructure.",
                },
                {
                  question: "Can I listen to call recordings?",
                  answer:
                    "Yes, all calls are recorded and available in your dashboard. You can review them to improve your assistant's performance and ensure quality customer service.",
                },
              ].map((faq, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardHeader>
                    <CardTitle>{faq.question}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full border-t py-6 md:py-0">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 md:h-16">
          <p className="text-sm text-gray-500 dark:text-gray-400">© 2025 CallTechAI. All rights reserved.</p>
          <nav className="flex gap-4 sm:gap-6">
            <Link href="#" className="text-sm font-medium hover:underline">
              Terms
            </Link>
            <Link href="#" className="text-sm font-medium hover:underline">
              Privacy
            </Link>
            <Link href="#" className="text-sm font-medium hover:underline">
              Contact
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
