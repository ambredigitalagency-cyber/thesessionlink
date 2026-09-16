-- =============================================================================
-- Storage: a single public "media" bucket, one folder per user.
-- Paths look like {auth.uid()}/avatar/{uuid}.webp or {auth.uid()}/offers/{uuid}.webp
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Media is publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'media');

create policy "Users upload to their own media folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users update their own media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users delete their own media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
