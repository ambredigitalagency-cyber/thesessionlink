/**
 * A vCard 3.0, the format every phone's contacts app opens. Values are
 * escaped as the format requires (backslash, comma, semicolon, newline), so a
 * name with a comma cannot break the card into extra fields.
 */
function escape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildVcard(contact: {
  name: string;
  title?: string | null;
  phone?: string | null;
  email?: string | null;
  url: string;
}): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escape(contact.name)}`,
    `N:;${escape(contact.name)};;;`,
    contact.title ? `TITLE:${escape(contact.title)}` : null,
    contact.phone ? `TEL;TYPE=CELL:${escape(contact.phone)}` : null,
    contact.email ? `EMAIL;TYPE=INTERNET:${escape(contact.email)}` : null,
    `URL:${escape(contact.url)}`,
    "END:VCARD",
  ];
  return `${lines.filter(Boolean).join("\r\n")}\r\n`;
}

/** "atelier-sofia.vcf" — the slug is already [a-z0-9-]. */
export function vcardFilename(slug: string): string {
  return `${slug.replace(/[^a-z0-9-]/g, "") || "contact"}.vcf`;
}
