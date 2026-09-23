-- =============================================================================
-- Richer client records.
--
--  * a few fixed fields a coach asks everyone (birth date, address, health);
--  * free-form fields, in the same shape as offers.custom_fields, so one editor
--    and one validator serve both — see src/lib/offers/fields.ts;
--  * tags, as a plain text array on the client. A tag is a word the coach types
--    once and reuses; the list of existing tags is read back from the clients
--    themselves, which keeps assignment to one write and avoids a join table
--    for something that never carries data of its own.
--
-- Behavioural segments (loyal, inactive, top spender) are NOT stored: they are
-- derived in src/lib/crm/segments.ts from the counters below, so a threshold
-- change never needs a backfill.
--
-- health_notes holds medical information. It stays out of client_summaries: the
-- list screen has no use for it, and the fewer places it travels the better.
-- Access is the same as the rest of the row — the owning coach only, through
-- the existing "Owners manage clients" RLS policy.
-- =============================================================================

alter table public.clients
  add column birth_date    date,
  add column address       text,
  add column health_notes  text,
  add column custom_fields jsonb  not null default '[]'::jsonb,
  add column tags          text[] not null default '{}'::text[];

alter table public.clients
  add constraint clients_custom_fields_check check (jsonb_typeof(custom_fields) = 'array'),
  add constraint clients_address_check check (char_length(address) <= 500),
  add constraint clients_health_notes_check check (char_length(health_notes) <= 5000),
  add constraint clients_tags_check check (cardinality(tags) <= 20);

comment on column public.clients.health_notes is
  'Medical notes and allergies. Sensitive: never logged, never exposed through '
  'client_summaries, readable only by the owning profile.';

comment on column public.clients.custom_fields is
  'Free-form fields, same shape as offers.custom_fields: '
  '[{ id, type, definition, value }]. Validated by src/lib/offers/fields.ts.';

comment on column public.clients.tags is
  'Coach-defined labels. The vocabulary is whatever exists across their clients.';

-- Filtering the list by tag.
create index clients_tags_idx on public.clients using gin (tags);

-- -----------------------------------------------------------------------------
-- client_summaries gains what the segments need: recent activity and what the
-- client has spent. Spend mirrors the statistics page — the offer's price on
-- confirmed bookings, which is declarative, since no payment is tracked.
-- -----------------------------------------------------------------------------
drop view public.client_summaries;

create view public.client_summaries
with (security_invoker = true) as
  select
    c.id,
    c.profile_id,
    c.name,
    c.email,
    c.phone,
    c.notes,
    c.tags,
    c.created_at,
    c.updated_at,
    count(b.id)::integer as bookings_count,
    count(b.id) filter (where b.status = 'pending')::integer as pending_count,
    count(b.id) filter (
      where b.created_at > now() - interval '180 days'
        and b.status <> 'cancelled'
    )::integer as recent_bookings_count,
    max(b.created_at) as last_booking_at,
    min(b.starts_at) filter (
      where b.starts_at > now() and b.status <> 'cancelled'
    ) as next_session_at,
    coalesce(sum(
      case
        when b.status = 'confirmed' and o.price_type in ('fixed', 'from')
        then o.price * b.quantity
        else 0
      end
    ), 0)::numeric as spent
  from public.clients c
  left join public.bookings b on b.client_id = c.id
  left join public.offers o on o.id = b.offer_id
  group by c.id;

revoke all on public.client_summaries from anon, authenticated;
grant select on public.client_summaries to authenticated;
