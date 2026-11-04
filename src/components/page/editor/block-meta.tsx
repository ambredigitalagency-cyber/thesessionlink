import {
  AtSign,
  BriefcaseBusiness,
  CircleHelp,
  Clock,
  Contact,
  FileDown,
  Images,
  Link2,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  Minus,
  Phone,
  Play,
  Star,
  Tag,
  TrendingUp,
  Type,
  type LucideIcon,
} from "lucide-react";

import type { BlockType } from "@/lib/page/blocks";

/** The pictogram of each block, in the library and in the list. */
export const BLOCK_ICONS: Record<BlockType, LucideIcon> = {
  link: Link2,
  socials: AtSign,
  whatsapp: MessageCircle,
  call: Phone,
  email: Mail,
  service: BriefcaseBusiness,
  youtube: Play,
  text: Type,
  divider: Minus,
  faq: CircleHelp,
  reviews: Star,
  hours: Clock,
  gallery: Images,
  pricing: Tag,
  address: MapPin,
  file: FileDown,
  announcement: Megaphone,
  stats: TrendingUp,
  vcard: Contact,
};

/**
 * The pictogram drawn as a small coral tile: the icon on a soft wash, a
 * second, offset tile behind it for depth. Same family as the offer wizard's
 * cards, at the size a library of nineteen needs.
 */
export function BlockGlyph({ type, size = "md" }: { type: BlockType; size?: "sm" | "md" }) {
  const Icon = BLOCK_ICONS[type];
  const box = size === "sm" ? "size-9" : "size-12";
  return (
    <span aria-hidden className={`relative inline-flex ${box} shrink-0`}>
      <span className="absolute inset-0 translate-x-1 translate-y-1 rounded-[12px] bg-[color-mix(in_oklab,var(--color-brand)_14%,transparent)]" />
      <span className="relative flex size-full items-center justify-center rounded-[12px] border border-[color-mix(in_oklab,var(--color-brand)_28%,transparent)] bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
        <Icon className={size === "sm" ? "size-4" : "size-5"} strokeWidth={1.9} />
      </span>
    </span>
  );
}
