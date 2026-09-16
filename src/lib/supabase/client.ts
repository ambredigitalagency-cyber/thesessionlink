"use client";

import { createBrowserClient } from "@supabase/ssr";

import { supabasePublishableKey, supabaseUrl } from "@/lib/env";

import type { Database } from "./database.types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Singleton browser client (used for auth state and direct Storage uploads). */
export function getSupabaseBrowserClient() {
  browserClient ??= createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
  return browserClient;
}
