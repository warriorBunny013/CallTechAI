/**
 * GET /api/calendar/status
 * Returns whether Google Calendar is connected for the current org,
 * plus any stored availability settings.
 *
 * Required DB migration (run once in Supabase SQL editor):
 *   ALTER TABLE organisation_calendar_connections
 *     ADD COLUMN IF NOT EXISTS availability_settings JSONB DEFAULT '{}';
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

  const { data: connection } = await supabase
    .from("organisation_calendar_connections")
    .select("calendar_id, token_expiry, availability_settings")
    .eq("organisation_id", userAndOrg.organisationId)
    .maybeSingle();

  if (!connection) {
    return NextResponse.json({ connected: false, availabilitySettings: null });
  }

  return NextResponse.json({
    connected: true,
    calendarId: connection.calendar_id ?? "primary",
    availabilitySettings: (connection as Record<string, unknown>).availability_settings ?? null,
  });
}
