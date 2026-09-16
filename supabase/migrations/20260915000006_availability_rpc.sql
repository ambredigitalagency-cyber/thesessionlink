-- =============================================================================
-- Atomic replacement of a weekly schedule (delete + insert in one statement
-- batch). Runs as the caller, so RLS still decides what they may touch.
-- =============================================================================

create or replace function public.replace_weekly_availability(p_offer_id uuid, p_rules jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_inserted   integer;
begin
  select p.id into v_profile_id
    from public.profiles p
   where p.user_id = auth.uid();

  if v_profile_id is null then
    raise exception 'no_profile';
  end if;

  delete from public.availabilities a
   where a.profile_id = v_profile_id
     and a.offer_id is not distinct from p_offer_id;

  insert into public.availabilities (profile_id, offer_id, weekday, start_time, end_time)
  select
    v_profile_id,
    p_offer_id,
    (rule ->> 'weekday')::smallint,
    (rule ->> 'start_time')::time,
    (rule ->> 'end_time')::time
  from jsonb_array_elements(coalesce(p_rules, '[]'::jsonb)) as rule;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

revoke execute on function public.replace_weekly_availability(uuid, jsonb) from public, anon;
grant execute on function public.replace_weekly_availability(uuid, jsonb) to authenticated;
