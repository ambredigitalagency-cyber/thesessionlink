-- =============================================================================
-- Sign-ups the console could not see.
--
-- An account exists as soon as its email link or Google sign-in is confirmed
-- (auth.users). The coach's profile — what the console lists, through
-- admin_coach_overview — is only created at step 2 of onboarding, once a name
-- and a link are chosen. Anyone who stopped in between had signed up and was
-- nowhere in the console.
--
-- This lists them: accounts with no profile, platform admins aside. auth.users
-- is not readable from the API, hence a security definer function, callable
-- only by a platform admin or the service role (the console's password door).
-- Read-only; it returns what the console shows and nothing more.
-- =============================================================================

create function public.admin_unfinished_signups()
returns table (
  user_id          uuid,
  email            text,
  provider         text,
  created_at       timestamptz,
  last_sign_in_at  timestamptz,
  email_confirmed  boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not ((select auth.role()) = 'service_role' or (select public.is_platform_admin())) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
    select u.id,
           u.email::text,
           coalesce(u.raw_app_meta_data ->> 'provider', 'email'),
           u.created_at,
           u.last_sign_in_at,
           u.email_confirmed_at is not null
      from auth.users u
     where not exists (select 1 from public.profiles p where p.user_id = u.id)
       and not exists (select 1 from public.platform_admins a where a.user_id = u.id)
     order by u.created_at desc
     limit 500;
end;
$$;

revoke execute on function public.admin_unfinished_signups() from public, anon;
grant execute on function public.admin_unfinished_signups() to authenticated, service_role;
