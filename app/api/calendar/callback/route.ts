/**
 * Google OAuth callback: exchange code → store tokens in Supabase.
 *
 * ElevenLabs agents already have checkAvailability and bookAppointment webhook
 * tools built in at creation time (via buildCalendarWebhookTools in
 * elevenlabs-agent-manager.ts). Those tools call /api/tools/check-availability
 * and /api/tools/book-appointment with the org_id, so they start working
 * automatically once calendar tokens are stored here.
 *
 * Flow:
 *  1. Exchange Google auth code for access + refresh tokens
 *  2. Fetch the user's primary calendar ID
 *  3. Save tokens + calendar ID to Supabase
 *  4. Redirect to /dashboard/bookings?calendar=connected
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const BOOKINGS_URL = "/dashboard/bookings";

async function fetchPrimaryCalendarId(accessToken: string): Promise<string> {
  try {
    const res = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return "primary";
    const data = (await res.json()) as { id?: string };
    const id = data.id ?? "primary";
    console.log(`[calendar/callback] Primary calendar ID: ${id}`);
    return id;
  } catch {
    return "primary";
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || req.nextUrl.origin;
  const redirectUri = `${baseUrl}/api/calendar/callback`;

  if (error) {
    console.error("[calendar/callback] OAuth error:", error);
    return NextResponse.redirect(new URL(`${BOOKINGS_URL}?calendar=denied`, baseUrl));
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(`${BOOKINGS_URL}?calendar=error&reason=missing_code`, baseUrl)
    );
  }

  let organisationId: string;
  try {
    const decoded = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8")
    ) as { organisation_id: string };
    organisationId = decoded.organisation_id;
  } catch {
    return NextResponse.redirect(
      new URL(`${BOOKINGS_URL}?calendar=error&reason=invalid_state`, baseUrl)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(`${BOOKINGS_URL}?calendar=error&reason=no_credentials`, baseUrl)
    );
  }

  // ── 1. Exchange auth code for tokens ──────────────────────────────────────
  const tokenBody = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody.toString(),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error("[calendar/callback] Token exchange failed:", tokenRes.status, errText);
    let reason = "exchange_failed";
    try {
      const errJson = JSON.parse(errText) as { error?: string };
      if (errJson.error === "redirect_uri_mismatch") reason = "redirect_uri_mismatch";
      else if (errJson.error === "invalid_client") reason = "invalid_client";
      else if (errJson.error === "invalid_grant") reason = "invalid_grant";
    } catch { /* non-JSON */ }
    return NextResponse.redirect(
      new URL(`${BOOKINGS_URL}?calendar=error&reason=${reason}`, baseUrl)
    );
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  // ── 2. Get real primary calendar ID ──────────────────────────────────────
  const realCalendarId = await fetchPrimaryCalendarId(tokens.access_token);
  const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // ── 3. Save tokens + calendar ID to Supabase ─────────────────────────────
  const supabase = getSupabaseService();

  const { error: upsertError } = await supabase
    .from("organisation_calendar_connections")
    .upsert(
      {
        organisation_id: organisationId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_expiry: expiry,
        calendar_id: realCalendarId,
        updated_at: new Date().toISOString(),
      } as Record<string, unknown> as never,
      { onConflict: "organisation_id" }
    );

  if (upsertError) {
    console.error("[calendar/callback] Supabase upsert error:", upsertError);
    return NextResponse.redirect(
      new URL(`${BOOKINGS_URL}?calendar=error&reason=db_error`, baseUrl)
    );
  }

  console.log(
    `[calendar/callback] Calendar connected for org ${organisationId} — calendarId: ${realCalendarId}`
  );

  return NextResponse.redirect(new URL(`${BOOKINGS_URL}?calendar=connected`, baseUrl));
}
