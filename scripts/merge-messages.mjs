/**
 * Merges a JSON fragment into messages/{locale}.json.
 * Usage: node scripts/merge-messages.mjs en fragment.json
 * Existing keys are overwritten, sibling keys are kept, output stays sorted.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const [locale, fragmentPath] = process.argv.slice(2);
const target = `messages/${locale}.json`;
const current = existsSync(target) ? JSON.parse(readFileSync(target, "utf8")) : {};
const fragment = JSON.parse(readFileSync(fragmentPath, "utf8"));

function merge(base, extra) {
  for (const [key, value] of Object.entries(extra)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      base[key] = merge(base[key] && typeof base[key] === "object" ? base[key] : {}, value);
    } else {
      base[key] = value;
    }
  }
  return base;
}

function sort(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sort(value[key])]),
  );
}

writeFileSync(target, `${JSON.stringify(sort(merge(current, fragment)), null, 2)}\n`);
console.log(`merged ${Object.keys(fragment).join(", ")} into ${target}`);
