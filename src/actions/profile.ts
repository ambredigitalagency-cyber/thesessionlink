"use server";

import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugSchema } from "@/lib/validation";

export async function checkSlugAvailability(slug: string): Promise<{ available: boolean }> {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return { available: false };

  const user = await getCurrentUser();
  if (!user) return { available: false };

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("is_slug_available", { p_slug: parsed.data });
  return { available: data === true };
}
