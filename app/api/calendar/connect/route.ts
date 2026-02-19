/**
 * Start Google Calendar OAuth for the current user's organisation.
 * Redirects to Google consent; callback will store tokens in organisation_calendar_connections.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/org";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
].join(" ");

export async function GET(req: NextRequest) {
  const userAndOrg = await getCurrentUserAndOrg();
  if (!userAndOrg) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const redirectUri = `${baseUrl}/api/calendar/callback`;

  if (!clientId) {
    console.error("GOOGLE_CLIENT_ID not set");
    return NextResponse.redirect(new URL("/dashboard?calendar=error", req.url));
  }

  const state = Buffer.from(
    JSON.stringify({ organisation_id: userAndOrg.organisationId })
  ).toString("base64url");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return NextResponse.redirect(url);
}
