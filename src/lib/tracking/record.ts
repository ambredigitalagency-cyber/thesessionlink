import "server-only";

import { serverEnv, siteUrl } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { resolveSource } from "./sources";
import { deviceOf, geoFrom, ipFrom, isBot, visitorHash } from "./visitor";

type RecordArgs = Database["public"]["Functions"]["record_page_event"]["Args"];

export type EventType = "view" | "click" | "contact";
export type ContactKind = "whatsapp" | "call" | "email" | "vcard" | "message" | "quote";

/** True when the request carries a Supabase session cookie (a signed-in user). */
function hasSession(cookieHeader: string | null): boolean {
  return Boolean(cookieHeader && /(^|;\s*)sb-[^=]+-auth-token/.test(cookieHeader));
}

/**
 * Records one page event from a request, or does nothing.
 *
 * Never throws: statistics must never break the page or a contact form.
 * Everything stored is derived here — the visitor code, the country, city and
 * device — and record_page_event() checks the page, the block and the rate
 * limits again in the database.
 */
export async function recordEvent(input: {
  headers: Headers;
  profileId: string;
  type: EventType;
  blockId?: string | null;
  contactKind?: ContactKind | null;
  src?: string | null;
  referrer?: string | null;
}): Promise<boolean> {
  try {
    const secret = serverEnv.trackingSecret;
    if (!secret) return false;

    const { headers } = input;
    const userAgent = headers.get("user-agent") ?? "";
    if (isBot(userAgent)) return false;
    // Prefetches and prerenders are not visits.
    const purpose = `${headers.get("sec-purpose") ?? ""} ${headers.get("purpose") ?? ""}`;
    if (/prefetch|prerender/i.test(purpose)) return false;

    // The coach looking at their own page is not a visitor. Only signed-in
    // requests pay for the lookup; a visitor has no session cookie.
    if (hasSession(headers.get("cookie"))) {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: own } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .eq("id", input.profileId)
          .maybeSingle();
        if (own) return false;
      }
    }

    const { country, city } = geoFrom(headers);
    const source = resolveSource({
      src: input.src,
      referrer: input.referrer,
      userAgent,
      ownHost: new URL(siteUrl).hostname,
    });

    const admin = createSupabaseAdminClient();
    // The generated types cannot say which arguments are nullable; these are.
    const args: Record<keyof RecordArgs, string | null> = {
      p_profile_id: input.profileId,
      p_type: input.type,
      p_block_id: input.blockId ?? null,
      p_contact_kind: input.contactKind ?? null,
      p_source: source,
      p_country: country,
      p_city: city,
      p_device: deviceOf(userAgent),
      p_visitor_hash: visitorHash({
        secret,
        ip: ipFrom(headers),
        userAgent,
        profileId: input.profileId,
      }),
    };
    const { data, error } = await admin.rpc("record_page_event", args as RecordArgs);
    if (error) {
      console.error("[track] record failed", error.code, error.message);
      return false;
    }
    return data === true;
  } catch (error) {
    console.error("[track] unexpected", error);
    return false;
  }
}
