-- =============================================================================
-- TheSessionLink — core schema
-- Generic, niche-agnostic data model. Business-specific data lives in JSONB
-- (activity_categories.config, offers.custom_fields, offers.action_config).
-- =============================================================================

create extension if not exists btree_gist with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.action_type as enum (
  'calendar_booking',   -- book a time slot
  'direct_reservation', -- reserve without a precise time (item, limited seats)
  'contact_request',    -- send a message / ask for info
  'whatsapp_direct',    -- open a WhatsApp conversation
  'quote_request'       -- quote / appointment to be defined, pro calls back
);

create type public.booking_status as enum ('pending', 'confirmed', 'cancelled');

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Slugs that would collide with app routes.
create or replace function public.is_reserved_slug(p_slug text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(p_slug) = any (array[
    'about','account','admin','api','app','auth','billing','blog','booking','bookings',
    'contact','dashboard','docs','explore','faq','features','for','help','home','legal',
    'login','logout','new','onboarding','pricing','privacy','profile','register','root',
    'settings','signin','signout','signup','static','status','support','terms','www',
    'mail','email','team','thesessionlink','_next','favicon.ico','robots.txt','sitemap.xml'
  ]);
$$;

-- -----------------------------------------------------------------------------
-- activity_categories — extensible without migration (insert rows)
-- config = { default_action_type, suggested_fields: [...] }
-- -----------------------------------------------------------------------------
create table public.activity_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name        jsonb not null check (jsonb_typeof(name) = 'object'),
  description jsonb not null default '{}'::jsonb check (jsonb_typeof(description) = 'object'),
  icon        text,
  config      jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  position    integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create table public.profiles (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null unique references auth.users (id) on delete cascade,
  display_name            text not null check (char_length(display_name) between 1 and 80),
  slug                    text not null unique
                            check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$')
                            check (not public.is_reserved_slug(slug)),
  headline                text check (char_length(headline) <= 120),
  bio                     text check (char_length(bio) <= 1200),
  avatar_url              text,
  category_id             uuid references public.activity_categories (id) on delete set null,
  social_links            jsonb not null default '{}'::jsonb check (jsonb_typeof(social_links) = 'object'),
  whatsapp_number         text check (whatsapp_number ~ '^\+?[0-9]{6,20}$'),
  contact_email           text check (contact_email = lower(contact_email)),
  phone_number            text check (char_length(phone_number) <= 30),
  location                text check (char_length(location) <= 120),
  calendar_visible        boolean not null default true,
  custom_closed_message   text check (char_length(custom_closed_message) <= 500),
  -- Reserved for future payments. Never required by the booking flow.
  payment_method          text,
  contact_channels        jsonb not null default '{"email": true, "phone": false, "whatsapp": true}'::jsonb
                            check (jsonb_typeof(contact_channels) = 'object'),
  theme                   jsonb not null default '{}'::jsonb check (jsonb_typeof(theme) = 'object'),
  locale                  text not null default 'en' check (locale in ('en', 'fr')),
  timezone                text not null default 'Europe/Paris',
  currency                text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  reminder_hours_before   integer not null default 24 check (reminder_hours_before between 1 and 168),
  notify_new_bookings     boolean not null default true,
  onboarding_completed_at timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index profiles_category_idx on public.profiles (category_id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- offers
-- custom_fields = [{ id, key, label, type, value, unit?, source }]
-- action_config = settings specific to action_type (duration, capacity, ...)
-- -----------------------------------------------------------------------------
create table public.offers (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles (id) on delete cascade,
  title           text not null check (char_length(title) between 1 and 120),
  description     text check (char_length(description) <= 5000),
  price           numeric(10, 2) check (price >= 0),
  price_type      text not null default 'fixed' check (price_type in ('fixed', 'from', 'free', 'on_request')),
  main_photo_url  text,
  action_type     public.action_type not null,
  action_config   jsonb not null default '{}'::jsonb check (jsonb_typeof(action_config) = 'object'),
  custom_fields   jsonb not null default '[]'::jsonb check (jsonb_typeof(custom_fields) = 'array'),
  position        integer not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index offers_profile_position_idx on public.offers (profile_id, position);

create trigger offers_set_updated_at
  before update on public.offers
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- availabilities — weekly recurring windows for calendar_booking offers.
-- offer_id null  => default schedule for every calendar_booking offer
-- offer_id set   => schedule dedicated to that offer (overrides the default)
-- weekday: 0 = Sunday … 6 = Saturday, times are in profiles.timezone
-- -----------------------------------------------------------------------------
create table public.availabilities (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  offer_id    uuid references public.offers (id) on delete cascade,
  weekday     smallint not null check (weekday between 0 and 6),
  start_time  time not null,
  end_time    time not null,
  created_at  timestamptz not null default now(),
  check (end_time > start_time)
);

create index availabilities_profile_idx on public.availabilities (profile_id, offer_id);

create or replace function public.availabilities_check_offer()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.offer_id is not null and not exists (
    select 1 from public.offers o
    where o.id = new.offer_id
      and o.profile_id = new.profile_id
      and o.action_type = 'calendar_booking'
  ) then
    raise exception 'availability_offer_mismatch'
      using hint = 'Availabilities can only be linked to calendar_booking offers of the same profile.';
  end if;
  return new;
end;
$$;

create trigger availabilities_check_offer
  before insert or update on public.availabilities
  for each row execute function public.availabilities_check_offer();

-- Full days off (holidays, sick days…). Blocks every calendar_booking offer.
create table public.time_off (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  starts_on   date not null,
  ends_on     date not null,
  label       text check (char_length(label) <= 80),
  created_at  timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create index time_off_profile_idx on public.time_off (profile_id, starts_on);

-- -----------------------------------------------------------------------------
-- clients — one row per (profile, email). Mini CRM with editable notes.
-- -----------------------------------------------------------------------------
create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  email       text not null check (email = lower(email)),
  phone       text check (char_length(phone) <= 30),
  notes       text check (char_length(notes) <= 10000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (profile_id, email)
);

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- bookings — every reservation / request received
-- -----------------------------------------------------------------------------
create table public.bookings (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references public.profiles (id) on delete cascade,
  offer_id         uuid references public.offers (id) on delete set null,
  client_id        uuid references public.clients (id) on delete set null,
  action_type      public.action_type not null,
  offer_title      text not null,
  client_name      text not null check (char_length(client_name) between 1 and 120),
  client_email     text not null check (client_email = lower(client_email)),
  client_phone     text check (char_length(client_phone) <= 30),
  client_message   text check (char_length(client_message) <= 3000),
  client_timezone  text,
  starts_at        timestamptz,
  ends_at          timestamptz,
  requested_date   date,
  quantity         integer not null default 1 check (quantity between 1 and 100),
  details          jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  status           public.booking_status not null default 'pending',
  internal_notes   text check (char_length(internal_notes) <= 10000),
  locale           text not null default 'en' check (locale in ('en', 'fr')),
  manage_token     uuid not null unique default gen_random_uuid(),
  reminder_sent_at timestamptz,
  cancelled_at     timestamptz,
  cancelled_by     text check (cancelled_by in ('client', 'pro')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check ((starts_at is null) = (ends_at is null)),
  check (ends_at > starts_at),
  check (action_type <> 'calendar_booking' or starts_at is not null),
  -- A pro can never be double-booked, whatever the insert path.
  constraint bookings_no_overlap exclude using gist (
    profile_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (starts_at is not null and status <> 'cancelled')
);

create index bookings_profile_created_idx on public.bookings (profile_id, created_at desc);
create index bookings_profile_starts_idx on public.bookings (profile_id, starts_at) where starts_at is not null;
create index bookings_client_idx on public.bookings (client_id);
create index bookings_offer_idx on public.bookings (offer_id);
create index bookings_reminders_idx on public.bookings (starts_at)
  where action_type = 'calendar_booking' and status = 'confirmed' and reminder_sent_at is null;

create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- Attach (or create) the CRM client row for every new booking.
create or replace function public.bookings_attach_client()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_id uuid;
begin
  new.client_email := lower(trim(new.client_email));

  insert into public.clients as c (profile_id, name, email, phone)
  values (new.profile_id, new.client_name, new.client_email, nullif(new.client_phone, ''))
  on conflict (profile_id, email) do update
    set name = excluded.name,
        phone = coalesce(excluded.phone, c.phone),
        updated_at = now()
  returning c.id into v_client_id;

  new.client_id := v_client_id;
  return new;
end;
$$;

create trigger bookings_attach_client
  before insert on public.bookings
  for each row execute function public.bookings_attach_client();

-- Capacity for direct_reservation offers (action_config.capacity),
-- counted per requested_date (null date = one global pool).
create or replace function public.bookings_enforce_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_capacity integer;
  v_used     integer;
begin
  if new.action_type <> 'direct_reservation' or new.offer_id is null or new.status = 'cancelled' then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.status <> 'cancelled'
     and new.quantity <= old.quantity
     and new.requested_date is not distinct from old.requested_date then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.offer_id::text, 0));

  select nullif(o.action_config ->> 'capacity', '')::integer
    into v_capacity
    from public.offers o
   where o.id = new.offer_id;

  if v_capacity is null then
    return new;
  end if;

  select coalesce(sum(b.quantity), 0)
    into v_used
    from public.bookings b
   where b.offer_id = new.offer_id
     and b.id <> new.id
     and b.status <> 'cancelled'
     and b.requested_date is not distinct from new.requested_date;

  if v_used + new.quantity > v_capacity then
    raise exception 'capacity_exceeded' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger bookings_enforce_capacity
  before insert or update of status, quantity, requested_date on public.bookings
  for each row execute function public.bookings_enforce_capacity();

-- First offer created => onboarding is complete, profile goes public.
create or replace function public.offers_complete_onboarding()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set onboarding_completed_at = now()
   where id = new.profile_id
     and onboarding_completed_at is null;
  return new;
end;
$$;

create trigger offers_complete_onboarding
  after insert on public.offers
  for each row execute function public.offers_complete_onboarding();

-- Sensible default weekly schedule (Mon–Fri, 9:00–17:00) for new profiles.
create or replace function public.profiles_default_availability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.availabilities (profile_id, weekday, start_time, end_time)
  select new.id, d, time '09:00', time '17:00'
  from generate_series(1, 5) as d;
  return new;
end;
$$;

create trigger profiles_default_availability
  after insert on public.profiles
  for each row execute function public.profiles_default_availability();

-- -----------------------------------------------------------------------------
-- Views
-- -----------------------------------------------------------------------------

-- Public-facing profile. Masks contact channels the pro has switched off and
-- hides private settings. Owned by postgres on purpose (bypasses RLS on
-- profiles, which is owner-only); only SELECT is granted.
create view public.public_profiles as
select
  p.id,
  p.slug,
  p.display_name,
  p.headline,
  p.bio,
  p.avatar_url,
  p.category_id,
  p.social_links,
  p.location,
  p.calendar_visible,
  p.custom_closed_message,
  p.theme,
  p.locale,
  p.timezone,
  p.currency,
  case when coalesce((p.contact_channels ->> 'whatsapp')::boolean, false) then p.whatsapp_number end as whatsapp_number,
  case when coalesce((p.contact_channels ->> 'email')::boolean, false) then p.contact_email end as contact_email,
  case when coalesce((p.contact_channels ->> 'phone')::boolean, false) then p.phone_number end as phone_number
from public.profiles p
where p.onboarding_completed_at is not null;

-- CRM overview, respects RLS of the caller.
create view public.client_summaries
with (security_invoker = true) as
select
  c.id,
  c.profile_id,
  c.name,
  c.email,
  c.phone,
  c.notes,
  c.created_at,
  c.updated_at,
  count(b.id)::integer as bookings_count,
  count(b.id) filter (where b.status = 'pending')::integer as pending_count,
  max(b.created_at) as last_booking_at,
  min(b.starts_at) filter (where b.starts_at > now() and b.status <> 'cancelled') as next_session_at
from public.clients c
left join public.bookings b on b.client_id = c.id
group by c.id;

-- -----------------------------------------------------------------------------
-- RPCs
-- -----------------------------------------------------------------------------
create or replace function public.is_slug_available(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'
    and not public.is_reserved_slug(p_slug)
    and not exists (
      select 1 from public.profiles p
      where p.slug = p_slug
        and p.user_id is distinct from auth.uid()
    );
$$;

-- Atomically claims calendar bookings whose reminder is due.
create or replace function public.claim_due_reminders(p_limit integer default 50)
returns setof public.bookings
language sql
security definer
set search_path = ''
as $$
  update public.bookings b
     set reminder_sent_at = now()
   where b.id in (
     select b2.id
       from public.bookings b2
       join public.profiles p on p.id = b2.profile_id
      where b2.action_type = 'calendar_booking'
        and b2.status = 'confirmed'
        and b2.reminder_sent_at is null
        and b2.starts_at > now() + interval '15 minutes'
        and b2.starts_at <= now() + make_interval(hours => p.reminder_hours_before)
        and b2.created_at <= now() - interval '1 hour'
      order by b2.starts_at
      limit p_limit
      for update of b2 skip locked
   )
  returning b.*;
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.activity_categories enable row level security;
alter table public.profiles            enable row level security;
alter table public.offers              enable row level security;
alter table public.availabilities      enable row level security;
alter table public.time_off            enable row level security;
alter table public.clients             enable row level security;
alter table public.bookings            enable row level security;

-- Current user's profile id (security definer avoids recursive RLS lookups).
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.profiles p where p.user_id = auth.uid();
$$;

create or replace function public.is_public_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_profile_id and p.onboarding_completed_at is not null
  );
$$;

-- activity_categories: readable by everyone, managed via service role only.
create policy "Categories are public"
  on public.activity_categories for select
  to anon, authenticated
  using (is_active);

-- profiles: owner only (public reads go through public_profiles).
create policy "Owners read their profile"
  on public.profiles for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users create their profile"
  on public.profiles for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Owners update their profile"
  on public.profiles for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Owners delete their profile"
  on public.profiles for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- offers: public when active on a public profile, full access for owner.
create policy "Active offers are public"
  on public.offers for select
  to anon, authenticated
  using (is_active and public.is_public_profile(profile_id));

create policy "Owners read their offers"
  on public.offers for select
  to authenticated
  using (profile_id = (select public.current_profile_id()));

create policy "Owners create offers"
  on public.offers for insert
  to authenticated
  with check (profile_id = (select public.current_profile_id()));

create policy "Owners update offers"
  on public.offers for update
  to authenticated
  using (profile_id = (select public.current_profile_id()))
  with check (profile_id = (select public.current_profile_id()));

create policy "Owners delete offers"
  on public.offers for delete
  to authenticated
  using (profile_id = (select public.current_profile_id()));

-- availabilities, time_off, clients: owner only.
create policy "Owners manage availabilities"
  on public.availabilities for all
  to authenticated
  using (profile_id = (select public.current_profile_id()))
  with check (profile_id = (select public.current_profile_id()));

create policy "Owners manage time off"
  on public.time_off for all
  to authenticated
  using (profile_id = (select public.current_profile_id()))
  with check (profile_id = (select public.current_profile_id()));

create policy "Owners manage clients"
  on public.clients for all
  to authenticated
  using (profile_id = (select public.current_profile_id()))
  with check (profile_id = (select public.current_profile_id()));

-- bookings: created server-side (service role) from the public page;
-- owners read and update (status, internal notes), never insert directly.
create policy "Owners read bookings"
  on public.bookings for select
  to authenticated
  using (profile_id = (select public.current_profile_id()));

create policy "Owners update bookings"
  on public.bookings for update
  to authenticated
  using (profile_id = (select public.current_profile_id()))
  with check (profile_id = (select public.current_profile_id()));

create policy "Owners delete bookings"
  on public.bookings for delete
  to authenticated
  using (profile_id = (select public.current_profile_id()));

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------
-- Views are owned by postgres: never allow writes through them.
revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

revoke all on public.client_summaries from anon, authenticated;
grant select on public.client_summaries to authenticated;

-- Anonymous visitors never touch private tables directly.
revoke all on public.profiles, public.availabilities, public.time_off, public.clients, public.bookings from anon;
revoke insert, update, delete on public.offers, public.activity_categories from anon;
revoke insert, update, delete on public.activity_categories from authenticated;
revoke insert on public.bookings from authenticated;

revoke execute on function public.claim_due_reminders(integer) from public, anon, authenticated;
grant execute on function public.claim_due_reminders(integer) to service_role;

revoke execute on function public.is_slug_available(text) from public, anon;
grant execute on function public.is_slug_available(text) to authenticated;
