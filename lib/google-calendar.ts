/**
 * Google Calendar API helpers: OAuth token refresh, freebusy query, event creation.
 * Tokens are stored per organisation in organisation_calendar_connections.
 */

/**
 * Convert a local date/time (expressed as year, 1-based month, day, hour, minute)
 * in a given IANA timezone to a UTC Date object.
 *
 * Uses noon UTC on the same date to determine the timezone offset (avoids DST
 * boundary issues at 2 AM). Handles half-hour offsets (e.g. IST UTC+5:30).
 *
 * Example — New York (UTC-4 in summer):
 *   localToUTC(2026, 5, 21, 9, 0, "America/New_York") → 2026-05-21T13:00:00Z
 */
export function localToUTC(
  year: number,
  month1: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string
): Date {
  // Use noon UTC to probe the offset (noon is always on the same calendar day
  // as the business hour being converted, safe across DST transitions at 2 AM)
  const noonUTC = new Date(Date.UTC(year, month1 - 1, day, 12, 0, 0));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(noonUTC);

  const localNoonH = parseInt(parts.find((p) => p.type === "hour")?.value ?? "12", 10) % 24;
  const localNoonM = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);

  // UTC offset in minutes: positive = east of UTC, negative = west
  // At noon UTC, local time is localNoonH:localNoonM
  // tzOffset = UTC - local = 12*60 - localNoon (in minutes)
  const tzOffsetMinutes = 12 * 60 - (localNoonH * 60 + localNoonM);

  // Target UTC time = local time + tzOffset
  const targetUTCMinutes = hour * 60 + minute + tzOffsetMinutes;
  const baseDayUTC = Date.UTC(year, month1 - 1, day, 0, 0, 0);
  return new Date(baseDayUTC + targetUTCMinutes * 60_000);
}

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_FREEBUSY = "https://www.googleapis.com/calendar/v3/freeBusy";
const GOOGLE_CALENDAR_EVENTS = (calendarId: string) =>
  `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

export interface CalendarConnection {
  organisation_id: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expiry: string | null;
  calendar_id: string | null;
}

/**
 * Refresh access token using refresh_token. Returns new tokens or null on failure.
 */
export async function refreshGoogleTokens(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ access_token: string; expiry_date: number } | null> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[google-calendar] Token refresh failed:", res.status, err);
    return null;
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  const expiry_date = Date.now() + data.expires_in * 1000;
  return { access_token: data.access_token, expiry_date };
}

/**
 * Get a valid access token: use existing if not expired, else refresh and persist.
 * Pass a `saveToken` callback to persist the refreshed token back to your DB.
 */
export async function getValidAccessToken(
  connection: CalendarConnection,
  clientId: string,
  clientSecret: string,
  saveToken?: (accessToken: string, expiryIso: string) => Promise<void>
): Promise<string | null> {
  const expiry = connection.token_expiry ? new Date(connection.token_expiry).getTime() : 0;
  const now = Date.now();

  // Token still valid (with 60s buffer)
  if (connection.access_token && expiry > now + 60_000) {
    return connection.access_token;
  }

  if (!connection.refresh_token) return null;

  const refreshed = await refreshGoogleTokens(
    connection.refresh_token,
    clientId,
    clientSecret
  );

  if (!refreshed) return null;

  // Persist the new token so we don't refresh on every call
  if (saveToken) {
    const expiryIso = new Date(refreshed.expiry_date).toISOString();
    await saveToken(refreshed.access_token, expiryIso).catch((e) =>
      console.warn("[google-calendar] Failed to save refreshed token:", e)
    );
  }

  return refreshed.access_token;
}

/**
 * Free/busy query for a calendar in a time range.
 */
export async function queryFreeBusy(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<{ busy: { start: string; end: string }[] }> {
  const res = await fetch(GOOGLE_CALENDAR_FREEBUSY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      items: [{ id: calendarId }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Freebusy query failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as {
    calendars?: Record<string, { busy?: { start: string; end: string }[] }>;
  };

  // Try exact calendarId key, then fall back to "primary"
  const cal = data.calendars?.[calendarId] ?? data.calendars?.["primary"];
  return { busy: cal?.busy ?? [] };
}

/**
 * Create a calendar event and return the event id and start/end.
 * Optionally include attendee emails to send Google Calendar invites.
 */
export async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  summary: string,
  start: string,
  end: string,
  description?: string,
  attendeeEmails?: string[],
  timezone?: string
): Promise<{ id: string; start: string; end: string }> {
  const url = GOOGLE_CALENDAR_EVENTS(calendarId);
  const tz = timezone ?? "UTC";

  const body: Record<string, unknown> = {
    summary,
    description: description ?? "",
    start: { dateTime: start, timeZone: tz },
    end: { dateTime: end, timeZone: tz },
  };

  if (attendeeEmails && attendeeEmails.length > 0) {
    body.attendees = attendeeEmails.map((email) => ({ email }));
    // Send email notifications to attendees
    body.sendUpdates = "all";
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Calendar event create failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as {
    id: string;
    start?: { dateTime: string };
    end?: { dateTime: string };
  };

  return {
    id: data.id,
    start: data.start?.dateTime ?? start,
    end: data.end?.dateTime ?? end,
  };
}
