/**
 * Google OAuth callback: exchange code for tokens, store in organisation_calendar_connections.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const redirectUri = `${baseUrl}/api/calendar/callback`;

  if (error) {
    console.error("[calendar/callback] OAuth error:", error);
    return NextResponse.redirect(new URL("/dashboard?calendar=denied", req.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard?calendar=error", req.url));
  }

  let organisationId: string;
  try {
    const decoded = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8")
    ) as { organisation_id: string };
    organisationId = decoded.organisation_id;
  } catch {
    return NextResponse.redirect(new URL("/dashboard?calendar=error", req.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("Google OAuth credentials not set");
    return NextResponse.redirect(new URL("/dashboard?calendar=error", req.url));
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
    const err = await tokenRes.text();
    console.error("[calendar/callback] Token exchange failed:", tokenRes.status, err);
    return NextResponse.redirect(new URL("/dashboard?calendar=error", req.url));
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
    return NextResponse.redirect(new URL("/dashboard?calendar=error", req.url));
  }

  return NextResponse.redirect(new URL("/dashboard?calendar=connected", req.url));
}
