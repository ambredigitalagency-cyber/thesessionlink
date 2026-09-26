/**
 * Demo data for the LOCAL Supabase — four extra coaches, their clients and a
 * quarter of bookings, so the dashboard, the CRM and the console can be looked
 * at with something in them.
 *
 *     npm run demo:seed              create (or recreate) the demo accounts
 *     npm run demo:clean             remove every demo account and its data
 *     npm run demo:login -- <email>  print a one-time sign-in link
 *
 * Everything is tied to four auth users flagged `user_metadata.demo = true`,
 * all on @example.com. Deleting those users cascades to their profile, offers,
 * availabilities, time off, clients, bookings and admin row; their avatars are
 * removed from Storage first. The seed.sql account (ana-coach) is not touched.
 *
 * Rows go in with the secret key, as the public booking flow does, so the
 * triggers still run: client attachment, capacity, the no-overlap constraint.
 * Calendar sessions are placed inside each coach's opening hours, outside
 * their time off and never on top of one another.
 *
 * Refuses to run unless .env.local points at 127.0.0.1 or localhost.
 */

import { readFileSync } from "node:fs";

import { TZDate } from "@date-fns/tz";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

/* -------------------------------------------------------------------------- */
/* Environment — local only                                                    */
/* -------------------------------------------------------------------------- */

const env = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET_KEY = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const host = SUPABASE_URL ? new URL(SUPABASE_URL).hostname : "";
if (!["127.0.0.1", "localhost"].includes(host)) {
  console.error(`\n  ✗  .env.local points at "${host || "nothing"}". Demo data is local only.\n`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TZ = "Europe/Paris";
const DAY = 86_400_000;
const NOW = new Date();

/* -------------------------------------------------------------------------- */
/* Small helpers                                                               */
/* -------------------------------------------------------------------------- */

// Seeded, so two runs give the same data.
let seed = 20260926;
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
const between = (min, max) => min + Math.floor(rand() * (max - min + 1));
const pick = (list) => list[Math.floor(rand() * list.length)];

function check(result, what) {
  if (result.error) {
    console.error(`\n  ✗  ${what}: ${result.error.message}\n`);
    process.exit(1);
  }
  return result.data;
}

/** Local calendar date in Paris, `offset` days from today, as [y, m, d]. */
function localDate(offset) {
  const today = new TZDate(NOW.getTime(), TZ);
  const day = new TZDate(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + offset,
    12,
    0,
    TZ,
  );
  return [day.getFullYear(), day.getMonth(), day.getDate(), day.getDay()];
}

function at(offset, time) {
  const [y, m, d] = localDate(offset);
  const [h, min] = time.split(":").map(Number);
  return new Date(new TZDate(y, m, d, h, min, TZ).getTime());
}

const isoDate = (offset) => {
  const [y, m, d] = localDate(offset);
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

const minutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
const clock = (total) =>
  `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;

const daysAgo = (days, hour = 10) => new Date(at(-days, `${String(hour).padStart(2, "0")}:00`));

/* Custom fields, in the shape src/lib/offers/fields.ts validates. */
const text = (id, label, value, multiline = false) => ({
  id,
  type: "text",
  definition: { label, multiline },
  value,
});
const number = (id, label, value, unit = null) => ({
  id,
  type: "number",
  definition: { label, unit },
  value,
});
const select = (id, label, options, value) => ({
  id,
  type: "select",
  definition: { label, options: options.map(([oid, olabel]) => ({ id: oid, label: olabel })) },
  value,
});
const multi = (id, label, options, value) => ({
  id,
  type: "multiselect",
  definition: { label, options: options.map(([oid, olabel]) => ({ id: oid, label: olabel })) },
  value,
});
const bool = (id, label, value) => ({ id, type: "boolean", definition: { label }, value });
const duration = (id, label, value) => ({
  id,
  type: "time",
  definition: { label, mode: "duration" },
  value: { minutes: value },
});
const range = (id, label, start, end) => ({
  id,
  type: "time",
  definition: { label, mode: "range" },
  value: { start, end },
});

/* -------------------------------------------------------------------------- */
/* The coaches                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Client kinds drive how many bookings each one gets and when:
 *   loyal    — 5 bookings in the last 80 days and one upcoming (segment "fidèle": ≥ 5 in 180 days)
 *   regular  — 2 to 3 bookings
 *   once     — a single booking
 *   inactive — 2 bookings, all received 95+ days ago (segment "inactif")
 *   new      — one upcoming booking, received this week
 *   lead     — added by hand in the CRM, no booking yet
 */
const COACHES = [
  {
    email: "sofia.rossi.demo@example.com",
    display_name: "Atelier Sofia",
    slug: "atelier-sofia",
    category: "hairdresser",
    accent: "violet",
    headline: "Coiffure femme & homme · couleur végétale · Paris 11e",
    bio:
      "Coiffeuse depuis douze ans, installée rue Oberkampf depuis 2021.\n" +
      "Coupes qui tiennent sans brushing quotidien, couleurs végétales et balayages naturels. " +
      "Un seul fauteuil, donc pas d'attente et le temps de discuter de ce que vous voulez vraiment.",
    location: "Paris 11e",
    social: {
      instagram: "atelier.sofia.demo",
      tiktok: "ateliersofia.demo",
      website: "https://example.com/atelier-sofia",
    },
    phone: "+33600000101",
    signupDaysAgo: 128,
    subscription: "active",
    schedule: [
      [2, "09:30", "19:00"],
      [3, "09:30", "19:00"],
      [4, "11:00", "20:30"],
      [5, "09:30", "19:00"],
      [6, "09:00", "17:00"],
    ],
    timeOff: [
      { from: 18, to: 24, label: "Congés — Toussaint" },
      { from: -40, to: -39, label: "Formation couleur" },
    ],
    offers: [
      {
        key: "cut_w",
        title: "Coupe & brushing femme",
        price: 58,
        price_type: "fixed",
        action_type: "calendar_booking",
        description:
          "Diagnostic, shampoing soin, coupe et brushing. Comptez une heure, un peu plus pour les cheveux très longs.",
        action_config: {
          duration_minutes: 60,
          buffer_minutes: 15,
          min_notice_hours: 12,
          max_days_ahead: 60,
          requires_confirmation: false,
          ask_phone: "required",
        },
        custom_fields: [
          select(
            "f_length",
            "Longueur",
            [
              ["short", "Courts"],
              ["mid", "Mi-longs"],
              ["long", "Longs"],
            ],
            "mid",
          ),
          multi(
            "f_includes",
            "Inclus",
            [
              ["wash", "Shampoing soin"],
              ["cut", "Coupe"],
              ["blow", "Brushing"],
              ["mask", "Masque"],
            ],
            ["wash", "cut", "blow"],
          ),
          duration("f_duration", "Durée au fauteuil", 60),
        ],
      },
      {
        key: "cut_m",
        title: "Coupe homme",
        price: 28,
        price_type: "fixed",
        action_type: "calendar_booking",
        description: "Coupe aux ciseaux ou tondeuse, finitions nuque et contours.",
        action_config: {
          duration_minutes: 30,
          buffer_minutes: 10,
          min_notice_hours: 4,
          max_days_ahead: 45,
          requires_confirmation: false,
          ask_phone: "optional",
        },
        custom_fields: [
          bool("f_beard", "Taille de barbe incluse", true),
          select(
            "f_tool",
            "Technique",
            [
              ["scissors", "Ciseaux"],
              ["clipper", "Tondeuse"],
              ["both", "Les deux"],
            ],
            "both",
          ),
        ],
      },
      {
        key: "balayage",
        title: "Balayage & soin",
        price: 120,
        price_type: "from",
        action_type: "calendar_booking",
        description:
          "Balayage à main levée, patine et soin profond. Je confirme après avoir vu une photo de vos cheveux.",
        action_config: {
          duration_minutes: 150,
          buffer_minutes: 15,
          min_notice_hours: 48,
          max_days_ahead: 60,
          requires_confirmation: true,
          ask_phone: "required",
        },
        custom_fields: [
          text("f_products", "Produits", "Couleur végétale sans ammoniaque, soin Olaplex"),
          number("f_hold", "Tenue moyenne", 12, "semaines"),
          bool("f_test", "Test d'allergie 48 h avant", true),
        ],
      },
      {
        key: "wa",
        title: "Un conseil couleur ?",
        price: null,
        price_type: "free",
        action_type: "whatsapp_direct",
        description:
          "Envoyez-moi une photo, je vous dis ce qui est faisable et en combien de séances.",
        action_config: {
          prefilled_message: "Bonjour Sofia ! J'aimerais un avis sur une couleur…",
          cta_label: "Écrire sur WhatsApp",
        },
        custom_fields: [range("f_hours", "Réponse sous 24 h, créneau habituel", "12:00", "14:00")],
      },
    ],
    clientFields: (i) => [
      select(
        "c_hair",
        "Type de cheveux",
        [
          ["fine", "Fins"],
          ["thick", "Épais"],
          ["curly", "Bouclés"],
          ["frizzy", "Frisés"],
        ],
        ["fine", "thick", "curly", "frizzy"][i % 4],
      ),
      text("c_formula", "Dernière formule couleur", i % 2 ? "7.1 + 8.13 · 20 vol · 35 min" : null),
    ],
    clients: [
      {
        name: "Camille Durand",
        offer: "cut_w",
        kind: "loyal",
        tags: ["VIP", "couleur"],
        notes: "Vient toutes les 3 semaines. Préfère le samedi matin. Café sans sucre.",
        birth_date: "1988-04-12",
      },
      {
        name: "Inès Moreau",
        offer: "cut_w",
        kind: "regular",
        tags: ["couleur"],
        notes: "Balayage tous les 3 mois, entre-deux : coupe seule.",
        health_notes: "Allergie à la PPD — couleur végétale uniquement.",
      },
      {
        name: "Hugo Lefèvre",
        offer: "cut_m",
        kind: "regular",
        tags: ["homme"],
        notes: "Dégradé court, toujours la même coupe.",
      },
      {
        name: "Manon Petit",
        offer: "balayage",
        kind: "regular",
        tags: [],
        address: "12 rue de la Folie-Méricourt, 75011 Paris",
      },
      {
        name: "Nathalie Garnier",
        offer: "cut_w",
        kind: "inactive",
        tags: ["à relancer"],
        notes: "N'est pas revenue depuis le printemps. Lui proposer le soin d'automne.",
      },
      { name: "Lucas Bonnet", offer: "cut_m", kind: "once", tags: ["homme"] },
      {
        name: "Élodie Fontaine",
        offer: "balayage",
        kind: "new",
        tags: ["première visite"],
        notes: "Veut passer du brun au blond en deux séances.",
      },
      {
        name: "Sarah Lambert",
        kind: "lead",
        tags: ["prospect"],
        notes: "Rencontrée au salon du mariage — coiffure de mariée en juin.",
      },
    ],
    messages: [
      "Je voudrais garder de la longueur devant.",
      "Juste rafraîchir les pointes.",
      "Possible de faire un soin en plus ?",
      "Première fois chez vous, cheveux très épais.",
      null,
      null,
      "Je serai peut-être 5 min en retard.",
    ],
  },
  {
    email: "lea.martin.demo@example.com",
    display_name: "Léa Martin",
    slug: "lea-martin-coaching",
    category: "fitness-coach",
    accent: "forest",
    headline: "Coach sportive · course à pied & renforcement · Bordeaux",
    bio:
      "Ancienne athlète de demi-fond, diplômée BPJEPS.\n" +
      "Je prépare des coureurs du premier 5 km au premier trail, et je remets en mouvement ceux qui n'ont plus fait de sport depuis longtemps. " +
      "Séances en extérieur sur les quais, ou en visio l'hiver.",
    location: "Bordeaux",
    social: {
      instagram: "lea.runcoach.demo",
      youtube: "leamartin.demo",
      website: "https://example.com/lea-martin",
    },
    phone: "+33600000102",
    signupDaysAgo: 150,
    subscription: "active",
    schedule: [
      [1, "07:00", "12:00"],
      [1, "17:00", "20:30"],
      [2, "07:00", "12:00"],
      [3, "17:00", "20:30"],
      [4, "07:00", "12:00"],
      [4, "17:00", "20:30"],
      [5, "07:00", "12:00"],
      [6, "08:00", "12:00"],
    ],
    timeOff: [{ from: -25, to: -21, label: "Marathon de Berlin" }],
    offers: [
      {
        key: "pt",
        title: "Séance individuelle — 60 min",
        price: 55,
        price_type: "fixed",
        action_type: "calendar_booking",
        description:
          "Échauffement, travail technique et renforcement adapté à votre objectif. Premier rendez-vous : bilan inclus.",
        action_config: {
          duration_minutes: 60,
          buffer_minutes: 30,
          min_notice_hours: 12,
          max_days_ahead: 45,
          requires_confirmation: false,
          ask_phone: "optional",
        },
        custom_fields: [
          select(
            "f_place",
            "Lieu",
            [
              ["quais", "Quais de Bordeaux"],
              ["parc", "Parc Bordelais"],
              ["visio", "En visio"],
            ],
            "quais",
          ),
          select(
            "f_level",
            "Niveau",
            [
              ["all", "Tous niveaux"],
              ["beg", "Débutant"],
              ["conf", "Confirmé"],
            ],
            "all",
          ),
          multi(
            "f_gear",
            "À prévoir",
            [
              ["shoes", "Chaussures de running"],
              ["water", "Gourde"],
              ["mat", "Tapis"],
            ],
            ["shoes", "water"],
          ),
        ],
      },
      {
        key: "group",
        title: "Cours collectif plein air",
        price: 15,
        price_type: "fixed",
        action_type: "direct_reservation",
        description:
          "Circuit training de 45 min, 8 personnes maximum. Samedi matin, départ Miroir d'eau.",
        action_config: {
          capacity: 8,
          date_mode: "required",
          max_quantity_per_booking: 2,
          quantity_label: "places",
          requires_confirmation: false,
          ask_phone: "optional",
        },
        custom_fields: [
          text("f_meeting", "Point de rendez-vous", "Miroir d'eau, côté place de la Bourse"),
          range("f_time", "Horaire", "09:00", "09:45"),
          number("f_spots", "Places par séance", 8, "personnes"),
        ],
      },
      {
        key: "trail",
        title: "Préparation trail — 10 semaines",
        price: 390,
        price_type: "from",
        action_type: "quote_request",
        description:
          "Plan d'entraînement sur mesure, 2 séances encadrées par mois et suivi hebdomadaire. On en parle avant de commencer.",
        action_config: {
          ask_budget: true,
          ask_preferred_date: true,
          ask_phone: "required",
          brief_prompt:
            "Quelle course visez-vous, et combien courez-vous par semaine aujourd'hui ?",
        },
        custom_fields: [
          number("f_weeks", "Durée", 10, "semaines"),
          bool("f_nutrition", "Conseils nutrition inclus", true),
        ],
      },
      {
        key: "wa",
        title: "Une question ?",
        price: null,
        price_type: "free",
        action_type: "whatsapp_direct",
        description: "Pas sûr de la formule ? Écrivez-moi.",
        action_config: { prefilled_message: "Bonjour Léa, j'ai vu votre page et…" },
        custom_fields: [text("f_reply", "Délai de réponse", "Dans la journée")],
      },
    ],
    clientFields: (i) => [
      select(
        "c_goal",
        "Objectif",
        [
          ["5k", "Premier 5 km"],
          ["semi", "Semi-marathon"],
          ["trail", "Trail"],
          ["shape", "Remise en forme"],
        ],
        ["5k", "semi", "trail", "shape"][i % 4],
      ),
      number("c_km", "Volume hebdo actuel", [0, 15, 30, 45][i % 4], "km"),
    ],
    clients: [
      {
        name: "Julie Robert",
        kind: "loyal",
        tags: ["semi-marathon"],
        notes: "Objectif : semi de Bordeaux sous 1 h 50.",
        birth_date: "1992-09-03",
      },
      {
        name: "Antoine Girard",
        kind: "regular",
        tags: ["trail", "VIP"],
        notes: "Prépare l'UTMB 2027. Très régulier.",
        health_notes: "Tendinite d'Achille droite en 2025 — éviter le fractionné en côte.",
      },
      { name: "Clara Mercier", kind: "regular", tags: ["débutante"] },
      { name: "Maxime Faure", kind: "regular", tags: [], notes: "Préfère le créneau de 7 h." },
      {
        name: "Sophie André",
        kind: "inactive",
        tags: ["à relancer"],
        notes: "Arrêt après sa blessure au genou. Prendre des nouvelles.",
      },
      { name: "Paul Chevalier", kind: "once", tags: [] },
      { name: "Emma Rousseau", kind: "new", tags: ["débutante"] },
    ],
    messages: [
      "Je reprends après 2 ans sans sport.",
      "On peut travailler la côte ?",
      null,
      "Je serai là 10 min avant.",
      "Séance fractionné si possible !",
      null,
    ],
  },
  {
    email: "karim.benali.demo@example.com",
    display_name: "Karim Benali — Immobilier",
    slug: "karim-benali-immo",
    category: "real-estate",
    accent: "ocean",
    headline: "Conseiller immobilier indépendant · Lyon 1er, 4e et Croix-Rousse",
    bio:
      "Quinze ans à vendre des appartements sur les pentes et le plateau de la Croix-Rousse.\n" +
      "Estimation argumentée, photos pro, visites groupées : je vends au bon prix, sans brader et sans laisser traîner.",
    location: "Lyon 4e",
    social: {
      linkedin: "karim-benali-demo",
      facebook: "karimbenali.immo.demo",
      website: "https://example.com/karim-benali",
    },
    phone: "+33600000103",
    signupDaysAgo: 104,
    subscription: "active",
    schedule: [
      [1, "09:00", "19:00"],
      [2, "09:00", "19:00"],
      [3, "09:00", "19:00"],
      [4, "09:00", "19:00"],
      [5, "09:00", "18:00"],
      [6, "10:00", "13:00"],
    ],
    timeOff: [],
    offers: [
      {
        key: "estimate",
        title: "Estimation de votre bien",
        price: null,
        price_type: "free",
        action_type: "calendar_booking",
        description:
          "Je viens voir le bien, je compare avec les ventes récentes du quartier et je vous remets un avis de valeur écrit sous 48 h.",
        action_config: {
          duration_minutes: 60,
          buffer_minutes: 30,
          min_notice_hours: 24,
          max_days_ahead: 30,
          requires_confirmation: false,
          ask_phone: "required",
        },
        custom_fields: [
          multi(
            "f_zone",
            "Secteurs couverts",
            [
              ["l1", "Lyon 1er"],
              ["l4", "Lyon 4e"],
              ["cx", "Croix-Rousse"],
              ["cal", "Caluire"],
            ],
            ["l1", "l4", "cx"],
          ),
          duration("f_duration", "Durée de la visite", 60),
          bool("f_report", "Avis de valeur écrit", true),
        ],
      },
      {
        // Free to book: the sale price is a detail, not what the visit costs —
        // as a price it would count 385 k€ of "revenue" per visit in the stats.
        key: "visit",
        title: "Visite — T3 traversant, pentes de la Croix-Rousse",
        price: null,
        price_type: "free",
        action_type: "calendar_booking",
        description:
          "68 m², 3e étage sans ascenseur, vue dégagée, parquet d'origine. Visites de 30 minutes, je confirme chaque demande.",
        action_config: {
          duration_minutes: 30,
          buffer_minutes: 15,
          min_notice_hours: 24,
          max_days_ahead: 21,
          requires_confirmation: true,
          ask_phone: "required",
        },
        custom_fields: [
          number("f_price", "Prix de vente", 385000, "€ FAI"),
          number("f_surface", "Surface", 68, "m²"),
          number("f_rooms", "Pièces", 3),
          select(
            "f_dpe",
            "DPE",
            [
              ["c", "C"],
              ["d", "D"],
              ["e", "E"],
            ],
            "d",
          ),
          bool("f_lift", "Ascenseur", false),
        ],
      },
      {
        key: "mandate",
        title: "Mandat de vente — accompagnement complet",
        price: null,
        price_type: "on_request",
        action_type: "quote_request",
        description:
          "Estimation, photos et visite virtuelle, diffusion, visites, négociation et suivi jusqu'à l'acte.",
        action_config: {
          ask_budget: false,
          ask_preferred_date: true,
          ask_phone: "required",
          brief_prompt: "Décrivez le bien : adresse, surface, étage, et votre calendrier de vente.",
        },
        custom_fields: [
          number("f_fee", "Honoraires", 4, "% TTC"),
          text(
            "f_includes",
            "Inclus",
            "Photos pro, visite virtuelle 3D, diffusion sur 6 portails",
            true,
          ),
        ],
      },
      {
        key: "search",
        title: "Recherche personnalisée acheteur",
        price: null,
        price_type: "free",
        action_type: "contact_request",
        description:
          "Dites-moi ce que vous cherchez, je vous préviens avant la mise en ligne des biens qui correspondent.",
        action_config: {
          cta_label: "Décrire ma recherche",
          message_prompt: "Budget, quartier, surface, délai…",
          ask_phone: "optional",
        },
        custom_fields: [text("f_delay", "Délai de réponse", "Sous 24 h ouvrées")],
      },
    ],
    clientFields: (i) => [
      select(
        "c_role",
        "Profil",
        [
          ["seller", "Vendeur"],
          ["buyer", "Acheteur"],
          ["both", "Vend et achète"],
        ],
        ["seller", "buyer", "both"][i % 3],
      ),
      number("c_budget", "Budget / prix visé", [320000, 450000, 280000, 510000][i % 4], "€"),
    ],
    clients: [
      {
        name: "Famille Dubois",
        offer: "visit",
        kind: "loyal",
        tags: ["vendeur", "mandat exclusif"],
        notes: "Vendent le T4 rue d'Austerlitz, rachètent sur Caluire. Mandat signé.",
        address: "8 rue d'Austerlitz, 69004 Lyon",
      },
      {
        name: "Mehdi Haddad",
        offer: "visit",
        kind: "regular",
        tags: ["acheteur", "primo-accédant"],
        notes: "Prêt accordé jusqu'à 330 k€.",
      },
      { name: "Claire Vincent", offer: "visit", kind: "regular", tags: ["acheteur"] },
      {
        name: "Jean-Pierre Morel",
        offer: "estimate",
        kind: "inactive",
        tags: ["vendeur", "à relancer"],
        notes: "A mis la vente en pause au printemps. Rappeler en octobre.",
      },
      { name: "Aurélie Blanc", offer: "visit", kind: "once", tags: ["acheteur"] },
      { name: "Olivier Masson", offer: "estimate", kind: "once", tags: [] },
      {
        name: "Laura Chevallier",
        offer: "estimate",
        kind: "new",
        tags: ["vendeur"],
        notes: "Succession — T2 à estimer rapidement.",
      },
      {
        name: "Nicolas Perrin",
        kind: "lead",
        tags: ["investisseur"],
        notes: "Cherche un immeuble de rapport, budget 1,2 M€.",
      },
    ],
    messages: [
      "Le bien est-il toujours disponible ?",
      "Nous venons à deux.",
      null,
      "Appartement de 72 m², 2e étage, travaux à prévoir.",
      "Je suis disponible plutôt en fin de journée.",
      null,
    ],
  },
  {
    email: "thomas.leroy.demo@example.com",
    display_name: "Thomas Leroy",
    slug: "thomas-leroy-maths",
    category: "tutor",
    accent: "amber",
    headline: "Professeur de maths & physique · collège, lycée, prépa · Nantes et en ligne",
    bio:
      "Agrégé de mathématiques, dix ans d'enseignement en lycée.\n" +
      "Je reprends les bases sans jugement, puis on avance à votre rythme jusqu'au bac ou aux concours. " +
      "Cours chez vous sur Nantes, ou en visio avec tableau partagé.",
    location: "Nantes",
    social: { linkedin: "thomas-leroy-demo", website: "https://example.com/thomas-leroy" },
    phone: "+33600000104",
    signupDaysAgo: 96,
    subscription: "expired",
    schedule: [
      [1, "16:30", "20:00"],
      [2, "16:30", "20:00"],
      [3, "13:30", "19:00"],
      [4, "16:30", "20:00"],
      [5, "16:30", "19:00"],
      [6, "09:00", "13:00"],
    ],
    timeOff: [{ from: -12, to: -12, label: "Jury de bac blanc" }],
    offers: [
      {
        key: "lesson",
        title: "Cours particulier — 1 h",
        price: 35,
        price_type: "fixed",
        action_type: "calendar_booking",
        description:
          "Méthode, exercices et fiches de révision. Collège et lycée, maths ou physique-chimie.",
        action_config: {
          duration_minutes: 60,
          buffer_minutes: 15,
          min_notice_hours: 24,
          max_days_ahead: 30,
          requires_confirmation: false,
          ask_phone: "optional",
        },
        custom_fields: [
          multi(
            "f_levels",
            "Niveaux",
            [
              ["col", "Collège"],
              ["lyc", "Lycée"],
              ["prep", "Prépa"],
            ],
            ["col", "lyc"],
          ),
          select(
            "f_subject",
            "Matière",
            [
              ["maths", "Mathématiques"],
              ["phys", "Physique-chimie"],
              ["both", "Les deux"],
            ],
            "both",
          ),
          select(
            "f_format",
            "Format",
            [
              ["home", "À domicile (Nantes)"],
              ["visio", "En visio"],
            ],
            "home",
          ),
        ],
      },
      {
        key: "stage",
        title: "Stage intensif bac — 5 matinées",
        price: 220,
        price_type: "fixed",
        action_type: "direct_reservation",
        description:
          "Vacances de Toussaint : 5 matinées de 3 h, 6 élèves maximum, sujets types et corrections détaillées.",
        action_config: {
          capacity: 6,
          date_mode: "none",
          max_quantity_per_booking: 1,
          quantity_label: "place",
          requires_confirmation: true,
          ask_phone: "required",
        },
        custom_fields: [
          range("f_hours", "Horaires", "09:00", "12:00"),
          number("f_group", "Élèves maximum", 6),
          text("f_place", "Lieu", "Salle de la Maison des associations, Nantes centre"),
        ],
      },
      {
        key: "assessment",
        title: "Bilan de niveau gratuit",
        price: null,
        price_type: "free",
        action_type: "contact_request",
        description:
          "Un échange de 20 minutes pour voir où en est votre enfant et ce qui l'aiderait vraiment.",
        action_config: {
          cta_label: "Demander un bilan",
          message_prompt: "Classe, matière, et ce qui coince en ce moment.",
          ask_phone: "optional",
        },
        custom_fields: [duration("f_duration", "Durée de l'échange", 20)],
      },
    ],
    clientFields: (i) => [
      select(
        "c_grade",
        "Classe",
        [
          ["3e", "3e"],
          ["2nde", "Seconde"],
          ["1re", "Première"],
          ["term", "Terminale"],
        ],
        ["3e", "2nde", "1re", "term"][i % 4],
      ),
      text(
        "c_parent",
        "Contact parent",
        i % 2 ? "Mère — préfère les SMS" : "Père — joignable après 18 h",
      ),
    ],
    clients: [
      {
        name: "Léo Bertrand",
        kind: "loyal",
        tags: ["terminale", "spé maths"],
        notes: "Vise une prépa MPSI. Travaille bien, manque de méthode sur les démonstrations.",
      },
      {
        name: "Chloé Roux",
        kind: "regular",
        tags: ["seconde"],
        notes: "Grosses lacunes en calcul littéral, en net progrès.",
      },
      { name: "Adam Mathieu", kind: "regular", tags: ["3e", "brevet"] },
      { name: "Zoé Lemoine", kind: "regular", tags: ["première"] },
      {
        name: "Nathan Colin",
        kind: "inactive",
        tags: ["à relancer"],
        notes: "Arrêt après le bac de français. Relancer pour la terminale.",
      },
      { name: "Lina Gauthier", kind: "once", tags: ["première"] },
      { name: "Jules Renard", kind: "new", tags: ["terminale"] },
    ],
    messages: [
      "Contrôle sur les suites vendredi.",
      "Il bloque sur les vecteurs.",
      null,
      "On peut revoir le chapitre sur les fonctions ?",
      null,
      "Cours en visio cette fois, merci.",
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Clean                                                                       */
/* -------------------------------------------------------------------------- */

async function demoUsers() {
  const users = [];
  for (let page = 1; ; page++) {
    const data = check(await supabase.auth.admin.listUsers({ page, perPage: 200 }), "list users");
    users.push(...data.users);
    if (data.users.length < 200) break;
  }
  return users.filter((user) => user.user_metadata?.demo === true);
}

async function clean() {
  const users = await demoUsers();
  for (const user of users) {
    const files = check(await supabase.storage.from("media").list(user.id), "list media");
    if (files.length) {
      check(
        await supabase.storage.from("media").remove(files.map((file) => `${user.id}/${file.name}`)),
        "remove media",
      );
    }
    check(await supabase.auth.admin.deleteUser(user.id), `delete ${user.email}`);
    console.log(`  –  ${user.email}`);
  }
  console.log(
    users.length
      ? `\n  ✓  ${users.length} demo account(s) removed.\n`
      : "\n  ✓  No demo account to remove.\n",
  );
}

/* -------------------------------------------------------------------------- */
/* Seed                                                                        */
/* -------------------------------------------------------------------------- */

const HEX = {
  coral: "#e8664d",
  ink: "#2b2b30",
  forest: "#2f7d57",
  ocean: "#2672b8",
  violet: "#7a52c7",
  amber: "#c98a1b",
};

async function avatar(userId, coach) {
  const initials = coach.display_name
    .split(/\s+/)
    .filter((w) => /^[A-ZÀ-Ý]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  const color = HEX[coach.accent];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${color}" stop-opacity="0.6"/>
    </linearGradient></defs>
    <rect width="512" height="512" fill="url(#g)"/>
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif"
      font-size="200" font-weight="700" fill="#ffffff" letter-spacing="-6">${initials}</text>
  </svg>`;
  const body = await sharp(Buffer.from(svg)).webp({ quality: 88 }).toBuffer();
  const path = `${userId}/avatar-demo.webp`;
  check(
    await supabase.storage
      .from("media")
      .upload(path, body, { contentType: "image/webp", upsert: true }),
    "upload avatar",
  );
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}

/** Finds a free calendar slot near `offset` days from today, or null. */
function slotFinder(coach) {
  const taken = [];
  const offDays = new Set();
  for (const off of coach.timeOff) for (let d = off.from; d <= off.to; d++) offDays.add(d);

  return function find(offset, offer, { future }) {
    const { duration_minutes: length, buffer_minutes: buffer } = offer.action_config;
    for (let shift = 0; shift < 14; shift++) {
      const day = offset + (future ? shift : -shift);
      if (offDays.has(day)) continue;
      const weekday = localDate(day)[3];
      const windows = coach.schedule.filter(([w]) => w === weekday);
      const candidates = [];
      for (const [, open, close] of windows) {
        for (let m = minutes(open); m + length <= minutes(close); m += 30) candidates.push(m);
      }
      while (candidates.length) {
        const start = at(
          day,
          clock(candidates.splice(Math.floor(rand() * candidates.length), 1)[0]),
        );
        const end = new Date(start.getTime() + length * 60_000);
        if (
          future &&
          start.getTime() < NOW.getTime() + offer.action_config.min_notice_hours * 3_600_000
        )
          continue;
        if (!future && end.getTime() > NOW.getTime() - 3_600_000) continue;
        const clash = taken.some(
          ([s, e]) => start < e && s < new Date(end.getTime() + buffer * 60_000),
        );
        if (clash) continue;
        taken.push([
          new Date(start.getTime() - buffer * 60_000),
          new Date(end.getTime() + buffer * 60_000),
        ]);
        return { start, end, day };
      }
    }
    return null;
  };
}

/** Days (relative to today) on which each kind of client books. */
function plan(kind) {
  switch (kind) {
    case "loyal":
      return [-76, -58, -41, -24, -9, 8].map((d) => d + between(-3, 3));
    case "regular":
      return Array.from({ length: between(2, 3) }, () => between(-80, 12));
    case "once":
      return [between(-70, -10)];
    case "inactive":
      return [between(-128, -118), between(-108, -97)];
    case "new":
      return [between(3, 10)];
    default:
      return [];
  }
}

function slugEmail(name) {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, ".")
    .replace(/^\.|\.$/g, "");
  return `${base}@example.com`;
}

async function seedCoach(coach, categories) {
  const signup = daysAgo(coach.signupDaysAgo, 9);

  const { user } = check(
    await supabase.auth.admin.createUser({
      email: coach.email,
      email_confirm: true,
      user_metadata: { demo: true },
    }),
    `create ${coach.email}`,
  );

  const trialEnds = new Date(signup.getTime() + 14 * DAY);
  const profile = check(
    await supabase
      .from("profiles")
      .insert({
        user_id: user.id,
        display_name: coach.display_name,
        slug: coach.slug,
        headline: coach.headline,
        bio: coach.bio,
        location: coach.location,
        category_id: categories[coach.category] ?? null,
        social_links: coach.social,
        whatsapp_number: coach.phone,
        contact_email: coach.email,
        phone_number: coach.phone,
        contact_channels: { email: true, phone: true, whatsapp: true },
        theme: { accent: coach.accent },
        locale: "fr",
        timezone: TZ,
        currency: "EUR",
        created_at: signup.toISOString(),
        trial_ends_at: trialEnds.toISOString(),
        subscription_active: coach.subscription === "active",
      })
      .select("id")
      .single(),
    `profile ${coach.slug}`,
  );

  const avatarUrl = await avatar(user.id, coach);

  // Offers. The first insert completes onboarding; its date is set right after.
  const offers = {};
  for (const [position, offer] of coach.offers.entries()) {
    const row = check(
      await supabase
        .from("offers")
        .insert({
          profile_id: profile.id,
          title: offer.title,
          description: offer.description,
          price: offer.price,
          price_type: offer.price_type,
          action_type: offer.action_type,
          action_config: offer.action_config,
          custom_fields: offer.custom_fields,
          position,
          is_active: true,
          created_at: new Date(signup.getTime() + (position + 1) * 3_600_000).toISOString(),
        })
        .select("id")
        .single(),
      `offer ${offer.title}`,
    );
    offers[offer.key] = { ...offer, id: row.id };
  }

  check(
    await supabase
      .from("profiles")
      .update({
        avatar_url: avatarUrl,
        onboarding_completed_at: new Date(signup.getTime() + 3_600_000).toISOString(),
      })
      .eq("id", profile.id),
    "complete profile",
  );

  // Opening hours replace the Mon–Fri 9–17 default the insert trigger adds.
  check(
    await supabase.from("availabilities").delete().eq("profile_id", profile.id),
    "reset availability",
  );
  check(
    await supabase
      .from("availabilities")
      .insert(
        coach.schedule.map(([weekday, start_time, end_time]) => ({
          profile_id: profile.id,
          weekday,
          start_time,
          end_time,
        })),
      ),
    "availability",
  );
  if (coach.timeOff.length) {
    check(
      await supabase
        .from("time_off")
        .insert(
          coach.timeOff.map((off) => ({
            profile_id: profile.id,
            starts_on: isoDate(off.from),
            ends_on: isoDate(off.to),
            label: off.label,
          })),
        ),
      "time off",
    );
  }

  // Bookings.
  const find = slotFinder(coach);
  const calendarOffers = Object.values(offers).filter((o) => o.action_type === "calendar_booking");
  const requestOffers = Object.values(offers).filter((o) =>
    ["quote_request", "contact_request"].includes(o.action_type),
  );
  const reservationOffer = Object.values(offers).find(
    (o) => o.action_type === "direct_reservation",
  );
  const bookings = [];

  coach.clients.forEach((client, index) => {
    client.email = slugEmail(client.name);
    client.phone = `+3361${String(between(1000000, 9999999))}`;
    // A client with a set offer always books it; loyal ones stick to one too.
    const favourite = offers[client.offer] ?? calendarOffers[index % calendarOffers.length];

    for (const day of plan(client.kind)) {
      const offer =
        client.offer || client.kind === "loyal" || rand() < 0.6 ? favourite : pick(calendarOffers);
      const future = day > 0;
      const slot = find(day, offer, { future });
      if (!slot) continue;
      const lead = between(1, 9);
      const created = future
        ? daysAgo(Math.min(lead, 6), between(8, 21))
        : new Date(slot.start.getTime() - lead * DAY);
      bookings.push({ client, offer, starts_at: slot.start, ends_at: slot.end, created, future });
    }
  });

  // A few requests with no time slot: quotes, contact forms, group places.
  // Never from an inactive client: a new booking would end that segment.
  const requesters = coach.clients.filter((c) => !["lead", "inactive"].includes(c.kind));
  for (const [i, offer] of requestOffers.entries()) {
    for (const days of i === 0 ? [between(40, 70), between(2, 6)] : [between(15, 35)]) {
      bookings.push({
        client: pick(requesters),
        offer,
        created: daysAgo(days, between(9, 20)),
        future: days < 7,
      });
    }
  }
  if (reservationOffer) {
    for (const days of [between(35, 70), between(1, 4)]) {
      bookings.push({
        client: pick(requesters),
        offer: reservationOffer,
        created: daysAgo(days, between(9, 20)),
        requested_date:
          reservationOffer.action_config.date_mode === "none"
            ? null
            : isoDate(-days + between(3, 8)),
        quantity: between(1, reservationOffer.action_config.max_quantity_per_booking),
        future: days < 7,
      });
    }
  }

  // Statuses. Past sessions mostly happened; a few were cancelled or missed.
  bookings.sort((a, b) => a.created - b.created);
  const loyalCancelled = new Set();
  for (const booking of bookings) {
    booking.status = "confirmed";
    booking.no_show = false;
    const needsAnswer = booking.offer.action_config.requires_confirmation ?? true;
    if (!booking.starts_at) {
      // Requests: recent ones wait for an answer, older ones were handled.
      booking.status = booking.future ? "pending" : rand() < 0.15 ? "cancelled" : "confirmed";
    } else if (booking.future) {
      booking.status =
        needsAnswer && rand() < 0.6 ? "pending" : rand() < 0.1 ? "cancelled" : "confirmed";
    } else {
      const roll = rand();
      const canCancel = booking.client.kind !== "loyal" || !loyalCancelled.has(booking.client.name);
      if (roll < 0.13 && canCancel) {
        booking.status = "cancelled";
        if (booking.client.kind === "loyal") loyalCancelled.add(booking.client.name);
      } else if (roll < 0.23) {
        booking.no_show = true;
      }
    }
  }
  // Make sure every coach shows each status at least twice.
  const past = bookings.filter(
    (b) =>
      b.starts_at &&
      !b.future &&
      b.status === "confirmed" &&
      !b.no_show &&
      b.client.kind !== "loyal",
  );
  while (bookings.filter((b) => b.no_show).length < 2 && past.length) past.shift().no_show = true;
  while (bookings.filter((b) => b.status === "cancelled").length < 2 && past.length)
    past.pop().status = "cancelled";
  const upcoming = bookings.filter((b) => b.future && b.status === "confirmed");
  while (bookings.filter((b) => b.status === "pending").length < 2 && upcoming.length)
    upcoming.shift().status = "pending";

  const rows = bookings.map((b) => {
    const message = pick(coach.messages);
    const cancelledAt =
      b.status === "cancelled"
        ? new Date(
            Math.min(
              b.created.getTime() + between(1, 3) * DAY,
              (b.starts_at ?? NOW).getTime() - 3_600_000,
              NOW.getTime(),
            ),
          )
        : null;
    return {
      profile_id: profile.id,
      offer_id: b.offer.id,
      action_type: b.offer.action_type,
      offer_title: b.offer.title,
      client_name: b.client.name,
      client_email: b.client.email,
      client_phone: b.client.phone,
      // Requests always carry a message; a session may come without one.
      client_message: b.starts_at ? message : pick(coach.messages.filter(Boolean)),
      client_timezone: TZ,
      starts_at: b.starts_at?.toISOString() ?? null,
      ends_at: b.ends_at?.toISOString() ?? null,
      requested_date: b.requested_date ?? null,
      quantity: b.quantity ?? 1,
      details:
        b.offer.action_type === "quote_request" && b.offer.action_config.ask_budget
          ? { budget: pick(["300–400 €", "400–600 €", "À discuter"]) }
          : {},
      status: b.status,
      no_show: b.no_show,
      locale: "fr",
      cancelled_at: cancelledAt?.toISOString() ?? null,
      cancelled_by: cancelledAt ? pick(["client", "client", "pro"]) : null,
      reminder_sent_at:
        b.starts_at && !b.future && b.status === "confirmed"
          ? new Date(b.starts_at.getTime() - DAY).toISOString()
          : null,
      created_at: b.created.toISOString(),
    };
  });

  // One at a time, oldest first, so the CRM trigger meets each client in order.
  for (const row of rows)
    check(await supabase.from("bookings").insert(row), `booking ${row.client_name}`);

  // CRM: the trigger created a client per email; now give them a history.
  const clients = check(
    await supabase.from("clients").select("id, email").eq("profile_id", profile.id),
    "clients",
  );
  const byEmail = new Map(clients.map((c) => [c.email, c.id]));
  for (const [index, client] of coach.clients.entries()) {
    const first = rows.find((r) => r.client_email === client.email);
    const record = {
      tags: client.tags,
      notes: client.notes ?? null,
      birth_date: client.birth_date ?? null,
      address: client.address ?? null,
      health_notes: client.health_notes ?? null,
      custom_fields: coach.clientFields(index),
      created_at: first ? first.created_at : daysAgo(between(5, 20)).toISOString(),
    };
    if (byEmail.has(client.email)) {
      check(
        await supabase.from("clients").update(record).eq("id", byEmail.get(client.email)),
        `client ${client.name}`,
      );
    } else {
      check(
        await supabase
          .from("clients")
          .insert({
            ...record,
            profile_id: profile.id,
            name: client.name,
            email: client.email,
            phone: client.phone,
          }),
        `client ${client.name}`,
      );
    }
  }

  const count = (s) => rows.filter((r) => r.status === s).length;
  console.log(
    `  +  ${coach.email.padEnd(32)} /${coach.slug.padEnd(22)} ${String(rows.length).padStart(2)} bookings ` +
      `(${count("confirmed")} confirmées, ${count("pending")} en attente, ${count("cancelled")} annulées, ` +
      `${rows.filter((r) => r.no_show).length} absences) · ${coach.clients.length} clients`,
  );
  return { user, profile };
}

async function seedAll() {
  await clean();

  const categories = Object.fromEntries(
    check(await supabase.from("activity_categories").select("id, slug"), "categories").map((c) => [
      c.slug,
      c.id,
    ]),
  );

  const created = [];
  for (const coach of COACHES) created.push(await seedCoach(coach, categories));

  // The first coach also opens /admin locally, so one browser session shows both.
  check(
    await supabase
      .from("platform_admins")
      .insert({ user_id: created[0].user.id, note: "demo (local only)" }),
    "admin row",
  );
  console.log(`\n  ✓  Done. ${COACHES[0].email} is also a platform admin (local only).`);
  console.log("     Sign in with:  npm run demo:login -- <email>\n");
}

/* -------------------------------------------------------------------------- */
/* Login link                                                                  */
/* -------------------------------------------------------------------------- */

async function login(email, next = "/dashboard") {
  const data = check(
    await supabase.auth.admin.generateLink({ type: "magiclink", email }),
    "generate link",
  );
  const url = new URL("/auth/confirm", SITE_URL);
  url.searchParams.set("token_hash", data.properties.hashed_token);
  url.searchParams.set("type", "magiclink");
  url.searchParams.set("next", next);
  console.log(url.toString());
}

/* -------------------------------------------------------------------------- */

const [command, ...args] = process.argv.slice(2);
if (command === "--clean") await clean();
else if (command === "--login") {
  if (!args[0]) {
    console.error("\n  Usage: npm run demo:login -- <email> [next path]\n");
    process.exit(1);
  }
  await login(args[0], args[1]);
} else await seedAll();
