-- =============================================================================
-- Multiple photos per offer.
--
-- `photos` is the ordered source of truth (first entry = main photo).
-- `main_photo_url` stays as a derived column so every existing read path — the
-- dashboard list, the public offer card, the OG image — keeps working untouched.
-- A trigger keeps it equal to photos[0].
--
-- The files themselves stay in the existing `media` bucket, under
-- {auth.uid()}/offers/ — its policies already scope writes to the owner.
-- =============================================================================

alter table public.offers
  add column photos jsonb not null default '[]'::jsonb
    check (jsonb_typeof(photos) = 'array');

-- Offers that already had a cover keep it as their first photo.
update public.offers
   set photos = jsonb_build_array(main_photo_url)
 where main_photo_url is not null
   and main_photo_url <> '';

create or replace function public.sync_offer_main_photo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.main_photo_url := nullif(new.photos ->> 0, '');
  return new;
end;
$$;

create trigger offers_sync_main_photo
  before insert or update of photos on public.offers
  for each row execute function public.sync_offer_main_photo();
