import { Globe, type LucideProps } from "lucide-react";

import type { SocialKey } from "@/lib/validation";

/**
 * Minimal stroke glyphs for the social channels, drawn to match lucide's
 * 24×24 / 1.75 stroke style (lucide dropped brand icons).
 */
function Svg({ children, ...props }: LucideProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

const icons: Record<SocialKey, (props: LucideProps) => React.ReactElement> = {
  instagram: (props) => (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
    </Svg>
  ),
  tiktok: (props) => (
    <Svg {...props}>
      <path d="M14 3v11.2a3.8 3.8 0 1 1-3.2-3.75" />
      <path d="M14 6.2A5 5 0 0 0 19.2 10" />
    </Svg>
  ),
  linkedin: (props) => (
    <Svg {...props}>
      <path d="M16.5 9.5A5.5 5.5 0 0 1 22 15v6h-3.6v-6a1.9 1.9 0 0 0-3.8 0v6H11v-6a5.5 5.5 0 0 1 5.5-5.5Z" />
      <rect x="2.6" y="10" width="3.6" height="11" rx="0.6" />
      <circle cx="4.4" cy="5" r="1.8" />
    </Svg>
  ),
  facebook: (props) => (
    <Svg {...props}>
      <path d="M17 3h-2.5A4.5 4.5 0 0 0 10 7.5V10H7.5v4H10v7h4v-7h2.8l.7-4H14V7.6a1 1 0 0 1 1-1h2Z" />
    </Svg>
  ),
  youtube: (props) => (
    <Svg {...props}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10.4 9.6 15 12l-4.6 2.4V9.6Z" />
    </Svg>
  ),
  x: (props) => (
    <Svg {...props}>
      <path d="M4 4 20 20" />
      <path d="M20 4 4 20" />
    </Svg>
  ),
  website: (props) => <Globe {...props} />,
};

export function SocialIcon({ name, ...props }: LucideProps & { name: SocialKey }) {
  const Icon = icons[name] ?? icons.website;
  return <Icon {...props} />;
}

/** Turns a handle or a URL into a full URL. */
export function socialUrl(name: SocialKey, value: string): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const handle = trimmed.replace(/^@/, "");
  switch (name) {
    case "instagram":
      return `https://instagram.com/${handle}`;
    case "tiktok":
      return `https://tiktok.com/@${handle}`;
    case "linkedin":
      return `https://linkedin.com/in/${handle}`;
    case "facebook":
      return `https://facebook.com/${handle}`;
    case "youtube":
      return `https://youtube.com/@${handle}`;
    case "x":
      return `https://x.com/${handle}`;
    default:
      return `https://${handle}`;
  }
}
