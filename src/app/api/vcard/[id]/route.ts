import { NextResponse, type NextRequest } from "next/server";

import { siteUrl } from "@/lib/env";
import { blockSchemas } from "@/lib/page/blocks";
import { buildVcard, vcardFilename } from "@/lib/page/vcard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/utils";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The "save the contact" file of a vCard block.
 *
 * Read as a visitor: the block only comes back when it is visible on a live
 * page (the public policy), and only what that block chose to share goes in.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new NextResponse("Not found", { status: 404 });

  const supabase = await createSupabaseServerClient();
  const { data: block } = await supabase
    .from("page_blocks")
    .select("type, config, profile_id")
    .eq("id", id)
    .eq("type", "vcard")
    .eq("visible", true)
    .eq("pending", false)
    .maybeSingle();
  if (!block) return new NextResponse("Not found", { status: 404 });

  const config = blockSchemas.vcard.safeParse(block.config);
  const { data: profile } = await supabase
    .from("public_profiles")
    .select("display_name, headline, slug")
    .eq("id", block.profile_id)
    .maybeSingle();
  if (!config.success || !profile?.display_name || !profile.slug) {
    return new NextResponse("Not found", { status: 404 });
  }

  const body = buildVcard({
    name: profile.display_name,
    title: profile.headline,
    phone: config.data.phone,
    email: config.data.email,
    url: absoluteUrl(`/${profile.slug}`, siteUrl),
  });

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${vcardFilename(profile.slug)}"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
