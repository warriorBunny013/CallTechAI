/**
 * Organisation resolution for multi-tenant access.
 * All dashboard and API logic should filter by organisation_id from this helper.
 *
 * NOTE: We use the service-role client for organisation_members lookups because
 * this app uses Clerk for authentication (not Supabase native auth). Without a
 * Supabase session, auth.uid() returns null and RLS policies block anon-key reads.
 * Application-level security is enforced by always scoping queries to the resolved
 * organisation_id.
 */

import { getSupabaseService } from "@/lib/supabase/service";

/**
 * Get the current user's primary organisation ID (first org they belong to).
 * Use this in API routes to scope all queries by organisation_id.
 */
export async function getOrganisationIdForUser(userId: string): Promise<string | null> {
  const supabase = getSupabaseService();
  const { data, error } = await supabase
    .from("organisation_members")
    .select("organisation_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error || !data) return null;
  return (data as { organisation_id: string }).organisation_id;
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
  const supabase = getSupabaseService();
  const { data, error } = await supabase
    .from("organisation_members")
    .select("id")
    .eq("user_id", userId)
    .eq("organisation_id", organisationId)
    .single();

  return !error && !!data;
}
