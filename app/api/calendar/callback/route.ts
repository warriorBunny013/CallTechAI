/**
 * Google OAuth callback: exchange code → store tokens → create VAPI custom function
 * tools → assign them to the assistant → save tool IDs to Supabase.
 *
 * Custom function tools (type: "function") call OUR API endpoints (/api/vapi-tools/...).
 * This means NO VAPI Google OAuth is needed — we use our own stored Google tokens.
 *
 * Full flow:
 *  1. Exchange Google auth code for access + refresh tokens
 *  2. Fetch real primary calendar ID (user's email)
 *  3. Save tokens + calendar ID to Supabase
 *  4. Delete any stale VAPI tool entities from a previous connection
 *  5. Create two VAPI custom function tool entities (POST /tool) → get IDs
 *  6. Assign those IDs to the assistant via model.toolIds
 *  7. Also add inline model.tools as fallback
 *  8. Persist new tool IDs in Supabase vapi_tool_ids
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";
import { buildBookingTools } from "@/lib/vapi-booking-tools";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const BOOKINGS_URL = "/dashboard/bookings";
const VAPI_BASE = "https://api.vapi.ai";

// ── Google helpers ────────────────────────────────────────────────────────────

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

// ── VAPI helpers ─────────────────────────────────────────────────────────────

/**
 * Create a single VAPI custom function tool entity.
 * Returns the new tool ID or null on failure.
 */
async function createVapiCustomTool(
  vapiApiKey: string,
  tool: ReturnType<typeof buildBookingTools>[number]
): Promise<string | null> {
  try {
    const body = {
      type: "function",
      function: tool.function,
      server: tool.server,
    };

    console.log(
      `[calendar/callback] POST /tool "${tool.function.name}":`,
      JSON.stringify({ name: tool.function.name, url: tool.server.url })
    );

    const res = await fetch(`${VAPI_BASE}/tool`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vapiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();

    if (!res.ok) {
      console.error(
        `[calendar/callback] POST /tool "${tool.function.name}" failed (${res.status}):`,
        text
      );
      return null;
    }

    let data: { id?: string } = {};
    try {
      data = JSON.parse(text);
    } catch {
      console.error(`[calendar/callback] POST /tool non-JSON response:`, text);
      return null;
    }

    console.log(`[calendar/callback] Created tool entity "${tool.function.name}" → id: ${data.id}`);
    return data.id ?? null;
  } catch (e) {
    console.error(`[calendar/callback] POST /tool "${tool.function.name}" exception:`, e);
    return null;
  }
}

/**
 * Assign tool entity IDs to the assistant via model.toolIds ONLY.
 * We do NOT also add inline model.tools — using both causes duplicate calls.
 * Preserves all existing model fields and non-calendar toolIds.
 */
async function assignToolsToAssistant(
  vapiApiKey: string,
  assistantId: string,
  newToolIds: string[],
  oldToolIds: string[]
): Promise<void> {
  try {
    // Fetch the full current assistant model
    const getRes = await fetch(`${VAPI_BASE}/assistant/${encodeURIComponent(assistantId)}`, {
      headers: { Authorization: `Bearer ${vapiApiKey}` },
    });

    if (!getRes.ok) {
      console.error("[calendar/callback] GET /assistant failed:", getRes.status);
      return;
    }

    const assistant = (await getRes.json()) as {
      model?: Record<string, unknown> & {
        tools?: Array<{ function?: { name?: string }; name?: string }>;
        toolIds?: string[];
      };
    };

    const currentModel = assistant.model ?? {};

    // toolIds: remove old calendar IDs, add new ones
    const existingToolIds: string[] = (currentModel.toolIds as string[]) ?? [];
    const filteredToolIds = existingToolIds.filter((id) => !oldToolIds.includes(id));
    const mergedToolIds = [...new Set([...filteredToolIds, ...newToolIds])];

    // Remove any stale inline booking tools (cleanup from old approach)
    const BOOKING_NAMES = new Set(["checkAvailability", "scheduleAppointment"]);
    const existingInlineTools = (currentModel.tools as Array<{ function?: { name?: string }; name?: string }>) ?? [];
    const cleanedInlineTools = existingInlineTools.filter((t) => {
      const name = t.function?.name ?? t.name ?? "";
      return !BOOKING_NAMES.has(name);
    });

    const patchRes = await fetch(`${VAPI_BASE}/assistant/${encodeURIComponent(assistantId)}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${vapiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Ensure silence timeout is long enough for tool calls to complete
        silenceTimeoutSeconds: 60,
        maxDurationSeconds: 3600,
        model: {
          ...currentModel,
          toolIds: mergedToolIds,
          // Keep cleaned inline tools (other non-booking tools), remove stale booking ones
          ...(cleanedInlineTools.length !== existingInlineTools.length
            ? { tools: cleanedInlineTools }
            : {}),
        },
      }),
    });

    if (!patchRes.ok) {
      const text = await patchRes.text();
      console.error("[calendar/callback] PATCH /assistant failed:", patchRes.status, text);
    } else {
      console.log(
        `[calendar/callback] Assistant ${assistantId} updated — toolIds: [${mergedToolIds.join(", ")}]`
      );
    }
  } catch (e) {
    console.error("[calendar/callback] assignToolsToAssistant error:", e);
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

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

  // ── 1. Exchange auth code for tokens ─────────────────────────────────────
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

  // ── 2. Get real primary calendar ID ─────────────────────────────────────
  const realCalendarId = await fetchPrimaryCalendarId(tokens.access_token);
  const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const supabase = getSupabaseService();

  // ── 3. Read old tool IDs for cleanup ─────────────────────────────────────
  const { data: existingConn } = await supabase
    .from("organisation_calendar_connections")
    .select("vapi_tool_ids")
    .eq("organisation_id", organisationId)
    .maybeSingle();

  const oldToolIds: string[] =
    ((existingConn as Record<string, unknown> | null)?.vapi_tool_ids as string[]) ?? [];

  // ── 4. Save tokens + calendar ID to Supabase ─────────────────────────────
  const { error: upsertError } = await supabase
    .from("organisation_calendar_connections")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(
      {
        organisation_id: organisationId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_expiry: expiry,
        calendar_id: realCalendarId,
        vapi_tool_ids: [] as string[],
        updated_at: new Date().toISOString(),
      } as Record<string, unknown> as never,
      { onConflict: "organisation_id" }
    );

  if (upsertError) {
    console.error("[calendar/callback] Upsert error:", upsertError);
    return NextResponse.redirect(
      new URL(`${BOOKINGS_URL}?calendar=error&reason=db_error`, baseUrl)
    );
  }

  // ── 5. VAPI tool creation ─────────────────────────────────────────────────
  const vapiApiKey = process.env.VAPI_API_KEY;
  if (!vapiApiKey) {
    console.warn("[calendar/callback] VAPI_API_KEY not set — skipping tool creation");
    return NextResponse.redirect(new URL(`${BOOKINGS_URL}?calendar=connected`, baseUrl));
  }

  try {
    const { data: org } = await supabase
      .from("organisations")
      .select("selected_voice_agent_id")
      .eq("id", organisationId)
      .maybeSingle();

    const assistantId =
      (org as { selected_voice_agent_id?: string | null } | null)?.selected_voice_agent_id ?? null;

    // Delete stale tool entities from a previous connection
    if (oldToolIds.length > 0) {
      await Promise.allSettled(
        oldToolIds.map((id) =>
          fetch(`${VAPI_BASE}/tool/${encodeURIComponent(id)}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${vapiApiKey}` },
          }).then((r) => {
            if (r.ok) console.log(`[calendar/callback] Deleted old tool entity: ${id}`);
            else console.warn(`[calendar/callback] Delete tool ${id} returned ${r.status}`);
          })
        )
      );
    }

    // Build tool definitions pointing to our API endpoints
    const toolDefs = buildBookingTools(baseUrl);

    // Create each tool entity in VAPI (shows up in Tools section)
    const [checkAvailId, scheduleId] = await Promise.all(
      toolDefs.map((t) => createVapiCustomTool(vapiApiKey, t))
    );

    const newToolIds = [checkAvailId, scheduleId].filter(Boolean) as string[];

    console.log(`[calendar/callback] Created VAPI tool entities: [${newToolIds.join(", ")}]`);

    // Save new tool IDs to Supabase
    if (newToolIds.length > 0) {
      await supabase
        .from("organisation_calendar_connections")
        .update({ vapi_tool_ids: newToolIds } as Record<string, unknown> as never)
        .eq("organisation_id", organisationId);

      console.log(`[calendar/callback] Saved vapi_tool_ids to Supabase: [${newToolIds.join(", ")}]`);
    }

    // Assign tool entity IDs to the assistant via model.toolIds
    if (assistantId) {
      await assignToolsToAssistant(
        vapiApiKey,
        assistantId,
        newToolIds,
        oldToolIds
      );
    } else {
      console.warn(
        "[calendar/callback] No assistant found yet — tools created and saved, will be assigned when assistant is created"
      );
    }

    console.log(
      `[calendar/callback] VAPI setup complete — calendarId: ${realCalendarId}, ` +
        `tool entities: [${newToolIds.join(", ")}], assistantId: ${assistantId ?? "none"}`
    );
  } catch (e) {
    console.error("[calendar/callback] VAPI tool setup error (non-fatal):", e);
  }

  return NextResponse.redirect(new URL(`${BOOKINGS_URL}?calendar=connected`, baseUrl));
}
