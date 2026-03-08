import Link from "next/link"

export const metadata = {
  title: "Terms of Service — CallTechAI",
  description: "CallTechAI Terms of Service — the rules and agreements governing your use of our platform.",
}

export default function TermsPage() {
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
          <h1 className="text-4xl font-extrabold tracking-tight">Terms of Service</h1>
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

        <div className="space-y-8 text-gray-700 dark:text-gray-300 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using CallTechAI ("Service"), you agree to these Terms of Service ("Terms")
              and our Privacy Policy. If you do not agree, you must not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">2. Description of Service</h2>
            <p>
              CallTechAI provides AI-powered voice automation software for businesses, including but not limited to:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li>Automated call answering</li>
              <li>AI-generated conversational responses</li>
              <li>Speech-to-text transcription</li>
              <li>Text-to-speech synthesis</li>
              <li>Call routing and automation</li>
              <li>Dashboard analytics</li>
            </ul>
            <p className="mt-2">We reserve the right to modify or discontinue features at any time.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">3. Accounts</h2>
            <p>You must:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li>Provide accurate information</li>
              <li>Maintain the confidentiality of your credentials</li>
              <li>Be responsible for all activity under your account</li>
            </ul>
            <p className="mt-2">We may suspend or terminate accounts that violate these Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">4. Legal &amp; Telecommunication Compliance</h2>
            <p>You agree that:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li>You have the legal right to use all phone numbers submitted.</li>
              <li>You will comply with all applicable telecommunication laws.</li>
              <li>
                If call recording or transcription is enabled, you are responsible for providing legally
                required notices and obtaining consent where required.
              </li>
            </ul>
            <p className="mt-2">
              CallTechAI does not monitor or verify compliance with call recording laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">5. Acceptable Use</h2>
            <p>You may not:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li>Use the Service for unlawful, fraudulent, or abusive purposes</li>
              <li>Conduct spam or scam calls</li>
              <li>Harass individuals</li>
              <li>Attempt to reverse engineer the system</li>
              <li>Upload content you do not have rights to use</li>
              <li>Interfere with system security</li>
            </ul>
            <p className="mt-2">We may suspend or permanently terminate accounts for violations.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">6. Subscriptions &amp; Billing</h2>
            <h3 className="font-semibold mb-1">6.1 Plans</h3>
            <p>We offer monthly and annual subscription plans.</p>
            <h3 className="font-semibold mb-1 mt-3">6.2 Automatic Renewal</h3>
            <p>
              Subscriptions automatically renew at the end of each billing period unless canceled prior to renewal.
            </p>
            <h3 className="font-semibold mb-1 mt-3">6.3 Payment</h3>
            <p>Payments are processed through Stripe. Fees are charged in advance.</p>
            <h3 className="font-semibold mb-1 mt-3">6.4 Taxes</h3>
            <p>Applicable taxes may apply based on your jurisdiction.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">7. Cancellation &amp; Termination</h2>
            <p>
              You may cancel at any time. Cancellation prevents future renewals but does not retroactively
              refund prior payments. We may suspend or terminate access for violations of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">8. Refund Policy</h2>
            <p>Except where required by law, all payments are non-refundable.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">9. AI Disclaimer</h2>
            <p>AI-generated responses may contain inaccuracies or errors. You acknowledge that:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li>AI outputs are probabilistic</li>
              <li>The Service may generate incorrect or incomplete information</li>
              <li>You are responsible for verifying outputs before relying on them</li>
            </ul>
            <p className="mt-2">
              CallTechAI is not liable for business decisions made based on AI-generated responses.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">10. Third-Party Services</h2>
            <p>
              The Service relies on third-party providers, including but not limited to payment processors,
              telecommunication providers, AI providers, and cloud hosting providers. We are not responsible
              for outages, interruptions, or failures caused by third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">11. Service Availability</h2>
            <p>
              The Service is provided "as is" and "as available". We do not guarantee uninterrupted, secure,
              or error-free operation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">12. Intellectual Property</h2>
            <p>
              All platform software, branding, and technology belong to CallTechAI. You retain ownership of
              your business data and scripts. You grant CallTechAI a limited license to process your data
              solely to provide the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">13. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, CallTechAI shall not be liable for:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li>Loss of profits or revenue</li>
              <li>Loss of data</li>
              <li>Business interruption</li>
              <li>Reputational harm</li>
              <li>Indirect, incidental, special, consequential, or punitive damages</li>
            </ul>
            <p className="mt-2">
              Our total aggregate liability shall not exceed the greater of: (a) the amount paid by you in
              the three (3) months preceding the claim; or (b) one hundred dollars ($100), if no payments
              were made. Some jurisdictions may not allow certain limitations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">14. Indemnification</h2>
            <p>You agree to defend and indemnify CallTechAI from claims arising from:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
              <li>Your misuse of the Service</li>
              <li>Your violation of laws</li>
              <li>Your communications or content</li>
              <li>Your failure to obtain required call recording consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">15. Force Majeure</h2>
            <p>
              CallTechAI shall not be liable for delays or failure to perform resulting from causes beyond
              our reasonable control, including internet outages, cloud infrastructure failures, AI provider
              outages, telecommunication failures, natural disasters, government actions, labor disputes, or
              power failures.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">16. Arbitration &amp; Dispute Resolution</h2>
            <p>
              Any dispute arising out of or relating to these Terms or the Service shall be resolved through
              binding arbitration in the State of California. You waive any right to participate in class
              action lawsuits or class-wide arbitration. Claims must be brought on an individual basis only.
              You may bring eligible claims in small claims court.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">17. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the State of California, without regard to
              conflict-of-law principles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black dark:text-white mb-3">18. Changes to Terms</h2>
            <p>
              We may update these Terms at any time. Continued use of the Service after updates constitutes
              acceptance.
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
