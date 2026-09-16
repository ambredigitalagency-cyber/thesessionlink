import "server-only";

import { createClient } from "@supabase/supabase-js";

import { serverEnv, supabaseUrl } from "@/lib/env";

import type { Database } from "./database.types";

/**
 * Service-role client. Used only where RLS cannot express the rule:
 * - creating public bookings (slot validation happens in the slot engine)
 * - reading a booking from its manage token
 * - the reminder cron
 * - generating magic links
 * Never import this from client code.
 */
export function createSupabaseAdminClient() {
  const key = serverEnv.supabaseSecretKey;
  if (!key) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY (service role key). Required for public bookings and emails.",
    );
  }

  return createClient<Database>(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
