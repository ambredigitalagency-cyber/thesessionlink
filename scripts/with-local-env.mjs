/**
 * Runs a Next command against the LOCAL Supabase.
 *
 *     node scripts/with-local-env.mjs build
 *     node scripts/with-local-env.mjs start
 *
 * `next build` and `next start` both run with NODE_ENV=production, so they
 * read `.env.production.local` — the real project's credentials — before
 * `.env.local`. Putting the local values in the process environment is the
 * only thing that outranks a .env file, so that is what this does.
 *
 * WHY `start` ALONE IS NOT ENOUGH
 * ------------------------------
 * `NEXT_PUBLIC_*` variables are not read at runtime. Next substitutes them
 * into the code at build time, in server chunks as well as client ones, so a
 * bundle built against the hosted project keeps calling the hosted project no
 * matter what the environment says when it is served. Serving such a bundle
 * with local variables exported looks local, boots cleanly, and quietly talks
 * to production — which is worse than failing outright.
 *
 * So `start` refuses to serve a build that was not made with these same
 * variables. The check is the build itself, not a flag someone remembered to
 * pass: it greps the emitted chunks for a hosted project reference.
 */

import { spawn } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const FILE = ".env.local";
const NEXT_BIN = path.join("node_modules", "next", "dist", "bin", "next");

if (!existsSync(FILE)) {
  console.error(`\n  ✗  ${FILE} not found. Copy .env.example and fill it in first.\n`);
  process.exit(1);
}

const local = {};
for (const line of readFileSync(FILE, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const at = trimmed.indexOf("=");
  if (at === -1) continue;
  local[trimmed.slice(0, at).trim()] = trimmed
    .slice(at + 1)
    .trim()
    .replace(/^["']|["']$/g, "");
}

const url = local.NEXT_PUBLIC_SUPABASE_URL;
if (!url) {
  console.error(`\n  ✗  ${FILE} has no NEXT_PUBLIC_SUPABASE_URL.\n`);
  process.exit(1);
}

const args = process.argv.slice(2);

/**
 * Every hosted Supabase project named in the build output.
 *
 * Executable chunks only — never `.js.map`. The supabase-js source carries
 * documentation examples (`xyzcompany.supabase.co`, `myproject.supabase.co`),
 * which survive into the source maps and would make every build look hosted.
 * They never reach the chunks that actually run, which is the difference that
 * makes this check mean something. Adding `.map` here would turn it into a
 * function that always says no.
 */
function hostedProjectsInBuild() {
  const found = new Set();
  const pattern = /https:\/\/([a-z0-9-]+)\.supabase\.co/g;

  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      let info;
      try {
        info = statSync(full);
      } catch {
        continue;
      }
      if (info.isDirectory()) walk(full);
      else if (/\.(js|mjs|json)$/.test(entry) && info.size < 8_000_000) {
        let text;
        try {
          text = readFileSync(full, "utf8");
        } catch {
          continue;
        }
        for (const [, project] of text.matchAll(pattern)) found.add(project);
      }
    }
  };

  walk(path.join(".next", "server"));
  walk(path.join(".next", "static"));
  return [...found];
}

if (args[0] === "start") {
  if (!existsSync(".next")) {
    console.error("\n  ✗  No build found. Run `npm run build:local` first.\n");
    process.exit(1);
  }

  const hosted = hostedProjectsInBuild();
  if (hosted.length > 0) {
    console.error(
      [
        "",
        "  ✗  Refusing to serve: this build was made against a hosted database.",
        "",
        `     The bundle in .next still names the Supabase project ${hosted.map((p) => `"${p}"`).join(", ")}.`,
        "",
        "     NEXT_PUBLIC_* values are baked in when the bundle is built, not read",
        "     when it is served, so exporting local variables now would change",
        "     nothing: the server would keep calling the hosted project.",
        "",
        "     Rebuild against your local Supabase first:",
        "",
        "         npm run build:local && npm run start:local",
        "",
      ].join("\n"),
    );
    process.exit(1);
  }
}

console.log(`\n  next ${args.join(" ")} against ${url} (from ${FILE})\n`);

const child = spawn(process.execPath, [NEXT_BIN, ...args], {
  stdio: "inherit",
  env: { ...process.env, ...local },
});

child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
