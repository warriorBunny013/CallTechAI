/**
 * Supabase client with service role key. Use only in server-side code that
 * must bypass RLS (e.g. webhooks: Twilio, Vapi). Never expose this client to the client.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getServiceClient() {
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Required for webhooks (Twilio, Vapi) to write calls."
    );
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

let serviceClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseService(): ReturnType<typeof createClient> {
  if (!serviceClient) {
    serviceClient = getServiceClient();
  }
  return serviceClient;
}
