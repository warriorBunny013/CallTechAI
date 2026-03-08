/**
 * GET  /api/calendar/availability  — fetch stored availability settings for the org
 * PUT  /api/calendar/availability  — save availability settings for the org
 *
 * Availability settings shape:
 * {
 *   days: string[];          // e.g. ["Mon","Tue","Wed","Thu","Fri"]
 *   startHour: number;       // 0-23
 *   endHour: number;         // 0-23
 *   appointmentDuration: number;  // minutes, e.g. 30
 *   bufferTime: number;      // minutes between appointments, e.g. 15
 * }
 *
 * Required DB migration (run once in Supabase SQL editor):
 *   ALTER TABLE organisation_calendar_connections
 *     ADD COLUMN IF NOT EXISTS availability_settings JSONB DEFAULT '{}';
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndOrg } from "@/lib/org";

export async function GET() {
  const userAndOrg = await getCurrentUserAndOrg();
  if (!userAndOrg) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("organisation_calendar_connections")
    .select("availability_settings")
    .eq("organisation_id", userAndOrg.organisationId)
    .maybeSingle();

  return NextResponse.json({
    availabilitySettings: (data as Record<string, unknown> | null)?.availability_settings ?? null,
  });
}

export async function PUT(req: NextRequest) {
  const userAndOrg = await getCurrentUserAndOrg();
  if (!userAndOrg) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { days, startHour, endHour, appointmentDuration, bufferTime } = body;

  if (
    !Array.isArray(days) ||
    typeof startHour !== "number" ||
    typeof endHour !== "number" ||
    typeof appointmentDuration !== "number" ||
    typeof bufferTime !== "number"
  ) {
    return NextResponse.json({ error: "Invalid availability settings" }, { status: 400 });
  }

  const settings = { days, startHour, endHour, appointmentDuration, bufferTime };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organisation_calendar_connections")
    .update({ availability_settings: settings } as Record<string, unknown>)
    .eq("organisation_id", userAndOrg.organisationId);

  if (error) {
    console.error("[calendar/availability] Update error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, availabilitySettings: settings });
}
