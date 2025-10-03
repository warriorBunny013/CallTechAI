//app/signup/page.tsx

"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-none",
          },
        }}
        routing="path"
        path="/signup"
        signInUrl="/login"
        afterSignUpUrl="/dashboard"
        redirectUrl="/dashboard"
      />
    </div>
  );
}
