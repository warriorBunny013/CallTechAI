import Link from "next/link"

export const metadata = {
  title: "Privacy Policy — CallTechAI",
  description: "CallTechAI Privacy Policy — how we collect, use, and protect your information.",
}

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-black/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
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
            <span className="text-xl font-bold bg-gradient-to-r from-lime-500 to-lime-600 bg-clip-text text-transparent">
              CallTechAI
            </span>
          </Link>
          <Link href="/" className="text-sm font-medium text-gray-600 hover:text-lime-600 transition-colors">
            ← Back to Home
          </Link>
        </div>
      </header>

      <main className="flex-1 container max-w-3xl mx-auto px-4 py-16 md:py-24">
        <div className="space-y-2 mb-12 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
          <p className="text-gray-500">Effective Date: February 20, 2026</p>
          <p className="text-gray-500">
            Website:{" "}
            <a href="https://calltechai.com" className="text-lime-600 hover:underline">
              calltechai.com
            </a>{" "}
            · Contact:{" "}
            <a href="mailto:infocalltechai@gmail.com" className="text-lime-600 hover:underline">
              infocalltechai@gmail.com
            </a>
          </p>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8 text-gray-700 dark:text-gray-300 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">1. Overview</h2>
            <p>
              CallTechAI ("we", "us", "our") provides AI-powered voice automation services for businesses.
              This Privacy Policy explains how we collect, use, process, and protect personal information
              when you use our website and services.
            </p>
            <p className="mt-2">By using CallTechAI, you agree to this Privacy Policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">2. Information We Collect</h2>
            <h3 className="font-semibold mb-1">A. Account Information</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Name</li>
              <li>Email address</li>
              <li>Company name</li>
              <li>Login credentials (securely hashed)</li>
              <li>Support communications</li>
            </ul>
            <h3 className="font-semibold mb-1 mt-4">B. Call &amp; Voice Data</h3>
            <p>If you use voice assistant features, we may process:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
              <li>Caller and recipient phone numbers</li>
              <li>Call timestamps and duration</li>
              <li>Call recordings (if enabled)</li>
              <li>Transcripts (speech-to-text output)</li>
              <li>AI-generated responses</li>
              <li>Interaction logs and metadata</li>
            </ul>
            <h3 className="font-semibold mb-1 mt-4">C. Payment Information</h3>
            <p>
              Payments are processed through Stripe. We do not store full credit card details.
              Stripe collects and processes billing information in accordance with its own privacy policy.
            </p>
            <h3 className="font-semibold mb-1 mt-4">D. Technical &amp; Usage Data</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>IP address</li>
              <li>Device/browser type</li>
              <li>Log data</li>
              <li>Cookies and session identifiers</li>
              <li>Analytics data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">3. How We Use Information</h2>
            <p>We use collected information to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li>Provide and operate the Service</li>
              <li>Process subscriptions and payments</li>
              <li>Generate AI responses and call automation</li>
              <li>Transcribe and process voice data</li>
              <li>Improve service performance</li>
              <li>Prevent fraud or abuse</li>
              <li>Comply with legal obligations</li>
              <li>Provide support</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">4. AI &amp; Voice Processing</h2>
            <p>
              To deliver AI functionality, we may process call data through trusted service providers such as:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li>OpenAI (AI text processing)</li>
              <li>Google Cloud (speech-to-text, Firebase)</li>
              <li>Microsoft Azure (text-to-speech)</li>
              <li>Telephony providers (Twilio, Vapi)</li>
              <li>Hosting providers</li>
              <li>Stripe (billing)</li>
            </ul>
            <p className="mt-2">These providers process data solely to provide the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">5. Call Recording &amp; Legal Compliance</h2>
            <p>If call recording or transcription is enabled:</p>
            <p className="mt-2">
              You are responsible for complying with all applicable call recording and consent laws in your
              jurisdiction. CallTechAI does not verify whether you have obtained required consent from callers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">6. Sharing of Information</h2>
            <p>We do not sell personal data. We may share data with:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li>Payment processors (Stripe)</li>
              <li>AI providers (OpenAI)</li>
              <li>Telephony providers</li>
              <li>Cloud hosting providers</li>
              <li>Analytics services</li>
              <li>Legal authorities if required by law</li>
              <li>Successors in case of merger/acquisition</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">7. Data Retention</h2>
            <p>We retain data as long as necessary to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li>Provide the Service</li>
              <li>Comply with legal obligations</li>
              <li>Resolve disputes</li>
              <li>Enforce agreements</li>
            </ul>
            <p className="mt-2">You may request deletion of your account at any time.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">8. Your Rights (California Notice)</h2>
            <p>If you are a California resident, you may have rights to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li>Request access to personal data</li>
              <li>Request deletion (subject to legal exceptions)</li>
              <li>Request information about categories of collected data</li>
              <li>Non-discrimination for exercising rights</li>
            </ul>
            <p className="mt-2">
              Contact:{" "}
              <a href="mailto:infocalltechai@gmail.com" className="text-lime-600 hover:underline">
                infocalltechai@gmail.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">9. Security</h2>
            <p>
              We use commercially reasonable safeguards to protect data. However, no system is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">10. International Data Transfers</h2>
            <p>
              Your information may be processed in the United States or other countries where our service
              providers operate.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">11. Children</h2>
            <p>The Service is not intended for children under 13.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">12. Changes</h2>
            <p>
              We may update this Privacy Policy. Updates will be posted with a new Effective Date.
            </p>
          </section>
        </div>
      </main>

      <footer className="w-full border-t border-black/10 dark:border-white/10 py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 md:h-16">
          <p className="text-sm text-gray-500">© 2026 CallTechAI. All rights reserved.</p>
          <nav className="flex gap-6">
            <Link href="/terms" className="text-sm text-gray-600 hover:text-lime-600 transition-colors">Terms</Link>
            <Link href="/privacy" className="text-sm text-gray-600 hover:text-lime-600 transition-colors">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
