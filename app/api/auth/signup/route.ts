import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TRIAL_DAYS = 7;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      password,
      full_name,
      phone,
      organisation_name,
    } = body as {
      email?: string;
      password?: string;
      full_name?: string;
      phone?: string;
      organisation_name?: string;
    };

    if (!email || !password || !full_name || !organisation_name) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["email", "password", "full_name", "organisation_name"],
        },
        { status: 400 }
      );
    }

    const supabaseAuth = await createClient();

    const { data: authData, error: signUpError } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name.trim(),
          phone: (phone ?? "").trim(),
          organisation_name: organisation_name.trim(),
        },
      },
    });

    if (signUpError) {
      console.error("Signup error:", signUpError);
      return NextResponse.json(
        { error: signUpError.message || "Sign up failed" },
        { status: 400 }
      );
    }

    const user = authData.user;
    if (!user) {
      return NextResponse.json(
        { error: "User not created" },
        { status: 500 }
      );
    }

    const metadata = (user.user_metadata ?? {}) as Record<string, string>;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    const { error: profileError } = await supabaseAuth.from("profiles").insert({
      id: user.id,
      full_name: metadata.full_name ?? full_name.trim(),
      email: user.email ?? email,
      phone: metadata.phone ?? ((phone ?? "").trim() || null),
      organisation_name: metadata.organisation_name ?? organisation_name.trim(),
      trial_ends_at: trialEndsAt.toISOString(),
    });

    if (profileError) {
      console.error("Profile insert error:", profileError);
      return NextResponse.json(
        { error: "Account created but profile setup failed. Please try logging in." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email },
      trial_ends_at: trialEndsAt.toISOString(),
    });
  } catch (e) {
    console.error("Signup error:", e);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
