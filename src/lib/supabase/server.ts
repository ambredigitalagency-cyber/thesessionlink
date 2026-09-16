import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { supabasePublishableKey, supabaseUrl } from "@/lib/env";

import type { Database } from "./database.types";

/** Request-scoped client that carries the signed-in user's session (RLS applies). */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component: the proxy already refreshed the session.
        }
      },
    },
  });
}
