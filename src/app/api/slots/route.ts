import { NextResponse, type NextRequest } from "next/server";

import { getAvailableSlots } from "@/lib/public/booking-context";

/**
 * Public slot list for one offer. Returns absolute instants; the browser
 * formats them in the visitor's timezone.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const offerId = searchParams.get("offer");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  if (!offerId) {
    return NextResponse.json({ error: "missing_offer" }, { status: 400 });
  }

  const from = fromParam ? new Date(fromParam) : new Date();
  const to = toParam ? new Date(toParam) : new Date(Date.now() + 30 * 24 * 3600_000);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
    return NextResponse.json({ error: "invalid_window" }, { status: 400 });
  }

  const result = await getAvailableSlots(offerId, from, to);
  if (!result) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      timezone: result.timezone,
      durationMinutes: result.config.duration_minutes,
      slots: result.slots.map((slot) => ({
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
