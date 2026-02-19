/**
 * GET /api/calendar/freebusy?timeMin=...&timeMax=...
 * Returns busy slots for the current org's connected calendar.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndOrg } from "@/lib/org";
import {
  getValidAccessToken,
  queryFreeBusy,
  type CalendarConnection,
} from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const userAndOrg = await getCurrentUserAndOrg();
  if (!userAndOrg) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const timeMin = searchParams.get("timeMin");
  const timeMax = searchParams.get("timeMax");

  if (!timeMin || !timeMax) {
    return NextResponse.json(
      { error: "timeMin and timeMax (ISO8601) required" },
      { status: 400 }
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Google Calendar not configured" },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const { data: connection, error: connError } = await supabase
    .from("organisation_calendar_connections")
    .select("access_token, refresh_token, token_expiry, calendar_id")
    .eq("organisation_id", userAndOrg.organisationId)
    .single();

  if (connError || !connection) {
    return NextResponse.json(
      { error: "Calendar not connected. Connect Google Calendar first." },
      { status: 400 }
    );
  }

  const calendarId = (connection.calendar_id as string) || "primary";
  const conn: CalendarConnection = {
    organisation_id: userAndOrg.organisationId,
    access_token: connection.access_token as string | null,
    refresh_token: connection.refresh_token as string | null,
    token_expiry: connection.token_expiry as string | null,
    calendar_id: calendarId,
  };

  const accessToken = await getValidAccessToken(conn, clientId, clientSecret);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Calendar token expired. Reconnect Google Calendar." },
      { status: 400 }
    );
  }

  try {
    const result = await queryFreeBusy(accessToken, calendarId, timeMin, timeMax);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[calendar/freebusy]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Freebusy query failed" },
      { status: 500 }
    );
  }
}
