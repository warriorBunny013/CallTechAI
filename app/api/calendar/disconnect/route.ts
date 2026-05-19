/**
 * DELETE /api/calendar/disconnect
 *
 * Disconnects the org's Google Calendar:
 *   1. Deletes the calendar connection row from Supabase.
 *
 * ElevenLabs agents keep their checkAvailability / bookAppointment webhook
 * tools on the agent, but those endpoints will gracefully respond with
 * "Appointment booking isn't set up yet" when no connection row exists.
 */

import { NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";
import { getCurrentUserAndOrg } from "@/lib/org";

export async function DELETE() {
  const userAndOrg = await getCurrentUserAndOrg();
  if (!userAndOrg) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { organisationId } = userAndOrg;
  const supabase = getSupabaseService();

  const { error: deleteError } = await supabase
    .from("organisation_calendar_connections")
    .delete()
    .eq("organisation_id", organisationId);

  if (deleteError) {
    console.error("[calendar/disconnect] Supabase delete error:", deleteError);
    return NextResponse.json({ error: "Failed to disconnect calendar" }, { status: 500 });
  }

  console.log(`[calendar/disconnect] Google Calendar disconnected for org: ${organisationId}`);
  return NextResponse.json({ ok: true, message: "Google Calendar disconnected successfully." });
}
