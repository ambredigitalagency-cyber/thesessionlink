import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
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
