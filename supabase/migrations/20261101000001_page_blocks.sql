-- =============================================================================
-- The page is made of blocks.
--
-- A coach's public page used to be one fixed layout: header, social icons,
-- contact buttons, then the offers. It is now an ordered list of blocks the
-- coach composes — links, a row of socials, a WhatsApp button, a service, a
-- video, opening hours… — each with its own small config.
--
--   * page_blocks — one row per block. `config` holds what the block shows; the
--     app validates its shape per type (src/lib/page/blocks.ts) and the
--     database only insists on an object of a reasonable size. A "service"
--     block points at an offer through a real foreign key, so deleting the
--     offer takes the block with it. `id` is stable: it is what click
--     tracking will count against.
--   * profiles.theme becomes one of eight theme slugs, and accent_color the
--     coach's own colour (hex). The old jsonb theme kept a preset name; it is
--     turned into its colour so every page keeps its accent.
--   * build_default_page() turns a profile into blocks: its socials, its
--     contact buttons (only the channels it showed), and one block per offer.
--     Every existing profile goes through it below, so no public page loses
--     anything. New profiles go through it when their first offer is created;
--     after that, each new offer adds its own block.
--
-- Public reads: a block is readable when it is visible and its profile is
-- published (first offer created), not suspended and not deleted.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Profiles: theme and accent.
-- -----------------------------------------------------------------------------
drop view if exists public.public_profiles;

alter table public.profiles
  add column accent_color text,
  add column page_initialized_at timestamptz;

update public.profiles
   set accent_color = case theme ->> 'accent'
         when 'ink' then '#0c0c0d'
         when 'forest' then '#1f7a55'
         when 'ocean' then '#2563eb'
         when 'violet' then '#7c3aed'
         when 'amber' then '#b45309'
         else '#f2542d'
       end;

alter table public.profiles
  alter column accent_color set default '#f2542d',
  alter column accent_color set not null,
  add constraint profiles_accent_color_check check (accent_color ~ '^#[0-9a-f]{6}$');

alter table public.profiles drop constraint if exists profiles_theme_check;
alter table public.profiles alter column theme drop default;
alter table public.profiles alter column theme type text using 'classic';
alter table public.profiles
  alter column theme set default 'classic',
  alter column theme set not null,
  add constraint profiles_theme_check check (theme in (
    'classic', 'minimal', 'pastel', 'editorial', 'sunset', 'midnight', 'noir', 'bold'
  ));

comment on column public.profiles.theme is
  'Public page theme, one of src/lib/page/themes.ts.';
comment on column public.profiles.accent_color is
  'Coach''s accent, lowercase #rrggbb. Readable variants are derived by the app.';
comment on column public.profiles.page_initialized_at is
  'Set once build_default_page() has laid out the page; it never runs again after.';

-- -----------------------------------------------------------------------------
-- page_blocks
-- -----------------------------------------------------------------------------
create table public.page_blocks (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  type        text not null check (type in (
                'link', 'socials', 'whatsapp', 'call', 'email', 'service', 'youtube',
                'text', 'divider', 'faq', 'reviews', 'hours', 'gallery', 'pricing',
                'address', 'file', 'announcement', 'stats', 'vcard'
              )),
  position    integer not null default 0,
  config      jsonb not null default '{}'::jsonb
                check (jsonb_typeof(config) = 'object' and pg_column_size(config) <= 16384),
  offer_id    uuid references public.offers (id) on delete cascade,
  visible     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check ((type = 'service') = (offer_id is not null))
);

create index page_blocks_profile_position_idx on public.page_blocks (profile_id, position);
create index page_blocks_offer_idx on public.page_blocks (offer_id) where offer_id is not null;

create trigger page_blocks_set_updated_at
  before update on public.page_blocks
  for each row execute function public.set_updated_at();

/** 30 blocks a page, and a service block only for an offer of the same profile. */
create or replace function public.page_blocks_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtextextended(new.profile_id::text, 1));
    if (select count(*) from public.page_blocks b where b.profile_id = new.profile_id) >= 30 then
      raise exception 'block_limit' using errcode = 'P0001';
    end if;
  end if;

  if new.offer_id is not null and not exists (
    select 1 from public.offers o where o.id = new.offer_id and o.profile_id = new.profile_id
  ) then
    raise exception 'block_offer_mismatch' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger page_blocks_guard
  before insert or update of profile_id, offer_id on public.page_blocks
  for each row execute function public.page_blocks_guard();

/** Published, and neither suspended nor on its way out. */
create or replace function public.is_live_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
     where p.id = p_profile_id
       and p.onboarding_completed_at is not null
       and p.suspended_at is null
       and p.deleted_at is null
  );
$$;

revoke execute on function public.is_live_profile(uuid) from public;
grant execute on function public.is_live_profile(uuid) to anon, authenticated, service_role;

alter table public.page_blocks enable row level security;

create policy "Visible blocks of live pages are public"
  on public.page_blocks for select
  to anon, authenticated
  using (visible and public.is_live_profile(profile_id));

create policy "Owners read their blocks"
  on public.page_blocks for select
  to authenticated
  using (profile_id = (select public.current_profile_id()));

create policy "Owners create blocks"
  on public.page_blocks for insert
  to authenticated
  with check (profile_id = (select public.current_profile_id()));

create policy "Owners update blocks"
  on public.page_blocks for update
  to authenticated
  using (profile_id = (select public.current_profile_id()))
  with check (profile_id = (select public.current_profile_id()));

create policy "Owners delete blocks"
  on public.page_blocks for delete
  to authenticated
  using (profile_id = (select public.current_profile_id()));

create policy "Platform admins read every block"
  on public.page_blocks for select
  to authenticated
  using ((select public.is_platform_admin()));

revoke all on public.page_blocks from anon, authenticated;
grant select on public.page_blocks to anon;
grant select, insert, update, delete on public.page_blocks to authenticated;
grant select, insert, update, delete on public.page_blocks to service_role;

-- -----------------------------------------------------------------------------
-- From a profile to its first page.
-- -----------------------------------------------------------------------------

/** A social handle or URL as a full URL (same rules as socialUrl() in the app). */
create or replace function public.social_url(p_key text, p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when btrim(p_value) ~* '^https?://' then btrim(p_value)
    else case p_key
      when 'instagram' then 'https://instagram.com/'
      when 'tiktok' then 'https://tiktok.com/@'
      when 'linkedin' then 'https://linkedin.com/in/'
      when 'facebook' then 'https://facebook.com/'
      when 'youtube' then 'https://youtube.com/@'
      when 'x' then 'https://x.com/'
      else 'https://'
    end || regexp_replace(btrim(p_value), '^@', '')
  end;
$$;

/**
 * Lays out the page of a profile that has none yet: socials, the contact
 * buttons it showed, then one service block per offer. Runs once per profile
 * (page_initialized_at); returns the number of blocks created.
 */
create or replace function public.build_default_page(p_profile_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile  public.profiles;
  v_links    jsonb;
  v_channels jsonb;
  v_position integer := 0;
  v_offer    record;
begin
  select * into v_profile from public.profiles where id = p_profile_id for update;
  if not found or v_profile.page_initialized_at is not null then
    return 0;
  end if;

  v_channels := coalesce(v_profile.contact_channels, '{}'::jsonb);

  select coalesce(jsonb_agg(public.social_url(k.key, v_profile.social_links ->> k.key) order by k.ord), '[]'::jsonb)
    into v_links
    from unnest(array['instagram', 'tiktok', 'youtube', 'linkedin', 'facebook', 'x', 'website'])
         with ordinality as k(key, ord)
   where coalesce(btrim(v_profile.social_links ->> k.key), '') <> '';

  if jsonb_array_length(v_links) > 0 then
    insert into public.page_blocks (profile_id, type, position, config)
    values (p_profile_id, 'socials', v_position, jsonb_build_object('links', v_links));
    v_position := v_position + 1;
  end if;

  if v_profile.whatsapp_number is not null
     and coalesce((v_channels ->> 'whatsapp')::boolean, false) then
    insert into public.page_blocks (profile_id, type, position, config)
    values (p_profile_id, 'whatsapp', v_position,
            jsonb_build_object('number', v_profile.whatsapp_number, 'message', null, 'label', null));
    v_position := v_position + 1;
  end if;

  if v_profile.phone_number is not null
     and coalesce((v_channels ->> 'phone')::boolean, false) then
    insert into public.page_blocks (profile_id, type, position, config)
    values (p_profile_id, 'call', v_position,
            jsonb_build_object('number', v_profile.phone_number, 'label', null));
    v_position := v_position + 1;
  end if;

  if v_profile.contact_email is not null
     and coalesce((v_channels ->> 'email')::boolean, false) then
    insert into public.page_blocks (profile_id, type, position, config)
    values (p_profile_id, 'email', v_position,
            jsonb_build_object('email', v_profile.contact_email, 'label', null));
    v_position := v_position + 1;
  end if;

  for v_offer in
    select o.id from public.offers o where o.profile_id = p_profile_id order by o.position, o.created_at
  loop
    exit when v_position >= 30;
    insert into public.page_blocks (profile_id, type, position, offer_id)
    values (p_profile_id, 'service', v_position, v_offer.id);
    v_position := v_position + 1;
  end loop;

  update public.profiles set page_initialized_at = now() where id = p_profile_id;
  return v_position;
end;
$$;

revoke execute on function public.build_default_page(uuid) from public, anon, authenticated;
grant execute on function public.build_default_page(uuid) to service_role;

/**
 * A new offer lands on the page. The first one lays the whole page out;
 * later ones are appended as a service block, while there is room.
 */
create or replace function public.offers_add_page_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_initialized timestamptz;
  v_next        integer;
begin
  select p.page_initialized_at into v_initialized from public.profiles p where p.id = new.profile_id;

  if v_initialized is null then
    perform public.build_default_page(new.profile_id);
    return new;
  end if;

  -- Several offers inserted in one statement: the first row's trigger already
  -- laid out the page with all of them (row triggers run after the statement).
  if exists (select 1 from public.page_blocks b where b.offer_id = new.id) then
    return new;
  end if;

  if (select count(*) from public.page_blocks b where b.profile_id = new.profile_id) >= 30 then
    return new;
  end if;

  select coalesce(max(b.position) + 1, 0) into v_next
    from public.page_blocks b where b.profile_id = new.profile_id;

  insert into public.page_blocks (profile_id, type, position, offer_id)
  values (new.profile_id, 'service', v_next, new.id);
  return new;
end;
$$;

create trigger offers_add_page_block
  after insert on public.offers
  for each row execute function public.offers_add_page_block();

-- Every existing profile, once.
select public.build_default_page(p.id) from public.profiles p;

-- -----------------------------------------------------------------------------
-- The public view: the theme and accent, a published flag, and only the
-- contact detail the page itself still reads (the WhatsApp offers fall back
-- to the profile's number). Email and phone now live in blocks.
-- -----------------------------------------------------------------------------
create view public.public_profiles
with (security_invoker = false) as
  select
    id, slug, display_name, headline, bio, avatar_url, category_id, location,
    theme, accent_color, locale, timezone, currency, whatsapp_number, custom_fields,
    onboarding_completed_at is not null as published
  from public.profiles p
  where suspended_at is null
    and deleted_at is null;

revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Files: the media bucket also takes PDFs (page/file blocks), same 5 MB cap.
-- -----------------------------------------------------------------------------
update storage.buckets
   set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf']
 where id = 'media';

-- -----------------------------------------------------------------------------
-- A category for content creators.
-- -----------------------------------------------------------------------------
insert into public.activity_categories (slug, name, description, icon, position, config)
values (
  'content-creator',
  '{"en": "Content creator", "fr": "Créateur de contenu"}',
  '{"en": "YouTube, Instagram, TikTok, podcasts", "fr": "YouTube, Instagram, TikTok, podcasts"}',
  'clapperboard',
  125,
  '{
    "default_action_type": "contact_request",
    "suggested_fields": [
      {"key": "platforms", "type": "text", "label": {"en": "Platforms", "fr": "Plateformes"}},
      {"key": "audience", "type": "text", "label": {"en": "Audience", "fr": "Audience"}},
      {"key": "formats", "type": "text", "label": {"en": "Formats", "fr": "Formats"}}
    ],
    "templates": {
      "contact_request": [
        {"key": "formats", "type": "text", "label": {"en": "Formats", "fr": "Formats"}, "placeholder": {"en": "Reel, story, dedicated video", "fr": "Reel, story, vidéo dédiée"}},
        {"key": "audience", "type": "text", "label": {"en": "Audience", "fr": "Audience"}, "placeholder": {"en": "45k followers, 25–34", "fr": "45 k abonnés, 25–34 ans"}}
      ],
      "whatsapp_direct": [
        {"key": "topics", "type": "text", "label": {"en": "Topics", "fr": "Thèmes"}},
        {"key": "response_time", "type": "text", "label": {"en": "Usual response time", "fr": "Délai de réponse habituel"}}
      ],
      "quote_request": [
        {"key": "formats", "type": "text", "label": {"en": "Formats", "fr": "Formats"}},
        {"key": "deliverables", "type": "textarea", "label": {"en": "What’s included", "fr": "Ce qui est inclus"}}
      ]
    }
  }'
)
on conflict (slug) do nothing;
