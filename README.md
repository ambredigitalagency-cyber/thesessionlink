# TheSessionLink

One link an independent professional can share anywhere — Instagram bio, email signature, WhatsApp — where clients find what they offer and reach them: a message, a quote request or a WhatsApp chat.

Coaches, realtors, hairdressers, tutors, photographers, consultants: **no profession is hardcoded**. The data model is generic; a niche is a row in a table, not a migration.

- **Public profile** — `/[slug]`: card, offers, and an action flow that adapts to each offer.
- **Dashboard** — profile, offers, settings.
- **Onboarding** — four steps, no way out before the first offer exists.

## Stack

| Area       | Choice                                                      |
| ---------- | ----------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Server Actions, Turbopack)          |
| Language   | TypeScript, React 19                                        |
| Styling    | Tailwind CSS v4 (CSS-first tokens in `src/app/globals.css`) |
| Animation  | Motion (formerly Framer Motion) — `motion/react`            |
| Backend    | Supabase (Postgres + Auth + Storage), RLS everywhere        |
| Email      | Resend + React Email templates, EN/FR                       |
| i18n       | next-intl, cookie-based (no locale prefix in URLs)          |
| Deployment | Vercel                                                      |

## Quick start

```bash
npm install
cp .env.example .env.local      # already filled for the local stack below

npm run db:start                # Supabase in Docker (ports 54421/54422)
npm run db:reset                # migrations + demo data
npm run dev                     # http://localhost:3000
```

The seed creates a demo pro: **demo@thesessionlink.com** with the public page
[`/ana-coach`](http://localhost:3000/ana-coach). Sign in from `/login` — without a Resend key,
magic links are printed in the server log and also land in Mailpit (http://127.0.0.1:54424).

> Local Supabase runs on shifted ports (`54421` API, `54422` DB, `54423` Studio) so it can coexist
> with another local Supabase project. They live in `supabase/config.toml`.

### Commands

| Command             | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Dev server                                      |
| `npm run build`     | Production build                                |
| `npm test`          | Vitest (offer fields, i18n parity, billing)     |
| `npm run typecheck` | `tsc --noEmit`                                  |
| `npm run lint`      | ESLint                                          |
| `npm run format`    | Prettier                                        |
| `npm run db:reset`  | Re-apply migrations + seed locally              |
| `npm run db:types`  | Regenerate `src/lib/supabase/database.types.ts` |
| `npm run db:push`   | Push migrations to the linked Supabase project  |

## Environment

| Variable                               | Required | Notes                                           |
| -------------------------------------- | -------- | ----------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | yes      | Supabase project URL                            |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes      | Publishable (anon) key                          |
| `SUPABASE_SECRET_KEY`                  | yes      | Service role key — server only                  |
| `NEXT_PUBLIC_SITE_URL`                 | yes      | Public base URL, used in share links and emails |
| `RESEND_API_KEY`                       | no       | Without it, emails are logged instead of sent   |
| `EMAIL_FROM`, `EMAIL_REPLY_TO`         | no       | Sender identity                                 |
| `CRON_SECRET`                          | yes      | Bearer token for `/api/cron/deletion-warnings`  |

The service key is used only where RLS cannot express the rule: sending public requests (the
coach's address is private), the deletion-warning cron, and generating magic links.

## Data model

Generic by design — the only closed set is the action type.

| Table                 | Purpose                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| `activity_categories` | Niches. `config.suggested_fields` pre-fills the offer form. **Insert a row to add a niche.**         |
| `profiles`            | Public identity, contact channels, timezone, locale, accent.                                         |
| `offers`              | Common core (title, description, price, photo, `action_type`, position, active) + two JSONB columns. |

Two JSONB columns on `offers` carry everything niche-specific:

- **`custom_fields`** — what is _displayed_: `[{ id, key, label, type, value, unit, source }]`.
  Suggested by the category, editable and extensible by the pro.
- **`action_config`** — how the _action_ behaves: button label, prompt, phone requirement,
  budget and date questions… Tied to the action type, never to a profession.

### The three action types

| Type              | Client flow                                       |
| ----------------- | ------------------------------------------------- |
| `contact_request` | Sends a message                                   |
| `whatsapp_direct` | Opens WhatsApp with a pre-written message         |
| `quote_request`   | Describes a need, the pro comes back with a price |

### Guarantees enforced in the database

RLS is on for every table, and the invariants that matter do not depend on the app:

- `offers_complete_onboarding` — the first offer publishes the profile.
- `public_profiles` view — the only public read path; masks contact channels switched off.

## Emails

Sent through Resend, rendered with React Email, localized from the same message files as the UI.

1. A message or quote request from a public offer, to the pro, with reply-to set to the client.
   Nothing is stored: the email is the request.
2. The client's copy of what they sent.
3. The account-deletion warning, a week before the purge.
4. Magic link for sign-in.

Without `RESEND_API_KEY`, every email is printed to the server log instead — the whole flow stays
testable offline.

### Scheduled jobs

pg_cron inside Supabase purges deleted accounts nightly and pings
`/api/cron/deletion-warnings` an hour before. The ping needs two Vault secrets, once per
environment:

```sql
select vault.create_secret('https://your-app.vercel.app', 'app_url');
select vault.create_secret('<CRON_SECRET>', 'cron_secret');
```

Until those secrets exist, `dispatch_deletion_warnings()` is a no-op.

## Deployment

1. Create a Supabase project, then `npx supabase link --project-ref <ref>` and `npm run db:push`.
2. In **Authentication → URL Configuration**, set the site URL and add `https://<domain>/**` to the
   redirect allow list.
3. Deploy on Vercel with the environment variables above.
4. Verify a sending domain in Resend and set `EMAIL_FROM`.
5. Add the two Vault secrets for the scheduled jobs (see above).

## Adding a niche

No migration, no deploy:

```sql
insert into public.activity_categories (slug, name, icon, position, config) values
('dog-trainer',
 '{"en":"Dog trainer","fr":"Éducateur canin"}',
 'shapes', 130,
 '{"default_action_type":"contact_request","suggested_fields":[
   {"key":"format","type":"select","label":{"en":"Format","fr":"Format"},"options":[
     {"value":"at_home","label":{"en":"At your home","fr":"À domicile"}},
     {"value":"outdoor","label":{"en":"Outdoor","fr":"En extérieur"}}]},
   {"key":"dog_size","type":"text","label":{"en":"Dog size","fr":"Taille du chien"}}
 ]}');
```

Icons map to `src/components/categories/category-icon.tsx`; unknown names fall back to a default.

## Project layout

```
src/
  actions/            Server actions (auth, profile, offers, settings, public request, admin, billing)
  app/
    (marketing)/      Landing page
    [slug]/           Public profile + OG image
    dashboard/        Profile · Offers · Settings
    onboarding/       Four steps
    api/              Paddle webhook, deletion-warning cron
  components/         ui/ · marketing/ · dashboard/ · offers/ · public-profile/ · media/ · share/
  lib/
    offers/           Action config & custom field schemas
    emails/           Resend senders + React Email templates
    supabase/         Browser / server / admin clients, generated types
messages/             en.json · fr.json (key parity is tested)
supabase/migrations/  Schema, storage, cron, categories, rate limits, billing
```

## Internationalization

English by default, French available. No locale prefix in URLs: `/[slug]` **is** the product, so
the language comes from a cookie set by the switcher. A public profile falls back to the language
its owner works in, and each area only ships the message namespaces it renders.

## Payments

The only payment the product handles is the coach's own subscription, through Paddle (see
`src/lib/billing/paddle.ts`). A coach's clients settle with the coach directly.
