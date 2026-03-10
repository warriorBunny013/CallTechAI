/**
 * Google OAuth callback: exchange code for tokens, store in organisation_calendar_connections.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const BOOKINGS_URL = "/dashboard/bookings";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const redirectUri = `${baseUrl}/api/calendar/callback`;

  if (error) {
    console.error("[calendar/callback] OAuth error:", error);
    return NextResponse.redirect(new URL(`${BOOKINGS_URL}?calendar=denied`, baseUrl));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL(`${BOOKINGS_URL}?calendar=error&reason=missing_code`, baseUrl));
  }

  let organisationId: string;
  try {
    const decoded = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8")
    ) as { organisation_id: string };
    organisationId = decoded.organisation_id;
  } catch {
    return NextResponse.redirect(new URL(`${BOOKINGS_URL}?calendar=error&reason=invalid_state`, baseUrl));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("Google OAuth credentials not set");
    return NextResponse.redirect(new URL(`${BOOKINGS_URL}?calendar=error&reason=no_credentials`, baseUrl));
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
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
    } catch { /* non-JSON error body */ }

    return NextResponse.redirect(new URL(`${BOOKINGS_URL}?calendar=error&reason=${reason}`, baseUrl));
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const supabase = getSupabaseService();
  const { error: upsertError } = await supabase
    .from("organisation_calendar_connections")
    .upsert(
      {
        organisation_id: organisationId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_expiry: expiry,
        calendar_id: "primary",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organisation_id" }
    );

  if (upsertError) {
    console.error("[calendar/callback] Upsert error:", upsertError);
    return NextResponse.redirect(new URL(`${BOOKINGS_URL}?calendar=error&reason=db_error`, baseUrl));
  }

  return NextResponse.redirect(new URL(`${BOOKINGS_URL}?calendar=connected`, baseUrl));
}
