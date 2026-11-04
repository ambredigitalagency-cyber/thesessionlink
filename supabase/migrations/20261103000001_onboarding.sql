-- =============================================================================
-- The new sign-up: a live link in under a minute.
--
-- After the sign-in, four screens: the trade, the name and link, the main
-- button, the look. Then a final screen. Photo, bio, socials and contact
-- details are no longer asked for — they live in "Ma page".
--
-- 1. page_blocks.pending — the blocks a trade usually needs, added at sign-up
--    "to complete". The coach sees them, in the editor and in their preview,
--    marked as such; visitors never do until the coach fills one in and
--    validates it. Nothing is invented on a public page: no review, figure,
--    price, address or opening hour the coach did not write.
-- 2. onboarding_progress — the step each account has reached, so someone who
--    leaves resumes where they stopped, and the console can show where
--    sign-ups are lost. Written only by the functions below, which check the
--    facts (a profile exists, the page is published) rather than believe what
--    the browser says.
-- 3. onboarding_publish() — the main button, its blocks, the suggested blocks
--    and the publication of the page, in one transaction.
-- 4. available_slugs() — which of a few candidate links are free, for the
--    alternatives offered when the one typed is taken.
-- 5. The console's "unfinished sign-ups" now also lists profiles that stopped
--    before the end, with the step reached.
-- 6. admin_active_sessions / admin_unfinished_signups: the access check is
--    NULL-safe (same bug as page_stats in 20261102000001).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Blocks to complete
-- -----------------------------------------------------------------------------

alter table public.page_blocks
  add column pending   boolean not null default false,
  add column suggested boolean not null default false;

comment on column public.page_blocks.pending is
  'Still to complete: shown to the coach as such, never to visitors until validated.';
comment on column public.page_blocks.suggested is
  'Added by the sign-up as a suggestion for the trade (the "to complete" list counts these).';

drop policy "Visible blocks of live pages are public" on public.page_blocks;

create policy "Visible blocks of live pages are public"
  on public.page_blocks for select
  to anon, authenticated
  using (visible and not pending and public.is_live_profile(profile_id));

-- A WhatsApp block still to complete does not make the number public.
create or replace function public.exposes_whatsapp(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.page_blocks b
     where b.profile_id = p_profile_id and b.type = 'whatsapp' and b.visible and not b.pending
  ) or exists (
    select 1 from public.offers o
     where o.profile_id = p_profile_id and o.action_type = 'whatsapp_direct' and o.is_active
  );
$$;

-- -----------------------------------------------------------------------------
-- 2. Where each account stands
-- -----------------------------------------------------------------------------

create table public.onboarding_progress (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  step        text not null check (step in ('category', 'identity', 'button', 'appearance', 'done')),
  category_id uuid references public.activity_categories (id) on delete set null,
  updated_at  timestamptz not null default now()
);

comment on table public.onboarding_progress is
  'Furthest sign-up step reached. Written by onboarding_advance / onboarding_publish only.';

alter table public.onboarding_progress enable row level security;

create policy "Owners read their progress"
  on public.onboarding_progress for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Platform admins read every progress"
  on public.onboarding_progress for select
  to authenticated
  using ((select public.is_platform_admin()));

revoke all on public.onboarding_progress from anon, authenticated;
grant select on public.onboarding_progress to authenticated;
grant select, insert, update, delete on public.onboarding_progress to service_role;

-- Accounts that already exist: a published page has finished; a reserved link
-- without its page is at the main button. Their pages are left as they are.
insert into public.onboarding_progress (user_id, step, category_id)
select p.user_id,
       case when p.onboarding_completed_at is not null then 'done' else 'button' end,
       p.category_id
  from public.profiles p
on conflict (user_id) do nothing;

create or replace function public.onboarding_step_rank(p_step text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select array_position(array['category', 'identity', 'button', 'appearance', 'done'], p_step);
$$;

/**
 * Moves the signed-in account forward, never back, and only to a step its
 * data allows:
 *   identity    — a trade was chosen (an active category);
 *   button      — the profile exists (the link is reserved);
 *   appearance,
 *   done        — the page is published.
 * Choosing the trade again later updates it, without moving the step back.
 */
create or replace function public.onboarding_advance(p_step text, p_category_id uuid default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user    uuid := (select auth.uid());
  v_profile public.profiles;
  v_step    text;
begin
  if v_user is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;
  if public.onboarding_step_rank(p_step) is null or p_step = 'category' then
    raise exception 'invalid_step' using errcode = '22023';
  end if;

  select * into v_profile from public.profiles where user_id = v_user;

  if p_step = 'identity' then
    if p_category_id is null
       or not exists (select 1 from public.activity_categories c
                       where c.id = p_category_id and c.is_active) then
      raise exception 'invalid_category' using errcode = '22023';
    end if;
    if v_profile.id is not null then
      update public.profiles set category_id = p_category_id where id = v_profile.id;
    end if;
  elsif p_step = 'button' then
    if v_profile.id is null then
      raise exception 'no_profile' using errcode = '22023';
    end if;
  elsif v_profile.id is null or v_profile.onboarding_completed_at is null then
    raise exception 'not_published' using errcode = '22023';
  end if;

  insert into public.onboarding_progress as o (user_id, step, category_id)
  values (v_user, p_step, coalesce(p_category_id, v_profile.category_id))
  on conflict (user_id) do update
     set step = case
                  when public.onboarding_step_rank(excluded.step) > public.onboarding_step_rank(o.step)
                  then excluded.step else o.step
                end,
         category_id = coalesce(p_category_id, o.category_id),
         updated_at = now()
  returning o.step into v_step;

  return v_step;
end;
$$;

revoke execute on function public.onboarding_advance(text, uuid) from public, anon;
grant execute on function public.onboarding_advance(text, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 3. The main button, and the page goes live
-- -----------------------------------------------------------------------------

/**
 * p_kind      whatsapp | call | message | link
 * p_block     the main block's config (whatsapp, call, link); validated by the
 *             app first, and parsed again at every render like any block.
 * p_offer_title  the "Send a message" offer's title, in the coach's language.
 * p_pending   [{type, config}] — the trade's suggested blocks, to complete.
 *
 * Only for a profile not yet published: once the page is live this returns
 * false and changes nothing, so a double tap or a replayed request cannot add
 * a second main button. Leftovers of an earlier attempt that failed halfway
 * are cleared first — an unpublished page has no blocks of its own.
 */
create or replace function public.onboarding_publish(
  p_kind        text,
  p_block       jsonb,
  p_offer_title text,
  p_pending     jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
  v_offer   uuid;
  v_item    jsonb;
  v_pos     integer := 1;
  v_types   text[] := array['link', 'socials', 'whatsapp', 'call', 'email', 'youtube', 'text',
                            'divider', 'faq', 'reviews', 'hours', 'gallery', 'pricing', 'address',
                            'file', 'announcement', 'stats', 'vcard'];
begin
  select * into v_profile from public.profiles
   where user_id = (select auth.uid())
   for update;

  if v_profile.id is null then
    raise exception 'no_profile' using errcode = '42501';
  end if;
  if v_profile.suspended_at is not null or v_profile.deleted_at is not null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_profile.onboarding_completed_at is not null then
    return false;
  end if;
  if p_kind not in ('whatsapp', 'call', 'message', 'link') then
    raise exception 'invalid_kind' using errcode = '22023';
  end if;
  if p_kind <> 'message' and (p_block is null or jsonb_typeof(p_block) <> 'object') then
    raise exception 'invalid_block' using errcode = '22023';
  end if;
  if p_pending is not null and (jsonb_typeof(p_pending) <> 'array' or jsonb_array_length(p_pending) > 8) then
    raise exception 'invalid_pending' using errcode = '22023';
  end if;

  delete from public.page_blocks where profile_id = v_profile.id;

  -- The page is laid out here, not by the first-offer trigger.
  update public.profiles
     set page_initialized_at = coalesce(page_initialized_at, now()),
         whatsapp_number = case when p_kind = 'whatsapp' then p_block ->> 'number' else whatsapp_number end,
         phone_number    = case when p_kind = 'call' then p_block ->> 'number' else phone_number end
   where id = v_profile.id;

  if p_kind = 'message' then
    if p_offer_title is null or char_length(btrim(p_offer_title)) not between 1 and 120 then
      raise exception 'invalid_offer' using errcode = '22023';
    end if;
    insert into public.offers (profile_id, title, price_type, action_type, action_config)
    values (v_profile.id, btrim(p_offer_title), 'on_request', 'contact_request',
            jsonb_build_object('cta_label', null, 'message_prompt', null, 'ask_phone', 'optional'))
    returning id into v_offer;
    -- offers_add_page_block appended the service block: it leads the page.
    update public.page_blocks set position = 0 where offer_id = v_offer;
  else
    insert into public.page_blocks (profile_id, type, position, config)
    values (v_profile.id, p_kind, 0, p_block);
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_pending, '[]'::jsonb))
  loop
    if not (v_item ->> 'type' = any (v_types)) or v_item ->> 'type' = p_kind
       or jsonb_typeof(coalesce(v_item -> 'config', '{}'::jsonb)) <> 'object' then
      continue;
    end if;
    insert into public.page_blocks (profile_id, type, position, config, pending, suggested)
    values (v_profile.id, v_item ->> 'type', v_pos, coalesce(v_item -> 'config', '{}'::jsonb), true, true);
    v_pos := v_pos + 1;
  end loop;

  update public.profiles
     set onboarding_completed_at = coalesce(onboarding_completed_at, now())
   where id = v_profile.id;

  -- The Instagram tracking link the final screen hands out.
  insert into public.tracking_sources (profile_id, slug, label, kind)
  values (v_profile.id, 'instagram', 'Instagram', 'instagram')
  on conflict (profile_id, slug) do nothing;

  insert into public.onboarding_progress as o (user_id, step, category_id)
  values (v_profile.user_id, 'appearance', v_profile.category_id)
  on conflict (user_id) do update
     set step = case when public.onboarding_step_rank(o.step) < public.onboarding_step_rank('appearance')
                     then 'appearance' else o.step end,
         updated_at = now();

  return true;
end;
$$;

revoke execute on function public.onboarding_publish(text, jsonb, text, jsonb) from public, anon;
grant execute on function public.onboarding_publish(text, jsonb, text, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Alternatives to a taken link
-- -----------------------------------------------------------------------------

create or replace function public.available_slugs(p_slugs text[])
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(s order by ord), '{}')
    from unnest(p_slugs[1:12]) with ordinality as t(s, ord)
   where public.is_slug_available(s);
$$;

revoke execute on function public.available_slugs(text[]) from public, anon;
grant execute on function public.available_slugs(text[]) to authenticated;

-- -----------------------------------------------------------------------------
-- 5 & 6. The console
-- -----------------------------------------------------------------------------

create or replace function public.admin_active_sessions(p_user_id uuid)
returns table (
  created_at   timestamptz,
  refreshed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- A member admin through their session, or the console password through
  -- the service role. Nobody else — and a NULL on either side is a refusal,
  -- not a pass: `not (false or null)` is null, which `if` would let through.
  if not (
    coalesce(public.is_platform_admin(), false)
    or coalesce((select auth.role()) = 'service_role', false)
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
    select s.created_at,
           coalesce(s.refreshed_at, s.updated_at, s.created_at)
      from auth.sessions s
     where s.user_id = p_user_id
       and (s.not_after is null or s.not_after > now())
     order by coalesce(s.refreshed_at, s.updated_at, s.created_at) desc
     limit 20;
end;
$$;

drop function public.admin_unfinished_signups();

/**
 * Accounts that started and did not finish: no profile yet (the trade at
 * most), or a reserved link whose sign-up stopped before the end. Admins
 * aside. `step` is the furthest step reached.
 */
create function public.admin_unfinished_signups()
returns table (
  user_id          uuid,
  email            text,
  provider         text,
  created_at       timestamptz,
  last_sign_in_at  timestamptz,
  email_confirmed  boolean,
  step             text,
  slug             text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (
    coalesce((select auth.role()) = 'service_role', false)
    or coalesce((select public.is_platform_admin()), false)
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
    select u.id,
           u.email::text,
           coalesce(u.raw_app_meta_data ->> 'provider', 'email'),
           u.created_at,
           u.last_sign_in_at,
           u.email_confirmed_at is not null,
           case
             when p.id is null then coalesce(o.step, 'category')
             when p.onboarding_completed_at is null then 'button'
             else coalesce(o.step, 'done')
           end,
           p.slug
      from auth.users u
      left join public.profiles p on p.user_id = u.id
      left join public.onboarding_progress o on o.user_id = u.id
     where not exists (select 1 from public.platform_admins a where a.user_id = u.id)
       and (p.id is null or p.onboarding_completed_at is null or o.step = 'appearance')
       and p.deleted_at is null
     order by u.created_at desc
     limit 500;
end;
$$;

revoke execute on function public.admin_unfinished_signups() from public, anon;
grant execute on function public.admin_unfinished_signups() to authenticated, service_role;
