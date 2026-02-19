/**
 * POST /api/calendar/appointments – create a calendar event and store in appointments table.
 * Body: { summary, start, end, customer_phone?, customer_name?, call_id? }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseService } from "@/lib/supabase/service";
import { getCurrentUserAndOrg } from "@/lib/org";
import {
  getValidAccessToken,
  createCalendarEvent,
  type CalendarConnection,
} from "@/lib/google-calendar";

export async function POST(req: NextRequest) {
  const userAndOrg = await getCurrentUserAndOrg();
  if (!userAndOrg) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    summary,
    start,
    end,
    description,
    customer_phone,
    customer_name,
    call_id,
  } = body;

  if (!summary || !start || !end) {
    return NextResponse.json(
      { error: "summary, start, and end (ISO8601) required" },
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
    const event = await createCalendarEvent(
      accessToken,
      calendarId,
      summary,
      start,
      end,
      description
    );

    const serviceSupabase = getSupabaseService();
    const { data: appointment, error: insertError } = await serviceSupabase
      .from("appointments")
      .insert({
        organisation_id: userAndOrg.organisationId,
        calendar_event_id: event.id,
        summary,
        description: description ?? null,
        start_at: event.start,
        end_at: event.end,
        customer_phone: customer_phone ?? null,
        customer_name: customer_name ?? null,
        call_id: call_id ?? null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[calendar/appointments] Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save appointment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      appointment,
      calendar_event_id: event.id,
      start: event.start,
      end: event.end,
    });
  } catch (e) {
    console.error("[calendar/appointments]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create event" },
      { status: 500 }
    );
  }
}
