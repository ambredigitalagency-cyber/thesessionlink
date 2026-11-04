/**
 * Demo data for the LOCAL Supabase — four extra coaches with their pages and
 * offers, so the dashboard, the public pages and the console can be looked at
 * with something in them.
 *
 *     npm run demo:seed              create (or recreate) the demo accounts
 *     npm run demo:clean             remove every demo account and its data
 *     npm run demo:login -- <email>  print a one-time sign-in link
 *
 * Everything is tied to four auth users flagged `user_metadata.demo = true`,
 * all on @example.com. Deleting those users cascades to their profile, offers
 * and admin row; their avatars are removed from Storage first. The seed.sql
 * account (ana-coach) is not touched.
 *
 * Refuses to run unless .env.local points at 127.0.0.1 or localhost.
 */

import { readFileSync } from "node:fs";

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

function check(result, what) {
  if (result.error) {
    console.error(`\n  ✗  ${what}: ${result.error.message}\n`);
    process.exit(1);
  }
  return result.data;
}

const daysAgo = (days, hour = 10) => {
  const date = new Date(NOW.getTime() - days * DAY);
  date.setHours(hour, 0, 0, 0);
  return date;
};

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

const COACHES = [
  {
    email: "sofia.rossi.demo@example.com",
    display_name: "Atelier Sofia",
    slug: "atelier-sofia",
    category: "hairdresser",
    accent: "violet",
    theme: "editorial",
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
    offers: [
      {
        title: "Coupe & brushing femme",
        price: 58,
        price_type: "fixed",
        action_type: "contact_request",
        description:
          "Diagnostic, shampoing soin, coupe et brushing. Comptez une heure, un peu plus pour les cheveux très longs.",
        action_config: { ask_phone: "required" },
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
        title: "Coupe homme",
        price: 28,
        price_type: "fixed",
        action_type: "contact_request",
        description: "Coupe aux ciseaux ou tondeuse, finitions nuque et contours.",
        action_config: { ask_phone: "optional" },
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
        title: "Balayage & soin",
        price: 120,
        price_type: "from",
        action_type: "contact_request",
        description:
          "Balayage à main levée, patine et soin profond. Je confirme après avoir vu une photo de vos cheveux.",
        action_config: { ask_phone: "required" },
        custom_fields: [
          text("f_products", "Produits", "Couleur végétale sans ammoniaque, soin Olaplex"),
          number("f_hold", "Tenue moyenne", 12, "semaines"),
          bool("f_test", "Test d'allergie 48 h avant", true),
        ],
      },
      {
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
  },
  {
    email: "lea.martin.demo@example.com",
    display_name: "Léa Martin",
    slug: "lea-martin-coaching",
    category: "fitness-coach",
    accent: "forest",
    theme: "sunset",
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
    offers: [
      {
        title: "Séance individuelle — 60 min",
        price: 55,
        price_type: "fixed",
        action_type: "contact_request",
        description:
          "Échauffement, travail technique et renforcement adapté à votre objectif. Premier rendez-vous : bilan inclus.",
        action_config: { ask_phone: "optional" },
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
        title: "Cours collectif plein air",
        price: 15,
        price_type: "fixed",
        action_type: "contact_request",
        description:
          "Circuit training de 45 min, 8 personnes maximum. Samedi matin, départ Miroir d'eau.",
        action_config: { ask_phone: "optional" },
        custom_fields: [
          text("f_meeting", "Point de rendez-vous", "Miroir d'eau, côté place de la Bourse"),
          range("f_time", "Horaire", "09:00", "09:45"),
          number("f_spots", "Places par séance", 8, "personnes"),
        ],
      },
      {
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
        title: "Une question ?",
        price: null,
        price_type: "free",
        action_type: "whatsapp_direct",
        description: "Pas sûr de la formule ? Écrivez-moi.",
        action_config: { prefilled_message: "Bonjour Léa, j'ai vu votre page et…" },
        custom_fields: [text("f_reply", "Délai de réponse", "Dans la journée")],
      },
    ],
  },
  {
    email: "karim.benali.demo@example.com",
    display_name: "Karim Benali — Immobilier",
    slug: "karim-benali-immo",
    category: "real-estate",
    accent: "ocean",
    theme: "minimal",
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
    offers: [
      {
        title: "Estimation de votre bien",
        price: null,
        price_type: "free",
        action_type: "contact_request",
        description:
          "Je viens voir le bien, je compare avec les ventes récentes du quartier et je vous remets un avis de valeur écrit sous 48 h.",
        action_config: { ask_phone: "required" },
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
        title: "Visite — T3 traversant, pentes de la Croix-Rousse",
        price: null,
        price_type: "free",
        action_type: "contact_request",
        description:
          "68 m², 3e étage sans ascenseur, vue dégagée, parquet d'origine. Visites de 30 minutes, je confirme chaque demande.",
        action_config: { ask_phone: "required" },
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
  },
  {
    email: "thomas.leroy.demo@example.com",
    display_name: "Thomas Leroy",
    slug: "thomas-leroy-maths",
    category: "tutor",
    accent: "amber",
    theme: "midnight",
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
    offers: [
      {
        title: "Cours particulier — 1 h",
        price: 35,
        price_type: "fixed",
        action_type: "contact_request",
        description:
          "Méthode, exercices et fiches de révision. Collège et lycée, maths ou physique-chimie.",
        action_config: { ask_phone: "optional" },
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
        title: "Stage intensif bac — 5 matinées",
        price: 220,
        price_type: "fixed",
        action_type: "contact_request",
        description:
          "Vacances de Toussaint : 5 matinées de 3 h, 6 élèves maximum, sujets types et corrections détaillées.",
        action_config: { ask_phone: "required" },
        custom_fields: [
          range("f_hours", "Horaires", "09:00", "12:00"),
          number("f_group", "Élèves maximum", 6),
          text("f_place", "Lieu", "Salle de la Maison des associations, Nantes centre"),
        ],
      },
      {
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
        theme: coach.theme,
        accent_color: HEX[coach.accent],
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
  for (const [position, offer] of coach.offers.entries()) {
    check(
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

  console.log(
    `  +  ${coach.email.padEnd(32)} /${coach.slug.padEnd(22)} ${coach.offers.length} offers`,
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
