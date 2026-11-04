-- =============================================================================
-- What a page brings in: visits, clicks, contacts, and where they come from.
--
-- Counted without cookies and without personal data:
--   * no IP address, no user-agent is ever stored. visitor_hash is an HMAC
--     (server secret) of IP + user-agent + profile + day, computed by the app:
--     it changes every day and differs between pages, so nobody can be
--     followed from one day or one page to the next;
--   * country and city are the hosting platform's coarse geolocation headers,
--     read at the edge; no third-party lookup;
--   * nothing is written from the browser: the app's /api/track endpoint
--     validates and writes through record_page_event() with the service key.
--
-- Events are kept 13 months (purge_page_events, nightly) and go with the
-- account (foreign key cascade, so the 30-day purge takes them too).
-- =============================================================================

create table public.page_events (
  id            bigint generated always as identity primary key,
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  -- A deleted block keeps its past clicks in the totals, just unattributed.
  block_id      uuid references public.page_blocks (id) on delete set null,
  type          text not null check (type in ('view', 'click', 'contact')),
  contact_kind  text check (contact_kind in ('whatsapp', 'call', 'email', 'vcard', 'message', 'quote')),
  source        text not null default 'direct' check (source ~ '^[a-z0-9-]{1,30}$'),
  country       text check (country ~ '^[A-Z]{2}$'),
  city          text check (char_length(city) <= 80),
  device        text check (device in ('mobile', 'tablet', 'desktop')),
  visitor_hash  text not null check (visitor_hash ~ '^[a-f0-9]{32,64}$'),
  created_at    timestamptz not null default now(),
  check ((type = 'contact') = (contact_kind is not null))
);

create index page_events_profile_time_idx on public.page_events (profile_id, created_at desc);
create index page_events_visitor_idx on public.page_events (visitor_hash, created_at desc);
create index page_events_created_idx on public.page_events (created_at);

alter table public.page_events enable row level security;

create policy "Owners read their events"
  on public.page_events for select
  to authenticated
  using (profile_id = (select public.current_profile_id()));

create policy "Platform admins read every event"
  on public.page_events for select
  to authenticated
  using ((select public.is_platform_admin()));

revoke all on public.page_events from anon, authenticated;
grant select on public.page_events to authenticated;
grant select, insert, delete on public.page_events to service_role;

-- -----------------------------------------------------------------------------
-- Named sources: one link (and one QR) per place the page is shared.
-- -----------------------------------------------------------------------------
create table public.tracking_sources (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  slug        text not null check (slug ~ '^[a-z0-9-]{1,30}$'),
  label       text not null check (char_length(label) between 1 and 40),
  kind        text not null check (kind in (
                'instagram', 'tiktok', 'youtube', 'whatsapp', 'facebook', 'linkedin',
                'flyer', 'carte', 'vitrine', 'autre'
              )),
  created_at  timestamptz not null default now(),
  unique (profile_id, slug)
);

/** Twenty sources a page: enough for every channel, not a spreadsheet. */
create or replace function public.tracking_sources_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.profile_id::text, 2));
  if (select count(*) from public.tracking_sources s where s.profile_id = new.profile_id) >= 20 then
    raise exception 'source_limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger tracking_sources_limit
  before insert on public.tracking_sources
  for each row execute function public.tracking_sources_limit();

alter table public.tracking_sources enable row level security;

create policy "Owners manage their sources"
  on public.tracking_sources for all
  to authenticated
  using (profile_id = (select public.current_profile_id()))
  with check (profile_id = (select public.current_profile_id()));

create policy "Platform admins read every source"
  on public.tracking_sources for select
  to authenticated
  using ((select public.is_platform_admin()));

revoke all on public.tracking_sources from anon, authenticated;
grant select, insert, delete on public.tracking_sources to authenticated;
grant select, insert, update, delete on public.tracking_sources to service_role;

-- -----------------------------------------------------------------------------
-- Writing one event. Everything the endpoint passes is checked again here.
-- -----------------------------------------------------------------------------

/**
 * Records an event, or quietly refuses it (returns false):
 *   * the page must be live, and a block must be a visible block of that page;
 *   * a visit counts once per visitor and page every 30 minutes (reloads,
 *     back-and-forth, a tab left open);
 *   * a visitor gets 30 clicks and contacts an hour, and the same block twice
 *     within two seconds is one click (a double tap).
 */
create or replace function public.record_page_event(
  p_profile_id   uuid,
  p_type         text,
  p_block_id     uuid,
  p_contact_kind text,
  p_source       text,
  p_country      text,
  p_city         text,
  p_device       text,
  p_visitor_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_type not in ('view', 'click', 'contact')
     or (p_type = 'contact') <> (p_contact_kind is not null)
     or not public.is_live_profile(p_profile_id) then
    return false;
  end if;

  if p_block_id is not null and not exists (
    select 1 from public.page_blocks b
     where b.id = p_block_id and b.profile_id = p_profile_id and b.visible
  ) then
    return false;
  end if;

  -- Two beacons of one visitor arriving together (a double load, a double
  -- tap) would both pass the checks below before either is written: they are
  -- taken one at a time.
  perform pg_advisory_xact_lock(hashtextextended(p_visitor_hash || p_profile_id::text, 3));

  if p_type = 'view' then
    if exists (
      select 1 from public.page_events e
       where e.visitor_hash = p_visitor_hash
         and e.profile_id = p_profile_id
         and e.type = 'view'
         and e.created_at > now() - interval '30 minutes'
    ) then
      return false;
    end if;
  else
    if (
      select count(*) from public.page_events e
       where e.visitor_hash = p_visitor_hash
         and e.type <> 'view'
         and e.created_at > now() - interval '1 hour'
    ) >= 30 then
      return false;
    end if;
    if exists (
      select 1 from public.page_events e
       where e.visitor_hash = p_visitor_hash
         and e.profile_id = p_profile_id
         and e.type = p_type
         and e.block_id is not distinct from p_block_id
         and e.contact_kind is not distinct from p_contact_kind
         and e.created_at > now() - interval '2 seconds'
    ) then
      return false;
    end if;
  end if;

  insert into public.page_events
    (profile_id, block_id, type, contact_kind, source, country, city, device, visitor_hash)
  values
    (p_profile_id, p_block_id, p_type, p_contact_kind, coalesce(p_source, 'direct'),
     p_country, nullif(left(p_city, 80), ''), p_device, p_visitor_hash);
  return true;
end;
$$;

revoke execute on function public.record_page_event(uuid, text, uuid, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_page_event(uuid, text, uuid, text, text, text, text, text, text)
  to service_role;

-- -----------------------------------------------------------------------------
-- Reading: one call for the whole statistics page.
-- -----------------------------------------------------------------------------

/**
 * Everything the Statistics page shows for the last p_days, and the same
 * totals for the period before it. Days are counted in the coach's timezone.
 *
 * "Clicks" are every interaction (link, button, contact); "contacts" the
 * subset that reached the coach (WhatsApp, call, email, contact card, message
 * or quote request) — so visits → clicks → contacts narrows at each step.
 *
 * Only the page's owner, a platform admin or the service role may ask.
 */
create or replace function public.page_stats(p_profile_id uuid, p_days integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz     text;
  v_days   integer := case when p_days in (7, 30, 90) then p_days else 30 end;
  v_today  date;
  v_start  timestamptz;
  v_prev   timestamptz;
  v_result jsonb;
begin
  -- Each test is coalesced: a caller without a profile gets NULL from
  -- current_profile_id(), and "not (NULL or false)" is NULL, which IF reads
  -- as false — that would let them through.
  if not (
    coalesce(p_profile_id = public.current_profile_id(), false)
    or coalesce(public.is_platform_admin(), false)
    or coalesce((select auth.role()) = 'service_role', false)
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select coalesce(p.timezone, 'UTC') into v_tz from public.profiles p where p.id = p_profile_id;
  v_today := (now() at time zone v_tz)::date;
  -- Whole local days: today and the v_days - 1 before it.
  v_start := ((v_today - (v_days - 1))::timestamp at time zone v_tz);
  v_prev  := ((v_today - (2 * v_days - 1))::timestamp at time zone v_tz);

  with current_events as (
    select * from public.page_events e
     where e.profile_id = p_profile_id and e.created_at >= v_start
  ),
  previous_events as (
    select * from public.page_events e
     where e.profile_id = p_profile_id and e.created_at >= v_prev and e.created_at < v_start
  ),
  days as (
    select d::date as day
      from generate_series(v_today - (v_days - 1), v_today, interval '1 day') as d
  ),
  daily as (
    select d.day,
           count(e.*) filter (where e.type = 'view') as views,
           count(e.*) filter (where e.type <> 'view') as clicks,
           count(e.*) filter (where e.type = 'contact') as contacts
      from days d
      left join current_events e on (e.created_at at time zone v_tz)::date = d.day
     group by d.day
  )
  select jsonb_build_object(
    'days', v_days,
    'totals', (
      select jsonb_build_object(
        'views', count(*) filter (where type = 'view'),
        'clicks', count(*) filter (where type <> 'view'),
        'contacts', count(*) filter (where type = 'contact')
      ) from current_events
    ),
    -- The path in people rather than events, so each step is a share of the
    -- one before (a visitor who clicks three links is one person who clicked).
    'funnel', (
      select jsonb_build_object(
        'visitors', count(distinct visitor_hash) filter (where type = 'view'),
        'clickers', count(distinct visitor_hash) filter (where type <> 'view'),
        'contacters', count(distinct visitor_hash) filter (where type = 'contact')
      ) from current_events
    ),
    'previous', (
      select jsonb_build_object(
        'views', count(*) filter (where type = 'view'),
        'clicks', count(*) filter (where type <> 'view'),
        'contacts', count(*) filter (where type = 'contact')
      ) from previous_events
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', day, 'views', views, 'clicks', clicks, 'contacts', contacts
      ) order by day), '[]'::jsonb) from daily
    ),
    'blocks', (
      select coalesce(jsonb_agg(row_to_json(b)::jsonb order by b.clicks desc), '[]'::jsonb)
        from (
          select e.block_id as id, pb.type, pb.config, o.title as offer_title,
                 count(*) as clicks,
                 count(*) filter (where e.type = 'contact') as contacts
            from current_events e
            join public.page_blocks pb on pb.id = e.block_id
            left join public.offers o on o.id = pb.offer_id
           where e.type <> 'view'
           group by e.block_id, pb.type, pb.config, o.title
           order by count(*) desc
           limit 8
        ) b
    ),
    'sources', (
      select coalesce(jsonb_agg(row_to_json(s)::jsonb order by s.views desc, s.contacts desc), '[]'::jsonb)
        from (
          select source,
                 count(*) filter (where type = 'view') as views,
                 count(*) filter (where type = 'contact') as contacts
            from current_events group by source
        ) s
    ),
    'countries', (
      select coalesce(jsonb_agg(row_to_json(c)::jsonb order by c.views desc), '[]'::jsonb)
        from (
          select country, count(*) as views from current_events
           where type = 'view' and country is not null group by country order by count(*) desc limit 8
        ) c
    ),
    'cities', (
      select coalesce(jsonb_agg(row_to_json(c)::jsonb order by c.views desc), '[]'::jsonb)
        from (
          select city, country, count(*) as views from current_events
           where type = 'view' and city is not null group by city, country order by count(*) desc limit 8
        ) c
    ),
    'devices', (
      select coalesce(jsonb_agg(row_to_json(d)::jsonb order by d.views desc), '[]'::jsonb)
        from (
          select device, count(*) as views from current_events
           where type = 'view' and device is not null group by device
        ) d
    ),
    'contact_kinds', (
      select coalesce(jsonb_agg(row_to_json(k)::jsonb order by k.contacts desc), '[]'::jsonb)
        from (
          select contact_kind as kind, count(*) as contacts from current_events
           where type = 'contact' group by contact_kind
        ) k
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.page_stats(uuid, integer) from public, anon;
grant execute on function public.page_stats(uuid, integer) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Retention: 13 months.
-- -----------------------------------------------------------------------------
create or replace function public.purge_page_events(p_months integer default 13)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.page_events where created_at < now() - make_interval(months => p_months);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.purge_page_events(integer) from public, anon, authenticated;

select cron.schedule('thesessionlink-purge-page-events', '45 3 * * *', 'select public.purge_page_events()');

-- -----------------------------------------------------------------------------
-- The WhatsApp number is public only where the page needs it.
--
-- WhatsApp offers without their own number fall back to the profile's, so the
-- public view must carry it — but only for a page that has a visible WhatsApp
-- block or an active WhatsApp offer. Any other page keeps it private.
-- -----------------------------------------------------------------------------
create or replace function public.exposes_whatsapp(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.page_blocks b
     where b.profile_id = p_profile_id and b.type = 'whatsapp' and b.visible
  ) or exists (
    select 1 from public.offers o
     where o.profile_id = p_profile_id and o.action_type = 'whatsapp_direct' and o.is_active
  );
$$;

revoke execute on function public.exposes_whatsapp(uuid) from public;
grant execute on function public.exposes_whatsapp(uuid) to anon, authenticated, service_role;

create or replace view public.public_profiles
with (security_invoker = false) as
  select
    id, slug, display_name, headline, bio, avatar_url, category_id, location,
    theme, accent_color, locale, timezone, currency,
    case when public.exposes_whatsapp(p.id) then whatsapp_number end as whatsapp_number,
    custom_fields,
    onboarding_completed_at is not null as published
  from public.profiles p
  where suspended_at is null
    and deleted_at is null;

revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- The 30-day purge takes the account's files too.
--
-- Storage objects can only be removed through the Storage API, so the app
-- does it: pg_cron pings /api/cron/purge-accounts at 03:15, which deletes each
-- due account's files and then the account. The SQL purge stays as a safety
-- net two days later, for a project where the ping is not configured.
-- -----------------------------------------------------------------------------
create or replace function public.dispatch_account_purge()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_app_url text;
  v_secret  text;
begin
  select decrypted_secret into v_app_url from vault.decrypted_secrets where name = 'app_url';
  select decrypted_secret into v_secret  from vault.decrypted_secrets where name = 'cron_secret';

  if v_app_url is null or v_secret is null then
    return; -- not configured yet
  end if;

  perform net.http_post(
    url := rtrim(v_app_url, '/') || '/api/cron/purge-accounts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := '{}'::jsonb
  );
end;
$$;

revoke execute on function public.dispatch_account_purge() from public, anon, authenticated;

select cron.schedule('thesessionlink-account-purge', '15 3 * * *', 'select public.dispatch_account_purge()');

select cron.unschedule(jobid) from cron.job where jobname = 'thesessionlink-purge-deleted-accounts';
select cron.schedule(
  'thesessionlink-purge-deleted-accounts',
  '30 3 * * *',
  'select public.purge_deleted_accounts(32)'
);
