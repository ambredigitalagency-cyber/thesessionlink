-- =============================================================================
-- Waitlist: "tell me if this slot frees up".
--
-- A client who finds a calendar slot taken — a one-to-one slot someone else
-- booked, or a group session that is full — can leave their name for it. When
-- a booking of that slot is cancelled, the first person waiting gets an email
-- with a link that holds the place for them for a while (expires_at). If they
-- do not take it, the reminders cron moves on to the next person.
--
-- status:
--   waiting   — in the queue
--   notified  — offered the place, until expires_at
--   claimed   — took it: booking_id is the booking it became
--   expired   — did not answer in time, or the slot went before they did
--   cancelled — left the queue
--
-- Written only by the server (service role) — the public never touches this
-- table directly. The coach can read the queue of their own slots.
-- =============================================================================

create table public.waitlist_entries (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references public.profiles (id) on delete cascade,
  offer_id         uuid not null references public.offers (id) on delete cascade,
  slot_start       timestamptz not null,
  seats            integer not null default 1 check (seats between 1 and 100),
  client_name      text not null check (char_length(client_name) between 2 and 120),
  client_email     text not null check (char_length(client_email) <= 160),
  client_timezone  text check (char_length(client_timezone) <= 60),
  locale           text not null default 'en' check (locale in ('en', 'fr')),
  status           text not null default 'waiting'
                     check (status in ('waiting', 'notified', 'claimed', 'expired', 'cancelled')),
  token            uuid not null unique default gen_random_uuid(),
  notified_at      timestamptz,
  expires_at       timestamptz,
  booking_id       uuid references public.bookings (id) on delete set null,
  created_at       timestamptz not null default now()
);

-- One place in the queue per person and slot while they are still in it.
create unique index waitlist_one_per_person
  on public.waitlist_entries (offer_id, slot_start, lower(client_email))
  where status in ('waiting', 'notified');

-- The queue itself: first come, first served.
create index waitlist_queue_idx
  on public.waitlist_entries (offer_id, slot_start, created_at)
  where status = 'waiting';

create index waitlist_expiry_idx
  on public.waitlist_entries (expires_at)
  where status = 'notified';

alter table public.waitlist_entries enable row level security;

create policy "Pros read the waitlist of their slots"
  on public.waitlist_entries for select
  to authenticated
  using (
    profile_id in (select p.id from public.profiles p where p.user_id = (select auth.uid()))
  );

revoke all on public.waitlist_entries from anon, authenticated;
grant select on public.waitlist_entries to authenticated;
grant select, insert, update, delete on public.waitlist_entries to service_role;

comment on table public.waitlist_entries is
  'Clients waiting for a taken calendar slot; the first is offered it on a cancellation.';

-- -----------------------------------------------------------------------------
-- /waitlist/<token> is an app route now: no coach may take "waitlist" as a
-- slug. Same list as before, one word longer.
-- -----------------------------------------------------------------------------
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
    'mail','email','team','thesessionlink','_next','favicon.ico','robots.txt','sitemap.xml',
    'waitlist'
  ]);
$$;
