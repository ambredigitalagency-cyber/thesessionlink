-- =============================================================================
-- Lightweight rate limiting for the two endpoints anyone can reach without an
-- account: magic-link requests and public bookings.
-- Service role only — the app calls it from server code.
-- =============================================================================

create table public.rate_limit_events (
  id         bigint generated always as identity primary key,
  bucket     text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_events_bucket_idx on public.rate_limit_events (bucket, created_at desc);

alter table public.rate_limit_events enable row level security;

/**
 * Returns true when the action is allowed (and records it), false when the
 * bucket is over its quota for the given window.
 */
create or replace function public.check_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window interval
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.rate_limit_events
   where created_at < now() - greatest(p_window, interval '1 day');

  select count(*) into v_count
    from public.rate_limit_events
   where bucket = p_bucket
     and created_at > now() - p_window;

  if v_count >= p_limit then
    return false;
  end if;

  insert into public.rate_limit_events (bucket) values (p_bucket);
  return true;
end;
$$;

revoke all on public.rate_limit_events from anon, authenticated;
revoke execute on function public.check_rate_limit(text, integer, interval) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, interval) to service_role;
