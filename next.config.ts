import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * A malformed NEXT_PUBLIC_SUPABASE_URL (a bare host, a trailing typo) used to
 * throw here and fail the whole build before a single file was compiled, with
 * only "Invalid URL" to go on. Remote images are a nice-to-have, so warn and
 * carry on instead.
 */
function readSupabaseStorage():
  { protocol: "http" | "https"; hostname: string; port: string } | undefined {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    // The local stack is served over http on a non-default port; hard-coding
    // https here made every uploaded image throw "hostname is not configured"
    // in development, which crashes the page that renders it.
    return {
      protocol: url.protocol === "http:" ? "http" : "https",
      hostname: url.hostname,
      port: url.port,
    };
  } catch {
    console.warn(
      `[next.config] NEXT_PUBLIC_SUPABASE_URL is not a valid URL (${raw}). ` +
        "Expected something like https://<ref>.supabase.co. " +
        "Remote images from Supabase Storage will not be optimised.",
    );
    return undefined;
  }
}

const supabaseStorage = readSupabaseStorage();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseStorage
      ? [{ ...supabaseStorage, pathname: "/storage/v1/object/public/**" }]
      : [],
    // Local Supabase storage during development.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
    localPatterns: [{ pathname: "/**" }],
  },
  experimental: {
    // Server Actions receive image/profile payloads from the offer editor.
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default withNextIntl(nextConfig);
