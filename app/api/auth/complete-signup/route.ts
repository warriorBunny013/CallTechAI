import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseService } from "@/lib/supabase/service";
import { getCurrentUser } from "@/lib/auth";

const TRIAL_DAYS = 7;

/**
 * Called after client-side signUp. Creates the profile row with trial_ends_at.
 * Session cookie must already be set by the client.
 */
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: authUser } = await supabase.auth.getUser();
    const metadata = (authUser.user?.user_metadata ?? {}) as Record<string, string>;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (existing) {
      return NextResponse.json({ success: true, message: "Profile already exists" });
    }

    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      full_name: (metadata.full_name as string)?.trim() || "User",
      email: authUser.user?.email ?? user.email ?? "",
      phone: (metadata.phone as string)?.trim() || null,
      organisation_name: (metadata.organisation_name as string)?.trim() || "My Organisation",
      trial_ends_at: trialEndsAt.toISOString(),
    });

    if (error) {
      console.error("Complete signup profile error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to create profile" },
        { status: 500 }
      );
    }

    const orgName = (metadata.organisation_name as string)?.trim() || "My Organisation";

    const serviceSupabase = getSupabaseService();
    const { data: org, error: orgError } = await serviceSupabase
      .from("organisations")
      .insert({ name: orgName })
      .select("id")
      .single();

    if (orgError || !org) {
      console.error("Complete signup organisation error:", orgError);
      return NextResponse.json(
        { error: "Failed to create organisation" },
        { status: 500 }
      );
    }

    const { error: memberError } = await serviceSupabase.from("organisation_members").insert({
      organisation_id: org.id,
      user_id: user.id,
      role: "owner",
    });

    if (memberError) {
      console.error("Complete signup organisation_members error:", memberError);
      return NextResponse.json(
        { error: "Failed to add user to organisation" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      trial_ends_at: trialEndsAt.toISOString(),
    });
  } catch (e) {
    console.error("Complete signup error:", e);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
