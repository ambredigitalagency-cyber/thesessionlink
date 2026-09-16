-- =============================================================================
-- Local demo data (runs on `npm run db:reset`, never in production).
-- Sign in as demo@thesessionlink.com — the magic link lands in Mailpit.
-- =============================================================================

-- GoTrue scans these text columns, so they must be empty strings, never null.
insert into auth.users (
  id, instance_id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
  email_change, phone_change, phone_change_token, reauthentication_token,
  is_sso_user, is_anonymous, created_at, updated_at
)
values (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'demo@thesessionlink.com',
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  '', '', '', '', '', '', '', '',
  false, false, now(), now()
)
on conflict (id) do nothing;

insert into public.profiles (
  id, user_id, display_name, slug, headline, bio, location, category_id,
  social_links, whatsapp_number, contact_email, phone_number, contact_channels,
  theme, locale, timezone, currency, onboarding_completed_at
)
values (
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000001',
  'Ana Torres',
  'ana-coach',
  'Strength coach · online and in person',
  E'I help beginners build a routine they actually keep.\nSmall groups, no gym intimidation, real progress in twelve weeks.',
  'Lyon, France',
  (select id from public.activity_categories where slug = 'fitness-coach'),
  '{"instagram": "anatorres.coach", "website": "https://example.com"}',
  '+33612345678',
  'demo@thesessionlink.com',
  '+33612345678',
  '{"email": true, "phone": false, "whatsapp": true}',
  '{"accent": "coral"}',
  'en',
  'Europe/Paris',
  'EUR',
  now()
)
on conflict (id) do nothing;

insert into public.offers (
  id, profile_id, title, description, price, price_type, action_type, action_config,
  custom_fields, position, is_active
)
values
  (
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000010',
    'Personal training — 60 min',
    'A one-to-one session built around your goals. Gym, park or your place.',
    60, 'fixed', 'calendar_booking',
    '{"duration_minutes": 60, "buffer_minutes": 15, "min_notice_hours": 4, "max_days_ahead": 45, "requires_confirmation": false, "ask_phone": "optional"}',
    '[{"id":"suggested-format","key":"format","label":"Format","type":"select","value":"In person","source":"suggested"},
      {"id":"suggested-level","key":"level","label":"Level","type":"select","value":"All levels","source":"suggested"}]',
    0, true
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000010',
    'Small group class — 4 spots',
    'Outdoor circuit training. Bring water, we bring everything else.',
    18, 'fixed', 'direct_reservation',
    '{"capacity": 4, "date_mode": "required", "max_quantity_per_booking": 2, "quantity_label": "spots", "requires_confirmation": true, "ask_phone": "optional"}',
    '[{"id":"suggested-location","key":"location","label":"Location","type":"text","value":"Parc de la Tête d''Or","source":"suggested"}]',
    1, true
  ),
  (
    '00000000-0000-4000-8000-000000000103',
    '00000000-0000-4000-8000-000000000010',
    '12-week transformation',
    'Programme, weekly check-ins and nutrition guidance. We talk first to see if it fits.',
    540, 'from', 'quote_request',
    '{"ask_budget": false, "ask_preferred_date": true, "ask_phone": "required", "brief_prompt": "Tell me about your goal and your current routine."}',
    '[]',
    2, true
  ),
  (
    '00000000-0000-4000-8000-000000000104',
    '00000000-0000-4000-8000-000000000010',
    'Quick question?',
    'Not sure which option fits? Send me a message.',
    null, 'free', 'whatsapp_direct',
    '{"prefilled_message": "Hi Ana! I saw your page and I''d like to know more about…"}',
    '[]',
    3, true
  )
on conflict (id) do nothing;

-- A confirmed session next week and a request waiting for an answer.
insert into public.bookings (
  profile_id, offer_id, action_type, offer_title, client_name, client_email,
  client_phone, client_message, starts_at, ends_at, status, locale, client_timezone
)
values (
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000101',
  'calendar_booking',
  'Personal training — 60 min',
  'Julien Meyer',
  'julien@example.com',
  '+33600000001',
  'First session, I have a sensitive left knee.',
  date_trunc('hour', now()) + interval '7 days' + interval '10 hours',
  date_trunc('hour', now()) + interval '7 days' + interval '11 hours',
  'confirmed',
  'fr',
  'Europe/Paris'
)
on conflict do nothing;

insert into public.bookings (
  profile_id, offer_id, action_type, offer_title, client_name, client_email,
  client_message, requested_date, quantity, status, locale
)
values (
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000102',
  'direct_reservation',
  'Small group class — 4 spots',
  'Chloé Bernard',
  'chloe@example.com',
  'Coming with a friend, is that ok?',
  (now() + interval '3 days')::date,
  2,
  'pending',
  'fr'
)
on conflict do nothing;
