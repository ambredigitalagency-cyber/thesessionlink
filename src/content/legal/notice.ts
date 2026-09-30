import type { Locale } from "@/lib/i18n/config";

import type { LegalDocument } from "./types";

/*
 * Legal notice (mentions légales). Everything in [BRACKETS] is for the owner
 * to fill in. The host's address is Vercel's own, as published in its
 * Privacy Notice (vercel.com/legal/privacy-policy), checked on 30/09/2026.
 */
export const notice: Record<Locale, LegalDocument> = {
  fr: {
    title: "Mentions légales",
    summary: "Qui édite TheSessionLink, et qui l'héberge.",
    updated: "[DATE DE MISE À JOUR]",
    sections: [
      {
        heading: "Éditeur du site",
        blocks: [
          "Le site TheSessionLink, accessible à l'adresse [ADRESSE DU SITE], est édité par :",
          {
            list: [
              "[NOM DE L'ENTREPRISE / AUTO-ENTREPRENEUR]",
              "Forme juridique : [FORME JURIDIQUE ET CAPITAL SOCIAL, LE CAS ÉCHÉANT]",
              "Adresse : [ADRESSE]",
              "Immatriculation : [NUMÉRO D'IMMATRICULATION]",
              "TVA intracommunautaire : [NUMÉRO DE TVA OU MENTION D'EXONÉRATION]",
              "Contact : [EMAIL DE CONTACT]",
            ],
          },
          "Directeur de la publication : [NOM DU DIRECTEUR DE LA PUBLICATION].",
        ],
      },
      {
        heading: "Hébergement",
        blocks: [
          "Le site est hébergé par Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis (vercel.com).",
          "La base de données et les fichiers envoyés par les utilisateurs sont hébergés par Supabase Inc., [ADRESSE LÉGALE DE SUPABASE], sur des serveurs situés dans l'Union européenne (Irlande).",
        ],
      },
      {
        heading: "Propriété intellectuelle",
        blocks: [
          "La marque TheSessionLink, le logo, le design, les textes et le code du site sont la propriété de [NOM DE L'ENTREPRISE / AUTO-ENTREPRENEUR]. Toute reproduction sans autorisation préalable est interdite.",
          "Les photographies de la page d'accueil proviennent d'Unsplash et sont utilisées sous la licence Unsplash.",
        ],
      },
      {
        heading: "Pages des professionnels",
        blocks: [
          "Chaque page publique (thesessionlink.com/nom) est rédigée par le professionnel qui l'a créée, sous sa seule responsabilité. Pour signaler un contenu illicite, écrivez à [EMAIL DE CONTACT].",
        ],
      },
    ],
  },
  en: {
    title: "Legal notice",
    summary: "Who publishes TheSessionLink, and who hosts it.",
    updated: "[LAST UPDATED DATE]",
    sections: [
      {
        heading: "Publisher",
        blocks: [
          "TheSessionLink, available at [WEBSITE ADDRESS], is published by:",
          {
            list: [
              "[COMPANY NAME / SOLE TRADER NAME]",
              "Legal form: [LEGAL FORM AND SHARE CAPITAL, IF ANY]",
              "Address: [ADDRESS]",
              "Registration: [REGISTRATION NUMBER]",
              "VAT number: [VAT NUMBER OR EXEMPTION STATEMENT]",
              "Contact: [CONTACT EMAIL]",
            ],
          },
          "Publication director: [NAME OF THE PUBLICATION DIRECTOR].",
        ],
      },
      {
        heading: "Hosting",
        blocks: [
          "The site is hosted by Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, United States (vercel.com).",
          "The database and the files users upload are hosted by Supabase Inc., [SUPABASE LEGAL ADDRESS], on servers located in the European Union (Ireland).",
        ],
      },
      {
        heading: "Intellectual property",
        blocks: [
          "The TheSessionLink name, logo, design, copy and code belong to [COMPANY NAME / SOLE TRADER NAME]. Reproduction without prior permission is prohibited.",
          "The photographs on the home page come from Unsplash and are used under the Unsplash License.",
        ],
      },
      {
        heading: "Professionals' pages",
        blocks: [
          "Each public page (thesessionlink.com/name) is written by the professional who created it, under their sole responsibility. To report unlawful content, write to [CONTACT EMAIL].",
        ],
      },
    ],
  },
};
