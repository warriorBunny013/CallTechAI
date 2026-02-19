import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndOrg } from "@/lib/org";

export async function GET(request: NextRequest) {
  try {
    const userAndOrg = await getCurrentUserAndOrg();
    if (!userAndOrg) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const orgId = userAndOrg.organisationId;

    const { count: intentsCount, error: intentsError } = await supabase
      .from("intents")
      .select("*", { count: "exact", head: true })
      .eq("organisation_id", orgId);

    if (intentsError) {
      console.error("Supabase intents error:", intentsError);
      return NextResponse.json(
        { error: "Failed to fetch intents count" },
        { status: 500 }
      );
    }

    const { data: phoneNumbers } = await supabase
      .from("phone_numbers")
      .select("id")
      .eq("organisation_id", orgId);

    const { data: org } = await supabase
      .from("organisations")
      .select("selected_voice_agent_id")
      .eq("id", orgId)
      .single();

    const hasPhoneNumber = (phoneNumbers?.length ?? 0) > 0;
    const hasIntents = (intentsCount ?? 0) > 0;
    const hasAssistant = !!(org as { selected_voice_agent_id?: string | null } | null)?.selected_voice_agent_id;

    const assistantActive = hasPhoneNumber && hasIntents && hasAssistant;

    return NextResponse.json({
      intentsCount: intentsCount ?? 0,
      hasPhoneNumber,
      hasAssistant,
      assistantActive,
    });
  } catch (error) {
    console.error("Error in dashboard-stats API:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}
