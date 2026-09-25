/**
 * Refuses to start a local server that is wired to a hosted database.
 *
 * WHY THIS EXISTS
 * ---------------
 * `next start` runs with NODE_ENV=production, so it reads
 * `.env.production.local` before `.env.local` — the file that holds the real
 * project's credentials. Running `npm start` on a laptop therefore serves the
 * production database by default, which is the opposite of what anyone typing
 * it expects. It happened here: a browser test pointed at what looked like a
 * local server and was in fact talking to production. Nothing was written that
 * time, because the sign-in link had been minted against the local database
 * and was rejected. That was luck, not design.
 *
 * WHY AS A `prestart` HOOK AND NOT A CHECK INSIDE THE APP
 * ------------------------------------------------------
 * It has to catch `npm start` without touching anything else:
 *
 *   - `next build` must keep working against the production values — that is
 *     how the deployable bundle is produced, and a guard inside the app would
 *     fail the build on this machine.
 *   - `next dev` is already safe: in development Next never reads
 *     `.env.production.local`.
 *   - Vercel never runs `npm start`. It builds and serves through its own
 *     runtime, so this hook cannot affect the real deployment — which is the
 *     property that makes a guard worth having rather than worth fearing.
 *
 * A `prestart` script is the only point that sees exactly the one command
 * that is dangerous, costs nothing at runtime, and cannot reach production.
 *
 * WHAT IT CHECKS
 * --------------
 * Not a hard-coded project reference, which would rot the day the project is
 * renamed or a second one appears. The rule is the one that actually matters:
 * *this machine is not a deployment, and the database it is about to use is
 * not on this machine.* Any hosted Supabase project is refused, including a
 * future staging one, and the message names the project it found.
 */

import { existsSync, readFileSync } from "node:fs";

const KEY = "NEXT_PUBLIC_SUPABASE_URL";

/**
 * Resolves a variable the way `next start` will: process env first, then the
 * .env files in Next's documented order, stopping at the first hit.
 */
function resolve(key) {
  if (process.env[key]) return { value: process.env[key], from: "the shell environment" };

  // NODE_ENV is "production" for every next command that is not `next dev`.
  const files = [".env.production.local", ".env.local", ".env.production", ".env"];

  for (const file of files) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const at = trimmed.indexOf("=");
      if (at === -1 || trimmed.slice(0, at).trim() !== key) continue;
      const value = trimmed
        .slice(at + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (value) return { value, from: file };
    }
  }

  return { value: "", from: null };
}

/** A deployment platform sets these; a laptop does not. */
const isDeployment = Boolean(process.env.VERCEL || process.env.CI);

/** Anything that is not on this machine. */
function hostedProject(url) {
  try {
    const { hostname } = new URL(url);
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") return null;
    return hostname.endsWith(".supabase.co") ? hostname.split(".")[0] : hostname;
  } catch {
    return null;
  }
}

const { value, from } = resolve(KEY);
const hosted = hostedProject(value);

if (isDeployment || !hosted) {
  process.exit(0);
}

if (process.env.ALLOW_REMOTE_SUPABASE === "1") {
  console.warn(
    `\n  ⚠  Serving a LOCAL build against the hosted Supabase project "${hosted}".` +
      `\n     ALLOW_REMOTE_SUPABASE=1 is set, so this is allowed. Every write is real.\n`,
  );
  process.exit(0);
}

console.error(
  [
    "",
    "  ✗  Refusing to start: this would serve the hosted database.",
    "",
    `     ${KEY} resolves to the Supabase project "${hosted}",`,
    `     read from ${from ?? "nowhere"}.`,
    "",
    "     `next start` runs with NODE_ENV=production, so it reads",
    "     .env.production.local before .env.local. On this machine that means",
    "     a local server writing to the real database.",
    "",
    "     Serve the production build against your local Supabase:",
    "",
    "         npm run build:local && npm run start:local",
    "",
    "     (both, not just the second: NEXT_PUBLIC_* values are baked into the",
    "      bundle at build time, so serving an existing build with local",
    "      variables would still call the hosted project.)",
    "",
    "     Or, if you genuinely mean to touch the hosted database:",
    "",
    "         ALLOW_REMOTE_SUPABASE=1 npm start",
    "",
    "     (`npm run dev` is unaffected — in development Next never reads",
    "      .env.production.local.)",
    "",
  ].join("\n"),
);

process.exit(1);
