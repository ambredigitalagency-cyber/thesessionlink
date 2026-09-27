import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { adminDb, currentAdmin } from "@/lib/admin/access";
import {
  EXPORT_COLUMNS,
  EXPORT_KINDS,
  columnsOf,
  exportFilename,
  toCsv,
  type ExportKind,
} from "@/lib/admin/export";

/**
 * A coach's data, as a file: /admin/coaches/<id>/export?format=json (offers,
 * clients and bookings together) or ?format=csv&kind=offers|clients|bookings.
 *
 * Same doors as the rest of the console; anyone else gets the same 404 as a
 * console page would. Every download is journaled. Health notes never leave:
 * the columns are listed in lib/admin/export.ts, not taken from the table.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentAdmin();
  if (!actor) return new NextResponse("Not found", { status: 404 });

  const { id } = await params;
  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "csv" ? "csv" : "json";
  const kind = url.searchParams.get("kind") as ExportKind | null;
  if (format === "csv" && (!kind || !EXPORT_KINDS.includes(kind))) {
    return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
  }

  const supabase = await adminDb(actor);
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, slug")
    .eq("id", id)
    .maybeSingle();
  if (!profile) return new NextResponse("Not found", { status: 404 });

  const kinds = format === "csv" ? [kind as ExportKind] : [...EXPORT_KINDS];
  const data: Partial<Record<ExportKind, Record<string, unknown>[]>> = {};
  // The table is chosen at runtime, which the generated types cannot follow;
  // the columns are the fixed lists above either way.
  const untyped = supabase as unknown as SupabaseClient;
  for (const item of kinds) {
    const { data: rows, error } = await untyped
      .from(item)
      .select(EXPORT_COLUMNS[item] as string)
      .eq("profile_id", id)
      .order("created_at", { ascending: true })
      .limit(10000);
    if (error) {
      console.error("[admin] export read failed", item, error.code);
      return NextResponse.json({ error: "unexpected" }, { status: 500 });
    }
    data[item] = (rows ?? []) as unknown as Record<string, unknown>[];
  }

  const { error: auditError } = await supabase.from("admin_audit_log").insert({
    admin_user_id: actor.kind === "member" ? actor.userId : null,
    via: actor.kind,
    action: "export_data",
    target_profile_id: id,
    details: {
      format,
      kinds,
      rows: Object.fromEntries(kinds.map((item) => [item, data[item]?.length ?? 0])),
    },
  });
  if (auditError) console.error("[admin] audit write failed", "export_data", auditError.code);

  const filename = exportFilename(
    profile.slug,
    format === "csv" ? (kind as ExportKind) : "all",
    format,
  );
  const body =
    format === "csv"
      ? toCsv(data[kind as ExportKind] ?? [], columnsOf(kind as ExportKind))
      : JSON.stringify(
          { profile: profile.slug, exported_at: new Date().toISOString(), ...data },
          null,
          2,
        );

  return new NextResponse(body, {
    headers: {
      "Content-Type":
        format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
