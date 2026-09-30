import type { Locale } from "@/lib/i18n/config";

import type { LegalDocument } from "./types";

/*
 * Terms of use. The description of the service is written from what the
 * product actually does; every legal choice (governing law, liability cap,
 * notice periods, withdrawal right) is left in [BRACKETS] for the owner.
 */
export const terms: Record<Locale, LegalDocument> = {
  fr: {
    title: "Conditions générales d'utilisation",
    summary: "Les règles d'utilisation de TheSessionLink et de l'abonnement.",
    updated: "[DATE D'ENTRÉE EN VIGUEUR]",
    sections: [
      {
        heading: "1. Objet",
        blocks: [
          "Les présentes conditions encadrent l'utilisation du service TheSessionLink, édité par [NOM DE L'ENTREPRISE / AUTO-ENTREPRENEUR] (« nous »). En créant un compte, le professionnel les accepte sans réserve.",
          "Dans ce document, le « professionnel » est la personne inscrite qui publie sa page ; le « client » est la personne qui réserve depuis cette page, sans compte.",
        ],
      },
      {
        heading: "2. Description du service",
        blocks: [
          "TheSessionLink donne à chaque professionnel indépendant une page de réservation publique, à une adresse personnelle (thesessionlink.com/nom), qu'il partage à ses clients. Le service comprend notamment :",
          {
            list: [
              "un profil public : nom, métier, présentation, localisation, photo, moyens de contact et liens ;",
              "des offres avec leur prix, leur durée, leurs photos, des options payantes et des questions à poser au client ;",
              "un agenda : disponibilités hebdomadaires, fermetures, blocage de jours ou de plages horaires ;",
              "la réservation en ligne par les clients, sans création de compte, avec confirmation automatique ou manuelle ;",
              "les séances de groupe, les séries de séances récurrentes et une liste d'attente lorsqu'un créneau est complet ;",
              "les e-mails de confirmation, de rappel (délai et message personnalisables) et d'annulation, avec un lien permettant au client de gérer sa réservation ;",
              "un fichier clients et l'historique des réservations ;",
              "en option, l'encaissement des séances via le compte Stripe ou PayPal du professionnel.",
            ],
          },
          "Lorsque le professionnel encaisse ses séances en ligne, l'argent est versé directement sur son propre compte Stripe ou PayPal. Nous ne prélevons aucune commission et ne sommes pas partie à la vente entre le professionnel et son client : les prix, les conditions d'annulation et l'exécution des prestations relèvent du seul professionnel.",
          "Le service est proposé en français et en anglais.",
        ],
      },
      {
        heading: "3. Compte",
        blocks: [
          "L'inscription se fait avec une adresse e-mail (lien de connexion envoyé par e-mail) ou un compte Google. Le professionnel fournit des informations exactes et reste responsable de l'accès à sa boîte e-mail et à son compte Google.",
          "[CONDITIONS D'ACCÈS : SERVICE RÉSERVÉ AUX PROFESSIONNELS / ÂGE MINIMUM — À PRÉCISER]",
        ],
      },
      {
        heading: "4. Essai gratuit et abonnement",
        blocks: [
          "Chaque nouveau compte bénéficie d'un essai gratuit de 14 jours à compter de la création de son profil, sans carte bancaire.",
          "Le service est ensuite proposé sous forme d'abonnement mensuel à 19 € par mois [PRÉCISER TTC / HT], renouvelé tacitement chaque mois. Un professionnel qui s'abonne pendant son essai n'est prélevé qu'à la fin de celui-ci.",
          "À la fin de l'essai sans abonnement : [CONSÉQUENCE — PAR EXEMPLE MISE HORS LIGNE DE LA PAGE, CONSERVATION DES DONNÉES PENDANT UNE DURÉE À DÉFINIR].",
          "La commande et le paiement de l'abonnement sont traités par Paddle.com Market Limited, qui agit en tant que revendeur officiel (« Merchant of Record ») : Paddle encaisse le paiement, émet la facture et gère la TVA applicable. Ses conditions d'achat s'appliquent au paiement. Nous n'avons jamais accès aux données de carte bancaire.",
          "En cas d'échec de paiement, Paddle retente le prélèvement automatiquement. [CONSÉQUENCE D'UN IMPAYÉ PROLONGÉ — SUSPENSION, DÉLAI].",
          "Toute modification de prix est annoncée au moins [DÉLAI DE PRÉAVIS] à l'avance et ne s'applique qu'à la période suivante.",
          "[DROIT DE RÉTRACTATION — À RÉDIGER SELON QUE LE SERVICE S'ADRESSE AUX PROFESSIONNELS OU AUX CONSOMMATEURS]",
        ],
      },
      {
        heading: "5. Résiliation et suppression du compte",
        blocks: [
          "Le professionnel peut résilier son abonnement à tout moment, sans engagement, depuis « Gérer mon abonnement » dans ses paramètres. [DATE D'EFFET DE LA RÉSILIATION ET POLITIQUE DE REMBOURSEMENT — À PRÉCISER]. Sa page et ses données sont conservées : il peut se réabonner quand il le souhaite.",
          "Il peut aussi demander la suppression de son compte depuis ses paramètres. Le compte est alors fermé pendant 30 jours, durant lesquels il peut nous écrire pour le réactiver ; un rappel lui est envoyé 7 jours avant l'échéance. Passé ce délai, sa page, ses offres, ses réservations et ses fiches clients sont effacées définitivement.",
          "Nous pouvons suspendre ou fermer un compte en cas de manquement aux présentes conditions, notamment de contenu illicite ou d'usage frauduleux, [MODALITÉS ET PRÉAVIS].",
        ],
      },
      {
        heading: "6. Engagements du professionnel",
        blocks: [
          {
            list: [
              "publier des contenus exacts et licites, dont il détient les droits (textes, photos, noms) ;",
              "honorer les réservations qu'il accepte, ou prévenir ses clients en cas d'annulation ;",
              "respecter la réglementation applicable à son activité, y compris la protection des données de ses propres clients, dont il est responsable de traitement (voir la politique de confidentialité) ;",
              "ne pas perturber le fonctionnement du service ni tenter d'accéder aux données d'autres utilisateurs.",
            ],
          },
        ],
      },
      {
        heading: "7. Disponibilité et responsabilité",
        blocks: [
          "Nous faisons nos meilleurs efforts pour que le service soit accessible en continu, sans pouvoir le garantir : des interruptions peuvent survenir pour maintenance ou en cas de panne d'un prestataire.",
          "[LIMITATION DE RESPONSABILITÉ — PLAFOND ET EXCLUSIONS]",
        ],
      },
      {
        heading: "8. Propriété intellectuelle",
        blocks: [
          "Le service, la marque TheSessionLink, le design et le code nous appartiennent. L'abonnement donne un droit d'utilisation personnel et non exclusif, pour la durée du compte.",
          "Le professionnel reste propriétaire de ses contenus. Il nous accorde, pour la seule durée de son compte, le droit non exclusif de les héberger, de les reproduire et de les afficher dans la mesure nécessaire au fonctionnement du service.",
        ],
      },
      {
        heading: "9. Données personnelles",
        blocks: [
          "Le traitement des données personnelles est décrit dans la politique de confidentialité.",
        ],
      },
      {
        heading: "10. Modification des conditions",
        blocks: [
          "Nous pouvons faire évoluer ces conditions. Toute modification importante est notifiée par e-mail au moins [DÉLAI DE PRÉAVIS] avant son entrée en vigueur ; le professionnel qui ne l'accepte pas peut résilier son abonnement.",
        ],
      },
      {
        heading: "11. Droit applicable et litiges",
        blocks: [
          "Les présentes conditions sont soumises au [DROIT APPLICABLE].",
          "En cas de litige, les parties recherchent d'abord une solution amiable. À défaut : [JURIDICTION COMPÉTENTE / MÉDIATEUR DE LA CONSOMMATION, LE CAS ÉCHÉANT].",
          "Contact : [EMAIL DE CONTACT].",
        ],
      },
    ],
  },
  en: {
    title: "Terms of use",
    summary: "The rules for using TheSessionLink and its subscription.",
    updated: "[EFFECTIVE DATE]",
    sections: [
      {
        heading: "1. Purpose",
        blocks: [
          'These terms govern the use of TheSessionLink, published by [COMPANY NAME / SOLE TRADER NAME] ("we"). By creating an account, the professional accepts them in full.',
          'In this document, the "professional" is the registered person who publishes their page; the "client" is the person who books from that page, without an account.',
        ],
      },
      {
        heading: "2. The service",
        blocks: [
          "TheSessionLink gives each independent professional a public booking page at a personal address (thesessionlink.com/name) that they share with their clients. The service includes:",
          {
            list: [
              "a public profile: name, trade, bio, location, photo, contact options and links;",
              "offers with their price, duration, photos, paid add-ons and questions to ask the client;",
              "a calendar: weekly availability, closures, and blocking of whole days or time ranges;",
              "online booking by clients, with no account, confirmed automatically or by hand;",
              "group sessions, recurring series of sessions, and a waitlist when a slot is full;",
              "confirmation, reminder (timing and message can be customised) and cancellation emails, with a link letting the client manage their booking;",
              "a client file and booking history;",
              "optionally, collecting payment for sessions through the professional's own Stripe or PayPal account.",
            ],
          },
          "When the professional takes payment online, the money goes straight to their own Stripe or PayPal account. We take no commission and are not a party to the sale between the professional and their client: prices, cancellation terms and the delivery of the service are the professional's sole responsibility.",
          "The service is available in English and French.",
        ],
      },
      {
        heading: "3. Account",
        blocks: [
          "Sign-up uses an email address (a sign-in link is emailed) or a Google account. The professional provides accurate information and remains responsible for access to their mailbox and Google account.",
          "[ELIGIBILITY: BUSINESS USERS ONLY / MINIMUM AGE — TO BE SPECIFIED]",
        ],
      },
      {
        heading: "4. Free trial and subscription",
        blocks: [
          "Every new account gets a 14-day free trial from the creation of its profile, with no card required.",
          "The service is then offered as a monthly subscription at €19 per month [SPECIFY WHETHER VAT IS INCLUDED], renewed automatically each month. A professional who subscribes during their trial is only charged when it ends.",
          "When the trial ends without a subscription: [CONSEQUENCE — FOR EXAMPLE THE PAGE GOES OFFLINE, DATA KEPT FOR A PERIOD TO BE DEFINED].",
          "Subscription orders and payments are handled by Paddle.com Market Limited, acting as reseller and Merchant of Record: Paddle takes the payment, issues the invoice and handles the applicable VAT. Paddle's buyer terms apply to the payment. We never have access to card details.",
          "If a payment fails, Paddle retries it automatically. [CONSEQUENCE OF PROLONGED NON-PAYMENT — SUSPENSION, TIMING].",
          "Any price change is announced at least [NOTICE PERIOD] in advance and only applies from the next billing period.",
          "[RIGHT OF WITHDRAWAL — TO BE WRITTEN DEPENDING ON WHETHER THE SERVICE IS FOR BUSINESSES OR CONSUMERS]",
        ],
      },
      {
        heading: "5. Cancellation and account deletion",
        blocks: [
          'The professional can cancel their subscription at any time, with no commitment, from "Manage my subscription" in their settings. [WHEN CANCELLATION TAKES EFFECT AND REFUND POLICY — TO BE SPECIFIED]. Their page and data are kept: they can subscribe again whenever they like.',
          "They can also ask for their account to be deleted from their settings. The account is then closed for 30 days, during which they can write to us to reactivate it; a reminder is sent 7 days before the deadline. After that, their page, offers, bookings and client records are permanently erased.",
          "We may suspend or close an account that breaches these terms, in particular for unlawful content or fraudulent use, [PROCEDURE AND NOTICE].",
        ],
      },
      {
        heading: "6. The professional's commitments",
        blocks: [
          {
            list: [
              "publish accurate, lawful content they hold the rights to (text, photos, names);",
              "honour the bookings they accept, or tell their clients if they have to cancel;",
              "comply with the rules that apply to their business, including the protection of their own clients' data, for which they are the controller (see the privacy policy);",
              "not disrupt the service or try to access other users' data.",
            ],
          },
        ],
      },
      {
        heading: "7. Availability and liability",
        blocks: [
          "We do our best to keep the service available at all times but cannot guarantee it: interruptions may occur for maintenance or when a provider fails.",
          "[LIMITATION OF LIABILITY — CAP AND EXCLUSIONS]",
        ],
      },
      {
        heading: "8. Intellectual property",
        blocks: [
          "The service, the TheSessionLink name, the design and the code belong to us. The subscription grants a personal, non-exclusive right of use for as long as the account exists.",
          "The professional keeps ownership of their content. For the life of their account only, they grant us the non-exclusive right to host, reproduce and display it as far as needed to run the service.",
        ],
      },
      {
        heading: "9. Personal data",
        blocks: ["How personal data is handled is described in the privacy policy."],
      },
      {
        heading: "10. Changes to these terms",
        blocks: [
          "We may update these terms. Any significant change is emailed at least [NOTICE PERIOD] before it takes effect; a professional who does not accept it can cancel their subscription.",
        ],
      },
      {
        heading: "11. Governing law and disputes",
        blocks: [
          "These terms are governed by [GOVERNING LAW].",
          "In a dispute, the parties first seek an amicable solution. Failing that: [COMPETENT COURT / CONSUMER MEDIATOR, IF APPLICABLE].",
          "Contact: [CONTACT EMAIL].",
        ],
      },
    ],
  },
};
