/**
 * User Connection Utility
 *
 * This file demonstrates how Supabase Auth users are connected to Supabase tables.
 *
 * FLOW:
 * 1. User authenticates with Supabase Auth → Gets user ID (UUID)
 * 2. User ID is used as user_id in all Supabase tables
 * 3. All queries filter by user_id to ensure data isolation
 */

import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

/**
 * Get the current authenticated user's ID (Supabase Auth UUID)
 *
 * This ID is used throughout the application to:
 * - Filter Supabase queries
 * - Link user data across all tables
 * - Ensure data isolation between users
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

/**
 * Example: How to query user-specific data
 * 
 * This shows the pattern used throughout the app:
 * 1. Get userId from Supabase Auth
 * 2. Filter Supabase query by user_id
 * 3. Only return data belonging to that user
 */
export async function getUserIntents(userId: string) {
  // This query automatically filters to only this user's intents
  const { data, error } = await supabase
    .from("intents")
    .select("*")
    .eq("user_id", userId)  // ← This is the connection point!
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch intents: ${error.message}`);
  }

  return data;
}

/**
 * Example: How to create user-specific data
 * 
 * Always include user_id when inserting new records
 */
export async function createUserIntent(
  userId: string,
  intentData: {
    intent_name: string;
    example_user_phrases: string[];
    english_responses: string[];
    russian_responses: string[];
  }
) {
  // Always include user_id when creating records
  const { data, error } = await supabase
    .from("intents")
    .insert({
      user_id: userId,  // ← Links this intent to the user
      ...intentData,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create intent: ${error.message}`);
  }

  return data;
}

/**
 * Example: How to verify ownership before updating/deleting
 * 
 * Always verify the record belongs to the user before modifying
 */
export async function updateUserIntent(
  userId: string,
  intentId: string,
  updates: Partial<{
    intent_name: string;
    example_user_phrases: string[];
    english_responses: string[];
    russian_responses: string[];
  }>
) {
  // First, verify ownership
  const { data: existing, error: checkError } = await supabase
    .from("intents")
    .select("id")
    .eq("id", intentId)
    .eq("user_id", userId)  // ← Verify it belongs to this user
    .single();

  if (checkError || !existing) {
    throw new Error("Intent not found or unauthorized");
  }

  // Then update (with user_id filter for safety)
  const { data, error } = await supabase
    .from("intents")
    .update(updates)
    .eq("id", intentId)
    .eq("user_id", userId)  // ← Double-check in update query
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update intent: ${error.message}`);
  }

  return data;
}

/**
 * Data Relationship Diagram (as code comments):
 * 
 * ┌─────────────────────────────────────────────────────────┐
 * │                 SUPABASE AUTH                            │
 * │  User: UUID (e.g. 550e8400-e29b-41d4-a716-446655440000)  │
 * │  Email: user1@gmail.com                                  │
 * └────────────────────┬────────────────────────────────────┘
 *                      │
 *                      │ user_id = UUID
 *                      │
 *                      ▼
 * ┌─────────────────────────────────────────────────────────┐
 * │                  SUPABASE TABLES                         │
 * │                                                          │
 * │  profiles, subscriptions, intents, assistant_settings,   │
 * │  assistants, etc. — all use user_id (Supabase Auth UUID) │
 * └─────────────────────────────────────────────────────────┘
 *
 * KEY POINT: The user_id column in every table is the connection
 *            between Supabase Auth and app data.
 */

/**
 * Example: Complete flow in an API route
 */
export async function exampleApiRouteFlow() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  const { data: intents } = await supabase
    .from("intents")
    .select("*")
    .eq("user_id", user.id);
  return intents;
}

/**
 * Summary:
 *
 * 1. Supabase Auth provides: user id (UUID)
 * 2. Supabase stores: user_id in every table
 * 3. Connection: user_id column links auth users to app data
 * 4. Isolation: All queries filter by user_id
 * 5. Security: Users can only access their own user_id
 */

