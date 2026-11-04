import { after, NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { recordEvent } from "@/lib/tracking/record";

/**
 * Page statistics, one event per beacon.
 *
 * Always answers 204 at once, whatever happened: a visitor's page must never
 * wait on, or break because of, its own statistics. The body is the little
 * the browser knows (which page, which block, the ?src= and the referrer);
 * everything else is decided on the server. Contacts sent through the
 * request forms are recorded where the email is sent, not here.
 */
const bodySchema = z.object({
  p: z.uuid(),
  t: z.enum(["view", "click", "contact"]),
  b: z.uuid().nullish(),
  k: z.enum(["whatsapp", "call", "email", "vcard"]).nullish(),
  s: z.string().max(60).nullish(),
  r: z.string().max(500).nullish(),
});

const done = () => new NextResponse(null, { status: 204 });

export async function POST(request: NextRequest) {
  const raw = await request.text().catch(() => "");
  if (!raw || raw.length > 2000) return done();

  let body: z.infer<typeof bodySchema>;
  try {
    const parsed = bodySchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return done();
    body = parsed.data;
  } catch {
    return done();
  }
  if ((body.t === "contact") !== Boolean(body.k)) return done();
  if (body.t === "view" && body.b) return done();

  // Written once the response has left: the beacon never waits on the database.
  const headers = new Headers(request.headers);
  after(() =>
    recordEvent({
      headers,
      profileId: body.p,
      type: body.t,
      blockId: body.b ?? null,
      contactKind: body.t === "contact" ? (body.k ?? null) : null,
      src: body.s,
      referrer: body.r,
    }),
  );
  return done();
}
