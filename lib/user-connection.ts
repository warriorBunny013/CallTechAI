/**
 * User Connection Utility
 * 
 * This file demonstrates how Clerk users are connected to Supabase tables.
 * 
 * FLOW:
 * 1. User authenticates with Clerk → Gets Clerk User ID
 * 2. Clerk User ID is used as user_id in all Supabase tables
 * 3. All queries filter by user_id to ensure data isolation
 */

import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

/**
 * Get the current authenticated user's Clerk User ID
 * 
 * Example return: "user_2abc123xyz456"
 * 
 * This ID is used throughout the application to:
 * - Filter Supabase queries
 * - Link user data across all tables
 * - Ensure data isolation between users
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/**
 * Example: How to query user-specific data
 * 
 * This shows the pattern used throughout the app:
 * 1. Get userId from Clerk
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
      user_id: userId,  // ← Links this intent to the Clerk user
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
 * │                    CLERK (External)                    │
 * │  User: user_2abc123xyz                                  │
 * │  Email: user1@gmail.com                                 │
 * └────────────────────┬────────────────────────────────────┘
 *                      │
 *                      │ user_id = "user_2abc123xyz"
 *                      │
 *                      ▼
 * ┌─────────────────────────────────────────────────────────┐
 * │                  SUPABASE TABLES                         │
 * │                                                          │
 * │  subscriptions                                           │
 * │    user_id: "user_2abc123xyz" ──┐                       │
 * │                                  │                       │
 * │  intents                          │                       │
 * │    user_id: "user_2abc123xyz" ───┼─── All linked by     │
 * │                                  │    same user_id      │
 * │  assistant_settings              │                       │
 * │    user_id: "user_2abc123xyz" ───┤                       │
 * │                                  │                       │
 * │  assistants                       │                       │
 * │    user_id: "user_2abc123xyz" ───┘                       │
 * └─────────────────────────────────────────────────────────┘
 * 
 * KEY POINT: The user_id column in every table is the connection
 *            between Clerk authentication and Supabase data.
 */

/**
 * Example: Complete flow in an API route
 * 
 * This is how it works in practice:
 */
export async function exampleApiRouteFlow() {
  // Step 1: Get Clerk User ID from authentication
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error("Unauthorized");
  }
  
  // Step 2: Use userId to query user-specific data
  const { data: intents } = await supabase
    .from("intents")
    .select("*")
    .eq("user_id", userId);  // ← This ensures data isolation
  
  // Step 3: Return only this user's data
  return intents;
}

/**
 * Summary:
 * 
 * 1. Clerk provides: user_id (e.g., "user_2abc123xyz")
 * 2. Supabase stores: user_id in every table
 * 3. Connection: user_id column links Clerk users to Supabase data
 * 4. Isolation: All queries filter by user_id
 * 5. Security: Users can only access their own user_id
 * 
 * This creates a clean, secure multi-user system where each user
 * has their own isolated dashboard and data.
 */

