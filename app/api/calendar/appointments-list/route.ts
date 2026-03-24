/**
 * GET /api/calendar/appointments-list
 * Returns all appointments for the current organisation, newest first.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndOrg } from "@/lib/org";

export async function GET() {
  const userAndOrg = await getCurrentUserAndOrg();
  if (!userAndOrg) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("appointments")
    .select("id, summary, description, start_at, end_at, customer_phone, customer_name, customer_email, calendar_event_id, call_id, created_at")
    .eq("organisation_id", userAndOrg.organisationId)
    .order("start_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[appointments-list]", error);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }

  return NextResponse.json({ appointments: data ?? [] });
}
