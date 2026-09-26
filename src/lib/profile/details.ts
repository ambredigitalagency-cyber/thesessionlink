import { FIELD_TYPES } from "@/lib/offers/fields";
import type { CategoryField } from "@/lib/offers/schema";

/** Photos stay with the offers: the profile has no gallery of its own. */
export const PROFILE_FIELD_TYPES = FIELD_TYPES.filter((type) => type !== "images");

/**
 * Ready-made details for the profile itself, offered as one-tap ideas in the
 * same editor the offers use (profiles.custom_fields).
 *
 * They answer what a client asks before choosing anyone, whatever the trade:
 * how long have you done this, in which languages, with which credentials,
 * where, and how fast do you answer. Anything else is one "add a field" away.
 */
export const PROFILE_FIELD_SUGGESTIONS: CategoryField[] = [
  {
    key: "experience",
    type: "number",
    label: { fr: "Années d'expérience", en: "Years of experience" },
  },
  {
    key: "languages",
    type: "text",
    label: { fr: "Langues parlées", en: "Languages spoken" },
    placeholder: { fr: "Français, anglais", en: "English, French" },
  },
  {
    key: "credentials",
    type: "textarea",
    label: { fr: "Diplômes et certifications", en: "Qualifications" },
  },
  {
    key: "area",
    type: "text",
    label: { fr: "Zone d'intervention", en: "Area covered" },
  },
  {
    key: "response",
    type: "select",
    label: { fr: "Délai de réponse", en: "Response time" },
    options: [
      { value: "hour", label: { fr: "Dans l'heure", en: "Within the hour" } },
      { value: "day", label: { fr: "Dans la journée", en: "Same day" } },
      { value: "two_days", label: { fr: "Sous 48 h", en: "Within 48 h" } },
    ],
  },
  {
    key: "payment",
    type: "text",
    label: { fr: "Moyens de paiement acceptés", en: "Payment accepted" },
    placeholder: { fr: "Espèces, carte, virement", en: "Cash, card, bank transfer" },
  },
];
