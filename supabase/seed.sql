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
  theme, accent_color, locale, timezone, currency, onboarding_completed_at
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
  'classic',
  '#f2542d',
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
    60, 'fixed', 'contact_request',
    '{"ask_phone": "optional"}',
    '[{"id":"f_format","type":"select","definition":{"label":"Format","options":[{"id":"in_person","label":"In person"},{"id":"online","label":"Online"},{"id":"at_home","label":"At your home"}]},"value":"in_person"},
      {"id":"f_level","type":"select","definition":{"label":"Level","options":[{"id":"all","label":"All levels"},{"id":"beginner","label":"Beginner"},{"id":"intermediate","label":"Intermediate"},{"id":"advanced","label":"Advanced"}]},"value":"all"}]',
    0, true
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000010',
    'Small group class — 4 spots',
    'Outdoor circuit training. Bring water, we bring everything else.',
    18, 'fixed', 'contact_request',
    '{"ask_phone": "optional", "message_prompt": "Which date suits you, and how many of you?"}',
    '[{"id":"f_location","type":"text","definition":{"label":"Location","multiline":false},"value":"Parc de la Tête d''Or"}]',
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

-- The offers above laid the page out (socials, contacts, one block per offer).
-- A few richer blocks under them, to show what a page can hold.
insert into public.page_blocks (profile_id, type, position, config)
select '00000000-0000-4000-8000-000000000010', b.type, (
         select coalesce(max(position), -1) from public.page_blocks
          where profile_id = '00000000-0000-4000-8000-000000000010'
       ) + b.ord, b.config::jsonb
  from (values
    (1, 'stats', '{"items": [{"value": "8 yrs", "label": "coaching"}, {"value": "300+", "label": "clients"}, {"value": "4.9/5", "label": "average rating"}]}'),
    (2, 'reviews', '{"layout": "carousel", "items": [{"name": "Julien M.", "text": "Twelve weeks in and I still look forward to every session.", "rating": 5}, {"name": "Chloé B.", "text": "Patient, precise, and the small group keeps you honest.", "rating": 5}]}'),
    (3, 'hours', '{"days": [{"closed": true, "open": "09:00", "close": "18:00"}, {"closed": false, "open": "07:00", "close": "20:00"}, {"closed": false, "open": "07:00", "close": "20:00"}, {"closed": false, "open": "07:00", "close": "20:00"}, {"closed": false, "open": "07:00", "close": "20:00"}, {"closed": false, "open": "07:00", "close": "19:00"}, {"closed": false, "open": "09:00", "close": "13:00"}], "note": null}'),
    (4, 'faq', '{"title": "Questions", "items": [{"question": "I have never trained. Is that a problem?", "answer": "Not at all: most of my clients start from zero."}, {"question": "Do I need equipment?", "answer": "No. For online sessions, a mat is enough."}]}')
  ) as b(ord, type, config)
 where exists (select 1 from public.profiles where id = '00000000-0000-4000-8000-000000000010')
   and not exists (
     select 1 from public.page_blocks
      where profile_id = '00000000-0000-4000-8000-000000000010' and type = 'stats'
   );
