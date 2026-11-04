import type { OfferField } from "@/lib/offers/fields";
import type { ActionType } from "@/lib/offers/schema";

export type PublicOffer = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  price_type: "fixed" | "from" | "free" | "on_request";
  main_photo_url: string | null;
  /** Ordered; photos[0] is main_photo_url. Empty when the offer has none. */
  photos: string[];
  action_type: ActionType;
  action_config: unknown;
  custom_fields: OfferField[];
};

/** What the page header and its blocks need to know about the coach. */
export type PublicProfile = {
  id: string;
  slug: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  categoryName: string | null;
  /** The fallback number of WhatsApp offers that do not set their own. */
  whatsapp_number: string | null;
  currency: string;
  timezone: string;
  /** Profile-level details (experience, languages…), already parsed. */
  details: OfferField[];
  locale: "en" | "fr";
  /** First offer created: blocks are public and the page is indexed. */
  published: boolean;
};
