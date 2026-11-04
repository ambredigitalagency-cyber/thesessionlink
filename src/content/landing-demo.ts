import type { PublicOffer, PublicProfile } from "@/components/public-profile/types";
import { parseBlocks, type PageBlock, type StoredBlock } from "@/lib/page/blocks";
import { themeForCategory } from "@/lib/onboarding/config";
import type { ThemeId } from "@/lib/page/themes";

/**
 * The live demo of the landing: a real page, drawn by the same renderer as
 * every coach's page, for five trades. EVERYTHING HERE IS AN EXAMPLE and the
 * landing says so on the phone itself.
 *
 * Kept honest on purpose: no reviews, no key figures, no "x clients served" —
 * blocks that would read as testimonials or performance claims are left out.
 * Names are first names and trades, prices are plain round numbers, contact
 * details are placeholders the preview never lets anyone tap.
 */

export const DEMO_TRADES = ["coach", "hairdresser", "realtor", "tutor", "creator"] as const;
export type DemoTrade = (typeof DEMO_TRADES)[number];

type L = { fr: string; en: string };
const pick = (value: L, locale: string) => (locale === "fr" ? value.fr : value.en);

type DemoDefinition = {
  category: string;
  accent: string;
  name: string;
  trade: L;
  headline: L;
  location: string;
  blocks: (locale: string) => { type: string; config: unknown; offer?: true }[];
  offer?: { title: L; description: L };
};

const PHONE = "+212600000000";

const DEMOS: Record<DemoTrade, DemoDefinition> = {
  coach: {
    category: "fitness-coach",
    accent: "#f2542d",
    name: "Sara",
    trade: { fr: "Coach sportive", en: "Fitness coach" },
    headline: {
      fr: "Séances individuelles et petits groupes, en salle ou en extérieur.",
      en: "One-to-one and small-group sessions, indoors or outdoors.",
    },
    location: "Casablanca",
    blocks: (locale) => [
      {
        type: "whatsapp",
        config: {
          number: PHONE,
          message: null,
          label: locale === "fr" ? "Me contacter sur WhatsApp" : "Message me on WhatsApp",
        },
      },
      {
        type: "pricing",
        config: {
          title: locale === "fr" ? "Tarifs" : "Prices",
          items: [
            {
              label: locale === "fr" ? "Séance individuelle · 1 h" : "Private session · 1 h",
              price: "300 MAD",
              note: null,
            },
            {
              label: locale === "fr" ? "Carnet de 10 séances" : "10-session pass",
              price: "2 700 MAD",
              note: null,
            },
            {
              label: locale === "fr" ? "Petit groupe · 1 h" : "Small group · 1 h",
              price: "120 MAD",
              note: null,
            },
          ],
        },
      },
      {
        type: "socials",
        config: { links: ["https://instagram.com/exemple", "https://tiktok.com/@exemple"] },
      },
    ],
  },
  hairdresser: {
    category: "hairdresser",
    accent: "#c08a3e",
    name: "Studio Lina",
    trade: { fr: "Coiffure & barbier", en: "Hair & barber" },
    headline: {
      fr: "Coupe, couleur et barbe, sur rendez-vous.",
      en: "Cuts, colour and beards, by appointment.",
    },
    location: "Lyon",
    blocks: (locale) => [
      {
        type: "call",
        config: { number: PHONE, label: locale === "fr" ? "Appeler le salon" : "Call the salon" },
      },
      {
        type: "pricing",
        config: {
          title: null,
          items: [
            { label: locale === "fr" ? "Coupe femme" : "Women’s cut", price: "35 €", note: null },
            { label: locale === "fr" ? "Coupe homme" : "Men’s cut", price: "22 €", note: null },
            {
              label: locale === "fr" ? "Taille de barbe" : "Beard trim",
              price: "15 €",
              note: null,
            },
          ],
        },
      },
      { type: "address", config: { address: "12 rue de l’Exemple, 69002 Lyon", label: null } },
    ],
  },
  realtor: {
    category: "real-estate",
    accent: "#2f6fd6",
    name: "Karim",
    trade: { fr: "Agent immobilier", en: "Estate agent" },
    headline: {
      fr: "Achat, vente et location dans le centre-ville.",
      en: "Buying, selling and renting in the city centre.",
    },
    location: "Rabat",
    blocks: (locale) => [
      { type: "call", config: { number: PHONE, label: locale === "fr" ? "M’appeler" : "Call me" } },
      {
        type: "link",
        config: {
          url: "https://example.com/biens",
          title: locale === "fr" ? "Voir les biens disponibles" : "See available properties",
        },
      },
      {
        type: "faq",
        config: {
          title: null,
          items: [
            {
              question: locale === "fr" ? "Faites-vous les estimations ?" : "Do you do valuations?",
              answer:
                locale === "fr"
                  ? "Oui, sur rendez-vous, chez vous."
                  : "Yes, by appointment, at your home.",
            },
          ],
        },
      },
    ],
  },
  tutor: {
    category: "tutor",
    accent: "#1f8a5b",
    name: "David",
    trade: { fr: "Professeur particulier", en: "Private tutor" },
    headline: {
      fr: "Maths et physique, du collège au lycée, à domicile ou en ligne.",
      en: "Maths and physics, secondary school, at home or online.",
    },
    location: "Bruxelles",
    offer: {
      title: { fr: "Envoyer un message", en: "Send a message" },
      description: { fr: "", en: "" },
    },
    blocks: (locale) => [
      { type: "service", config: {}, offer: true },
      {
        type: "text",
        config: {
          title: locale === "fr" ? "Comment je travaille" : "How I work",
          body:
            locale === "fr"
              ? "Un premier cours pour faire le point, puis un rythme adapté à chaque élève."
              : "A first lesson to see where things stand, then a pace that suits each student.",
        },
      },
      { type: "email", config: { email: "david@example.com", label: null } },
    ],
  },
  creator: {
    category: "content-creator",
    accent: "#8b5cf6",
    name: "Yasmine",
    trade: { fr: "Créatrice de contenu", en: "Content creator" },
    headline: {
      fr: "Recettes faciles et voyages, une vidéo par semaine.",
      en: "Easy recipes and travel, one video a week.",
    },
    location: "Marrakech",
    blocks: (locale) => [
      {
        type: "socials",
        config: {
          links: [
            "https://instagram.com/exemple",
            "https://tiktok.com/@exemple",
            "https://youtube.com/@exemple",
          ],
        },
      },
      {
        type: "announcement",
        config: {
          title: locale === "fr" ? "Nouveau : mon e-book de recettes" : "New: my recipe e-book",
          text: null,
          buttonLabel: locale === "fr" ? "Le découvrir" : "Have a look",
          url: "https://example.com/ebook",
        },
      },
      {
        type: "link",
        config: {
          url: "https://example.com/collab",
          title: locale === "fr" ? "Collaborations" : "Collaborations",
        },
      },
    ],
  },
};

export type DemoPage = {
  profile: PublicProfile;
  blocks: PageBlock[];
  offers: PublicOffer[];
  theme: ThemeId;
  accent: string;
};

/** The page of one trade, ready for PageView. Blocks go through the same parser as real pages. */
export function demoPage(trade: DemoTrade, locale: string): DemoPage {
  const demo = DEMOS[trade];
  const offerId = `demo-offer-${trade}`;
  const rows: StoredBlock[] = demo.blocks(locale).map((block, index) => ({
    id: `demo-${trade}-${index}`,
    type: block.type,
    config: block.config,
    visible: true,
    offer_id: block.offer ? offerId : null,
  }));

  return {
    profile: {
      id: `demo-${trade}`,
      slug: `exemple-${trade}`,
      display_name: demo.name,
      headline: pick(demo.headline, locale),
      bio: null,
      avatar_url: null,
      location: demo.location,
      categoryName: pick(demo.trade, locale),
      whatsapp_number: PHONE,
      currency: "EUR",
      timezone: "UTC",
      details: [],
      locale: locale === "fr" ? "fr" : "en",
      published: true,
    },
    blocks: parseBlocks(rows),
    offers: demo.offer
      ? [
          {
            id: offerId,
            title: pick(demo.offer.title, locale),
            description: pick(demo.offer.description, locale) || null,
            price: null,
            price_type: "on_request",
            main_photo_url: null,
            photos: [],
            action_type: "contact_request",
            action_config: {},
            custom_fields: [],
          },
        ]
      : [],
    theme: themeForCategory(demo.category),
    accent: demo.accent,
  };
}
