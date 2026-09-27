/**
 * The console's coach data export: which columns leave, and how a CSV is
 * written. Pure, tested in export.test.ts; the route is
 * app/admin/(console)/coaches/[id]/export/route.ts.
 *
 * Column lists are explicit on purpose. A new column on the table does not
 * leave the platform because someone added it; it leaves when it is written
 * here. Clients' health notes are not written here, and never will be.
 */

export const EXPORT_KINDS = ["offers", "clients", "bookings"] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];

export const EXPORT_COLUMNS = {
  offers:
    "id, title, description, price, price_type, action_type, action_config, custom_fields, is_active, position, created_at, updated_at",
  // Everything the CRM holds except health_notes.
  clients:
    "id, name, email, phone, notes, tags, birth_date, address, custom_fields, created_at, updated_at",
  bookings:
    "id, offer_id, offer_title, action_type, client_name, client_email, client_phone, client_message, starts_at, ends_at, requested_date, quantity, status, no_show, payment_status, payment_amount_cents, payment_currency, cancelled_at, cancelled_by, created_at",
} as const satisfies Record<ExportKind, string>;

/** Written as an escape, not a literal: an invisible character in source is a trap. */
const BYTE_ORDER_MARK = "\uFEFF";

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  // Quote when the value could break the row; double the quotes inside.
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * RFC 4180 CSV with a UTF-8 byte-order mark, so Excel opens accents right
 * instead of guessing a Windows code page. Columns in the order given.
 */
export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((key) => cell(row[key])).join(",")),
  ];
  return `${BYTE_ORDER_MARK}${lines.join("\r\n")}\r\n`;
}

export function columnsOf(kind: ExportKind): string[] {
  return EXPORT_COLUMNS[kind].split(",").map((column) => column.trim());
}

/** "export-atelier-sofia-clients-2026-09-28.csv" */
export function exportFilename(
  slug: string,
  kind: ExportKind | "all",
  extension: "csv" | "json",
  now = new Date(),
) {
  return `export-${slug}-${kind}-${now.toISOString().slice(0, 10)}.${extension}`;
}
