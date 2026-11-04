import { BLOCK_TYPES, type BlockType } from "./blocks";

/**
 * Which blocks to put first in "Add a block", per activity.
 *
 * Keyed by activity_categories.slug. The rest of the library stays one tap
 * away under "All blocks"; these are only the ones a coach of that trade most
 * often reaches for. A category missing here gets the general list.
 */
export const BLOCK_SUGGESTIONS: Record<string, readonly BlockType[]> = {
  "fitness-coach": ["pricing", "gallery", "reviews", "hours"],
  "life-coach": ["reviews", "faq", "youtube", "stats"],
  "real-estate": ["gallery", "stats", "call", "address"],
  hairdresser: ["gallery", "pricing", "hours", "address"],
  beauty: ["gallery", "pricing", "hours", "address"],
  wellness: ["pricing", "hours", "address", "reviews"],
  "music-teacher": ["pricing", "youtube", "reviews", "faq"],
  tutor: ["pricing", "faq", "reviews", "file"],
  photographer: ["gallery", "pricing", "reviews", "link"],
  therapist: ["faq", "hours", "address", "text"],
  consultant: ["stats", "reviews", "file", "vcard"],
  rental: ["gallery", "pricing", "address", "faq"],
  "content-creator": ["socials", "youtube", "link", "announcement"],
};

const GENERAL: readonly BlockType[] = ["link", "socials", "whatsapp", "text"];

/** The suggested blocks first, then every other one in library order. */
export function blocksFor(categorySlug: string | null | undefined): {
  suggested: BlockType[];
  others: BlockType[];
} {
  const suggested = [...(BLOCK_SUGGESTIONS[categorySlug ?? ""] ?? GENERAL)];
  return {
    suggested,
    others: BLOCK_TYPES.filter((type) => !suggested.includes(type)),
  };
}
