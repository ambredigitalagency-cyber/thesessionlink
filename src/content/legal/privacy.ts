import type { Locale } from "@/lib/i18n/config";

import type { LegalDocument } from "./types";

/*
 * Privacy policy. The data list, the processors and the retention periods the
 * code enforces are taken from the product itself (schema, sign-in history,
 * rate limits, 30-day deletion); anything the code does not decide is left in
 * [BRACKETS] for the owner. Keep this file in step with the schema: a new
 * table of personal data, or a new provider, belongs here too.
 */
export const privacy: Record<Locale, LegalDocument> = {
  fr: {
    title: "Politique de confidentialité",
    summary: "Quelles données TheSessionLink traite, pourquoi, avec qui, et vos droits.",
    updated: "[DATE DE MISE À JOUR]",
    sections: [
      {
        heading: "1. Responsable du traitement",
        blocks: [
          "[NOM DE L'ENTREPRISE / AUTO-ENTREPRENEUR], [ADRESSE] — contact : [EMAIL DE CONTACT].",
          "[DÉLÉGUÉ À LA PROTECTION DES DONNÉES, S'IL EN EST DÉSIGNÉ UN]",
        ],
      },
      {
        heading: "2. Deux rôles différents",
        blocks: [
          "Pour les données des professionnels inscrits (compte, profil, abonnement), nous sommes responsables du traitement.",
          "Pour les données des clients qui réservent sur la page d'un professionnel, c'est le professionnel qui est responsable du traitement : nous les traitons pour son compte, en tant que sous-traitant, uniquement pour faire fonctionner le service. [ACCORD DE SOUS-TRAITANCE (DPA) — À METTRE À DISPOSITION DES PROFESSIONNELS]",
        ],
      },
      {
        heading: "3. Données collectées",
        blocks: [
          {
            list: [
              "Compte : adresse e-mail ; en cas de connexion avec Google, le nom et l'identifiant du compte Google.",
              "Profil public : nom affiché, adresse de la page, métier, présentation, localisation, photo, moyens de contact (e-mail, téléphone, WhatsApp), liens vers les réseaux sociaux, langue, fuseau horaire et apparence de la page.",
              "Offres : titres, descriptions, prix, durées, photos, options payantes et questions posées aux clients.",
              "Agenda : disponibilités, fermetures et créneaux bloqués.",
              "Clients et réservations : nom, e-mail et téléphone du client, message et réponses aux questions de l'offre, date, heure, fuseau horaire et langue de la réservation, notes internes du professionnel, inscriptions en liste d'attente, historique des réservations et des annulations.",
              "Abonnement : identifiants client et abonnement Paddle, statut et dates de l'abonnement. Aucune donnée de carte bancaire : elles restent chez Paddle.",
              "Paiement des séances, si le professionnel l'active : identifiant de son compte Stripe ou PayPal, montants et statuts des paiements. Aucune donnée de carte bancaire.",
              "Historique de connexion des professionnels : date, méthode (lien e-mail ou Google), type de navigateur et de système (par exemple « Chrome · Windows », jamais la signature complète du navigateur) et adresse IP tronquée à son réseau, qui ne désigne pas un appareil précis.",
              "Protection contre les abus : lors d'une réservation, l'adresse IP et l'e-mail servent à limiter le nombre de demandes ; ces compteurs sont effacés automatiquement au bout d'environ 24 heures.",
            ],
          },
        ],
      },
      {
        heading: "4. Finalités et bases légales",
        blocks: [
          {
            list: [
              "Fournir le service : page publique, réservations, e-mails de confirmation et de rappel — exécution du contrat.",
              "Gérer l'abonnement et la facturation — exécution du contrat et obligations légales comptables.",
              "Sécuriser les comptes et prévenir les abus : historique de connexion, limitation des demandes — intérêt légitime.",
              "Répondre aux demandes de support — intérêt légitime.",
            ],
          },
          "Nous n'utilisons pas les données à des fins publicitaires et ne les vendons pas.",
        ],
      },
      {
        heading: "5. Sous-traitants",
        blocks: [
          "Nous faisons appel aux prestataires suivants, qui ne traitent les données que pour nous rendre leur service :",
          {
            list: [
              "Supabase — base de données, authentification et stockage des fichiers. Serveurs dans l'Union européenne (Irlande).",
              "Resend — envoi des e-mails (lien de connexion, confirmations, rappels). [LOCALISATION DES SERVEURS]",
              "Paddle — paiement et facturation de l'abonnement, en tant que revendeur officiel (Merchant of Record) ; Paddle est aussi responsable de ses propres traitements.",
              "Vercel — hébergement et diffusion du site. Siège aux États-Unis.",
              "Google — uniquement si vous choisissez « Continuer avec Google » pour vous connecter.",
            ],
          },
          "Lorsqu'un professionnel encaisse ses séances en ligne, le paiement du client est traité par Stripe ou PayPal, sur le compte du professionnel et selon leurs propres politiques de confidentialité.",
          "Certains de ces prestataires peuvent traiter des données hors de l'Union européenne. Ces transferts sont encadrés par [GARANTIES — CLAUSES CONTRACTUELLES TYPES, DATA PRIVACY FRAMEWORK : À VÉRIFIER POUR CHAQUE PRESTATAIRE].",
        ],
      },
      {
        heading: "6. Durées de conservation",
        blocks: [
          {
            list: [
              "Données du compte, du profil, des offres, des clients et des réservations : tant que le compte existe.",
              "Après une demande de suppression du compte : 30 jours, pendant lesquels le compte peut être réactivé sur demande, puis effacement définitif.",
              "Compte en fin d'essai sans abonnement : [DURÉE DE CONSERVATION].",
              "Historique de connexion : conservé pendant toute la durée de vie de votre compte, supprimé avec lui.",
              "Compteurs anti-abus : environ 24 heures.",
              "Pièces comptables et de facturation : [DURÉE LÉGALE DE CONSERVATION].",
              "Sauvegardes techniques : [DURÉE DE RÉTENTION DES SAUVEGARDES].",
            ],
          },
        ],
      },
      {
        heading: "7. Vos droits",
        blocks: [
          "[SI LE RGPD S'APPLIQUE] Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité de vos données, ainsi que du droit de définir des directives sur leur sort après votre décès.",
          "Les professionnels peuvent modifier la plupart de leurs données directement depuis leur tableau de bord, et supprimer leur compte depuis leurs paramètres. Pour toute autre demande, écrivez à [EMAIL DE CONTACT] ; nous répondons dans un délai d'un mois.",
          "Si vous avez réservé auprès d'un professionnel, adressez-vous d'abord à lui : il est responsable de vos données. Vous pouvez aussi nous écrire, et nous lui transmettrons votre demande.",
          "Vous pouvez introduire une réclamation auprès de [AUTORITÉ DE CONTRÔLE COMPÉTENTE].",
        ],
      },
      {
        heading: "8. Cookies",
        blocks: [
          "Le site n'utilise que des cookies nécessaires à son fonctionnement : les cookies de session qui maintiennent un professionnel connecté, et un cookie qui mémorise la langue choisie. Aucun cookie publicitaire ni de mesure d'audience.",
          "La fenêtre de paiement de Paddle, lorsqu'elle est ouverte, peut déposer ses propres cookies.",
        ],
      },
      {
        heading: "9. Modifications",
        blocks: [
          "Cette politique peut évoluer avec le service. La date de mise à jour figure en haut de la page ; tout changement important est signalé par e-mail aux professionnels.",
        ],
      },
    ],
  },
  en: {
    title: "Privacy policy",
    summary: "What data TheSessionLink handles, why, with whom, and your rights.",
    updated: "[LAST UPDATED DATE]",
    sections: [
      {
        heading: "1. Controller",
        blocks: [
          "[COMPANY NAME / SOLE TRADER NAME], [ADDRESS] — contact: [CONTACT EMAIL].",
          "[DATA PROTECTION OFFICER, IF ONE IS APPOINTED]",
        ],
      },
      {
        heading: "2. Two different roles",
        blocks: [
          "For the data of registered professionals (account, profile, subscription), we are the controller.",
          "For the data of clients who book on a professional's page, the professional is the controller: we process it on their behalf, as a processor, only to run the service. [DATA PROCESSING AGREEMENT (DPA) — TO BE MADE AVAILABLE TO PROFESSIONALS]",
        ],
      },
      {
        heading: "3. Data we collect",
        blocks: [
          {
            list: [
              "Account: email address; when signing in with Google, the name and identifier of the Google account.",
              "Public profile: display name, page address, trade, bio, location, photo, contact options (email, phone, WhatsApp), social links, language, time zone and page appearance.",
              "Offers: titles, descriptions, prices, durations, photos, paid add-ons and the questions asked to clients.",
              "Calendar: availability, closures and blocked slots.",
              "Clients and bookings: the client's name, email and phone number, their message and answers to the offer's questions, the date, time, time zone and language of the booking, the professional's internal notes, waitlist entries, and the history of bookings and cancellations.",
              "Subscription: Paddle customer and subscription identifiers, subscription status and dates. No card details: those stay with Paddle.",
              "Session payments, if the professional turns them on: the identifier of their Stripe or PayPal account, payment amounts and statuses. No card details.",
              'Professionals\' sign-in history: date, method (email link or Google), browser and system family (for example "Chrome · Windows", never the full browser signature) and the IP address cut down to its network, which does not point to a specific device.',
              "Abuse protection: when a booking is made, the IP address and email are used to limit the number of requests; these counters are erased automatically after about 24 hours.",
            ],
          },
        ],
      },
      {
        heading: "4. Purposes and legal bases",
        blocks: [
          {
            list: [
              "Providing the service: public page, bookings, confirmation and reminder emails — performance of the contract.",
              "Managing the subscription and billing — performance of the contract and legal accounting obligations.",
              "Securing accounts and preventing abuse: sign-in history, request limits — legitimate interest.",
              "Answering support requests — legitimate interest.",
            ],
          },
          "We do not use data for advertising and we do not sell it.",
        ],
      },
      {
        heading: "5. Processors",
        blocks: [
          "We rely on the following providers, who only process data to deliver their service to us:",
          {
            list: [
              "Supabase — database, authentication and file storage. Servers in the European Union (Ireland).",
              "Resend — sending emails (sign-in links, confirmations, reminders). [SERVER LOCATION]",
              "Paddle — subscription payment and invoicing, as reseller and Merchant of Record; Paddle is also the controller of its own processing.",
              "Vercel — hosting and delivery of the site. Headquartered in the United States.",
              'Google — only if you choose "Continue with Google" to sign in.',
            ],
          },
          "When a professional takes payment for sessions online, the client's payment is handled by Stripe or PayPal, on the professional's own account and under their own privacy policies.",
          "Some of these providers may process data outside the European Union. These transfers are covered by [SAFEGUARDS — STANDARD CONTRACTUAL CLAUSES, DATA PRIVACY FRAMEWORK: TO BE CHECKED FOR EACH PROVIDER].",
        ],
      },
      {
        heading: "6. Retention",
        blocks: [
          {
            list: [
              "Account, profile, offer, client and booking data: for as long as the account exists.",
              "After an account deletion request: 30 days, during which the account can be reactivated on request, then permanent erasure.",
              "Accounts whose trial ended without a subscription: [RETENTION PERIOD].",
              "Sign-in history: kept for the whole lifetime of your account, deleted along with it.",
              "Abuse-protection counters: about 24 hours.",
              "Accounting and billing records: [LEGAL RETENTION PERIOD].",
              "Technical backups: [BACKUP RETENTION PERIOD].",
            ],
          },
        ],
      },
      {
        heading: "7. Your rights",
        blocks: [
          "[IF THE GDPR APPLIES] You have the right to access, rectify, erase, restrict, object to and port your data, and to set instructions for what happens to it after your death.",
          "Professionals can change most of their data directly from their dashboard, and delete their account from their settings. For anything else, write to [CONTACT EMAIL]; we reply within one month.",
          "If you booked with a professional, contact them first: they are the controller of your data. You can also write to us and we will pass your request on.",
          "You can lodge a complaint with [COMPETENT SUPERVISORY AUTHORITY].",
        ],
      },
      {
        heading: "8. Cookies",
        blocks: [
          "The site only uses cookies it needs to work: session cookies that keep a professional signed in, and one cookie that remembers the chosen language. No advertising or analytics cookies.",
          "Paddle's checkout window, when opened, may set its own cookies.",
        ],
      },
      {
        heading: "9. Changes",
        blocks: [
          "This policy may change as the service evolves. The date at the top of the page shows the latest update; significant changes are emailed to professionals.",
        ],
      },
    ],
  },
};
