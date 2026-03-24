/**
 * DELETE /api/calendar/disconnect
 *
 * Disconnects the org's Google Calendar:
 *   1. Reads stored vapi_tool_ids from Supabase.
 *   2. Deletes those VAPI tool entities (DELETE /tool/:id).
 *   3. Removes their IDs from the assistant's model.toolIds + model.tools.
 *   4. Deletes the calendar connection row from Supabase.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseService } from "@/lib/supabase/service";
import { getCurrentUserAndOrg } from "@/lib/org";

const VAPI_BASE = "https://api.vapi.ai";

// Names of our custom booking tools (must match lib/vapi-booking-tools.ts)
const BOOKING_TOOL_NAMES = new Set([
  "checkAvailability",
  "scheduleAppointment",
  // legacy names kept for cleanup of old connections
  "google_calendar_tool",
  "google_calendar_check_availability",
]);

export async function DELETE() {
  const userAndOrg = await getCurrentUserAndOrg();
  if (!userAndOrg) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { organisationId } = userAndOrg;
  const supabase = await createClient();
  const serviceSupabase = getSupabaseService();
  const vapiApiKey = process.env.VAPI_API_KEY;

  // ── 1. Read stored tool IDs ─────────────────────────────────────────────
  const { data: conn } = await serviceSupabase
    .from("organisation_calendar_connections")
    .select("vapi_tool_ids")
    .eq("organisation_id", organisationId)
    .maybeSingle();

  const storedToolIds: string[] =
    ((conn as Record<string, unknown> | null)?.vapi_tool_ids as string[]) ?? [];

  if (vapiApiKey) {
    // ── 2. Delete VAPI tool entities ─────────────────────────────────────
    if (storedToolIds.length > 0) {
      console.log(`[calendar/disconnect] Deleting ${storedToolIds.length} VAPI tool entities: [${storedToolIds.join(", ")}]`);

      await Promise.allSettled(
        storedToolIds.map((id) =>
          fetch(`${VAPI_BASE}/tool/${encodeURIComponent(id)}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${vapiApiKey}` },
          }).then((r) => {
            if (r.ok) console.log(`[calendar/disconnect] Deleted VAPI tool entity: ${id}`);
            else console.warn(`[calendar/disconnect] Delete tool ${id} returned ${r.status}`);
          })
        )
      );
    }

    // ── 3. Remove tool refs from the assistant ───────────────────────────
    const { data: org } = await supabase
      .from("organisations")
      .select("selected_voice_agent_id")
      .eq("id", organisationId)
      .maybeSingle();

    const assistantId =
      (org as { selected_voice_agent_id?: string | null } | null)?.selected_voice_agent_id ?? null;

    if (assistantId) {
      try {
        const getRes = await fetch(`${VAPI_BASE}/assistant/${encodeURIComponent(assistantId)}`, {
          headers: { Authorization: `Bearer ${vapiApiKey}` },
        });

        if (getRes.ok) {
          const assistantData = (await getRes.json()) as {
            model?: Record<string, unknown> & {
              tools?: Array<{ function?: { name?: string }; name?: string }>;
              toolIds?: string[];
            };
          };

          const currentModel = assistantData.model ?? {};
          const currentTools =
            (currentModel.tools as Array<{ function?: { name?: string }; name?: string }>) ?? [];
          const currentToolIds: string[] = (currentModel.toolIds as string[]) ?? [];

          // Remove booking tool names from inline tools
          const remainingTools = currentTools.filter((t) => {
            const name = t.function?.name ?? t.name ?? "";
            return !BOOKING_TOOL_NAMES.has(name);
          });

          // Remove stored tool IDs from toolIds array
          const remainingToolIds = currentToolIds.filter((id) => !storedToolIds.includes(id));

          await fetch(`${VAPI_BASE}/assistant/${encodeURIComponent(assistantId)}`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${vapiApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: {
                ...currentModel,
                tools: remainingTools,
                toolIds: remainingToolIds,
              },
            }),
          });

          console.log(
            `[calendar/disconnect] Removed booking tools from assistant ${assistantId}. ` +
              `Remaining tools: ${remainingTools.length}, remaining toolIds: [${remainingToolIds.join(", ")}]`
          );
        }
      } catch (e) {
        console.error("[calendar/disconnect] Failed to remove tools from assistant:", e);
      }
    }
  }

  // ── 4. Delete the calendar connection row ────────────────────────────────
  const { error: deleteError } = await serviceSupabase
    .from("organisation_calendar_connections")
    .delete()
    .eq("organisation_id", organisationId);

  if (deleteError) {
    console.error("[calendar/disconnect] Supabase delete error:", deleteError);
    return NextResponse.json({ error: "Failed to disconnect calendar" }, { status: 500 });
  }

  console.log(`[calendar/disconnect] Google Calendar disconnected for org: ${organisationId}`);
  return NextResponse.json({ ok: true, message: "Google Calendar disconnected successfully." });
}
