import { createClient } from "@/lib/supabase/server";

export type AuthUser = { id: string; email?: string };

/**
 * Get the current authenticated user from Supabase session (API routes, Server Components).
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return {
    id: user.id,
    email: user.email ?? undefined,
  };
}
