import { Globe, Mail, Phone, type LucideProps } from "lucide-react";

import { SocialIcon } from "@/components/brand/social-icons";
import type { Platform } from "@/lib/page/urls";

/**
 * One glyph per platform a link can point to, in lucide's 24×24 / 1.75 stroke
 * style (lucide dropped brand icons). The six the product already drew come
 * from SocialIcon; the others are drawn here the same way.
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

const extra: Partial<Record<Platform, (props: LucideProps) => React.ReactElement>> = {
  snapchat: (props) => (
    <Svg {...props}>
      <path d="M12 3c3 0 5 2.2 5 5.2v2.3l1.8.7c.5.2.5.9 0 1.1l-1.6.7c.6 1.6 1.8 2.7 3.3 3.2-.4.9-1.6 1.1-2.6 1.2-.2.5-.3 1-.6 1.3-1.2-.2-2.3.1-3.2.8-.6.4-1.3.5-2.1.5s-1.5-.1-2.1-.5c-.9-.7-2-1-3.2-.8-.3-.3-.4-.8-.6-1.3-1-.1-2.2-.3-2.6-1.2 1.5-.5 2.7-1.6 3.3-3.2l-1.6-.7c-.5-.2-.5-.9 0-1.1L7 10.5V8.2C7 5.2 9 3 12 3Z" />
    </Svg>
  ),
  telegram: (props) => (
    <Svg {...props}>
      <path d="m21 4-3.2 15.2c-.2 1-.9 1.2-1.7.8l-4.7-3.5-2.3 2.2c-.3.3-.5.4-.9.4l.3-4.8 8.7-7.9c.4-.3-.1-.5-.6-.2L5.8 13l-4.6-1.5c-1-.3-1-1 .2-1.5L19.7 3c.8-.3 1.6.2 1.3 1Z" />
    </Svg>
  ),
  whatsapp: (props) => (
    <Svg {...props}>
      <path d="M3.5 20.5 4.8 16A8.5 8.5 0 1 1 8 19.2Z" />
      <path d="M9 9.2c0 2.9 2.4 5.6 5.6 5.8l1.1-1.4-1.9-1-1 .7a4 4 0 0 1-2.2-2.2l.7-1-1-1.9Z" />
    </Svg>
  ),
  pinterest: (props) => (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10.6 9.5c.4-1.5 3.6-1.9 4.4 0 .8 2.2-.9 4.6-2.7 4.3-.9-.2-1.2-.9-1.2-.9M11.2 11.5 9.5 20" />
    </Svg>
  ),
  threads: (props) => (
    <Svg {...props}>
      <path d="M16.5 11.2C16 8.3 14.2 7 12 7c-2.8 0-4.7 2.2-4.7 5s1.9 5 4.7 5c3.4 0 4.6-2.2 4.6-3.6 0-2-1.8-2.9-4-2.9-1.9 0-3 1-3 2.2 0 1.1 1 1.9 2.3 1.9 2.3 0 3-2.2 2.7-4.7" />
      <path d="M12 21c-5 0-9-3.6-9-9s4-9 9-9c4 0 7 2.2 8 6" />
    </Svg>
  ),
  twitch: (props) => (
    <Svg {...props}>
      <path d="M4 3h16v11l-4 4h-4l-3 3v-3H5V7Z" />
      <path d="M11 7.5v4M15.5 7.5v4" />
    </Svg>
  ),
  spotify: (props) => (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M7.5 9.5c3-1 6.5-.7 9 .8M8 12.6c2.5-.7 5.2-.4 7.3.8M8.6 15.4c2-.5 3.9-.3 5.6.6" />
    </Svg>
  ),
  github: (props) => (
    <Svg {...props}>
      <path d="M9 19c-4 1.3-4-2-6-2.5M15 21v-3.4a3 3 0 0 0-.8-2.3c2.7-.3 5.5-1.3 5.5-6a4.7 4.7 0 0 0-1.3-3.2 4.4 4.4 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6 0C6.5 2.6 5.5 2.9 5.5 2.9a4.4 4.4 0 0 0-.1 3.2A4.7 4.7 0 0 0 4 9.3c0 4.6 2.8 5.6 5.5 6a3 3 0 0 0-.8 2.3V21" />
    </Svg>
  ),
};

const SOCIAL = new Set<Platform>(["instagram", "tiktok", "linkedin", "facebook", "youtube", "x"]);

export function PlatformIcon({ platform, ...props }: LucideProps & { platform: Platform }) {
  if (SOCIAL.has(platform)) {
    return <SocialIcon {...props} name={platform as "instagram"} />;
  }
  if (platform === "email") return <Mail aria-hidden {...props} />;
  if (platform === "phone") return <Phone aria-hidden {...props} />;
  const Icon = extra[platform];
  return Icon ? <Icon {...props} /> : <Globe aria-hidden {...props} />;
}

/** Display names, never translated: they are brands. */
export const PLATFORM_NAMES: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  x: "X",
  snapchat: "Snapchat",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  pinterest: "Pinterest",
  threads: "Threads",
  twitch: "Twitch",
  spotify: "Spotify",
  github: "GitHub",
  email: "E-mail",
  phone: "Phone",
  website: "Website",
};
