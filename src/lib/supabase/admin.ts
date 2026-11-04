import "server-only";

import { createClient } from "@supabase/supabase-js";

import { serverEnv, supabaseUrl } from "@/lib/env";

import type { Database } from "./database.types";

/**
 * Service-role client. Used only where RLS cannot express the rule:
 * - sending public requests (the coach's address is private)
 * - the deletion-warning cron
 * - generating magic links
 * Never import this from client code.
 */
export function createSupabaseAdminClient() {
  const key = serverEnv.supabaseSecretKey;
  if (!key) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY (service role key). Required for public requests and emails.",
    );
  }

  return createClient<Database>(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
