import { ImageResponse } from "next/og";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const alt = "Booking page";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ACCENTS: Record<string, string> = {
  coral: "#f2542d",
  ink: "#0c0c0d",
  forest: "#1f7a55",
  ocean: "#2563eb",
  violet: "#7c3aed",
  amber: "#b45309",
};

/** Link preview used when a pro shares their page on social or in messages. */
export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("public_profiles")
    .select("display_name, headline, location, theme, avatar_url")
    .eq("slug", slug)
    .maybeSingle();

  const theme = (profile?.theme ?? {}) as { accent?: string };
  const accent = ACCENTS[theme.accent ?? "coral"] ?? ACCENTS.coral;
  const name = profile?.display_name ?? slug;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase() ?? "")
    .join("");

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#fbfaf9",
        padding: "72px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: 26, fontWeight: 600, color: "#0c0c0d", letterSpacing: "-0.02em" }}>
          TheSessionLink
        </span>
        <span
          style={{ width: 9, height: 9, borderRadius: 99, background: accent, marginTop: 10 }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "36px" }}>
        <div
          style={{
            width: 168,
            height: 168,
            borderRadius: 999,
            background: accent,
            color: "#ffffff",
            fontSize: 64,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {initials || "?"}
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 760 }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 600,
              color: "#0c0c0d",
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
            }}
          >
            {name}
          </div>
          {profile?.headline ? (
            <div style={{ marginTop: 18, fontSize: 30, color: "#63636b", lineHeight: 1.3 }}>
              {profile.headline.slice(0, 110)}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            display: "flex",
            fontSize: 26,
            color: "#0c0c0d",
            background: "#ffffff",
            border: "1px solid #ebe8e4",
            borderRadius: 999,
            padding: "16px 28px",
          }}
        >
          thesessionlink.com/{slug}
        </div>
        {profile?.location ? (
          <div style={{ fontSize: 24, color: "#93939c" }}>{profile.location}</div>
        ) : null}
      </div>
    </div>,
    size,
  );
}
