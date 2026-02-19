/**
 * Organisation resolution for multi-tenant access.
 * All dashboard and API logic should filter by organisation_id from this helper.
 */

import { createClient } from "@/lib/supabase/server";

/**
 * Get the current user's primary organisation ID (first org they belong to).
 * Use this in API routes to scope all queries by organisation_id.
 */
export async function getOrganisationIdForUser(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organisation_members")
    .select("organisation_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data.organisation_id as string;
}

/**
 * Get current user and their organisation ID. Returns null if not authenticated or no org.
 */
export async function getCurrentUserAndOrg(): Promise<{
  userId: string;
  organisationId: string;
} | null> {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  if (!user) return null;

  const organisationId = await getOrganisationIdForUser(user.id);
  if (!organisationId) return null;

  return { userId: user.id, organisationId };
}

/**
 * Ensure the current user has access to the given organisation (is a member).
 */
export async function userBelongsToOrganisation(
  userId: string,
  organisationId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organisation_members")
    .select("id")
    .eq("user_id", userId)
    .eq("organisation_id", organisationId)
    .single();

  return !error && !!data;
}
