/**
 * Google Calendar API helpers: OAuth token refresh, freebusy query, event creation.
 * Tokens are stored per organisation in organisation_calendar_connections.
 */

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
 * Get a valid access token: use existing if not expired, else refresh.
 */
export async function getValidAccessToken(
  connection: CalendarConnection,
  clientId: string,
  clientSecret: string
): Promise<string | null> {
  const expiry = connection.token_expiry ? new Date(connection.token_expiry).getTime() : 0;
  const now = Date.now();
  if (connection.access_token && expiry > now + 60_000) {
    return connection.access_token;
  }
  if (!connection.refresh_token) return null;
  const refreshed = await refreshGoogleTokens(
    connection.refresh_token,
    clientId,
    clientSecret
  );
  return refreshed?.access_token ?? null;
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
  const cal = data.calendars?.[calendarId];
  return { busy: cal?.busy ?? [] };
}

/**
 * Create a calendar event and return the event id and start/end.
 */
export async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  summary: string,
  start: string,
  end: string,
  description?: string
): Promise<{ id: string; start: string; end: string }> {
  const url = GOOGLE_CALENDAR_EVENTS(calendarId);
  const body = {
    summary,
    description: description ?? "",
    start: { dateTime: start, timeZone: "UTC" },
    end: { dateTime: end, timeZone: "UTC" },
  };

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

  const data = (await res.json()) as { id: string; start?: { dateTime: string }; end?: { dateTime: string } };
  return {
    id: data.id,
    start: data.start?.dateTime ?? start,
    end: data.end?.dateTime ?? end,
  };
}
