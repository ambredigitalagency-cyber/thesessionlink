import type { ActionType, OfferField } from "@/lib/offers/schema";
import type { SocialKey, ThemeAccent } from "@/lib/validation";

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

export type PublicProfile = {
  id: string;
  slug: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  categoryName: string | null;
  social_links: Partial<Record<SocialKey, string | null>>;
  whatsapp_number: string | null;
  contact_email: string | null;
  phone_number: string | null;
  calendar_visible: boolean;
  custom_closed_message: string | null;
  timezone: string;
  currency: string;
  accent: ThemeAccent;
  locale: "en" | "fr";
};
