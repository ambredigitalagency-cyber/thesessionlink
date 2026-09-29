-- =============================================================================
-- Group sessions: several clients in the same calendar slot.
--
-- A calendar_booking offer used to seat exactly one client per slot, and the
-- bookings_no_overlap exclusion made that a law: no two live bookings of a
-- coach may overlap. A group class (six people, Tuesday 18:00) needs exactly
-- that overlap — but only between bookings of the same session.
--
-- action_config.capacity (1 by default) is how many seats a slot of the offer
-- has. Bookings of a group offer get a group_key, "<offer>@<start>", from a
-- trigger — never from the client. The exclusion now reads: two overlapping
-- live bookings of a coach conflict unless they share a group_key. A solo
-- booking has no group_key, so it still conflicts with everything that
-- overlaps it, exactly as before.
--
-- Seats are counted by a second trigger, the calendar twin of the existing
-- bookings_enforce_capacity() for direct reservations, under the same kind of
-- advisory lock so two clients cannot take the last seat together.
-- =============================================================================

alter table public.bookings
  add column group_key text;

comment on column public.bookings.group_key is
  'Set by trigger for group calendar sessions: "<offer_id>@<starts_at>". Bookings sharing it may overlap.';

-- -----------------------------------------------------------------------------
-- group_key: derived from the offer, on insert and whenever the slot moves.
-- -----------------------------------------------------------------------------
create or replace function public.bookings_set_group_key()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_capacity integer;
begin
  new.group_key := null;

  if new.action_type = 'calendar_booking' and new.offer_id is not null and new.starts_at is not null then
    select coalesce(nullif(o.action_config ->> 'capacity', '')::integer, 1)
      into v_capacity
      from public.offers o
     where o.id = new.offer_id;

    if coalesce(v_capacity, 1) > 1 then
      new.group_key := new.offer_id::text || '@' || to_char(new.starts_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
    end if;
  end if;

  return new;
end;
$$;

create trigger bookings_set_group_key
  before insert or update of starts_at, ends_at, offer_id on public.bookings
  for each row execute function public.bookings_set_group_key();

-- Existing rows: every calendar offer is solo today, so this sets nothing, but
-- it keeps the column honest if capacity was ever set by hand.
update public.bookings set starts_at = starts_at where action_type = 'calendar_booking';

-- -----------------------------------------------------------------------------
-- The exclusion, relaxed for bookings of one and the same session.
-- -----------------------------------------------------------------------------
alter table public.bookings drop constraint bookings_no_overlap;

alter table public.bookings
  add constraint bookings_no_overlap exclude using gist (
    profile_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&,
    coalesce(group_key, id::text) with <>
  ) where (starts_at is not null and status <> 'cancelled');

-- -----------------------------------------------------------------------------
-- Seats of a group session.
-- -----------------------------------------------------------------------------
create or replace function public.bookings_enforce_seats()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_capacity integer;
  v_used     integer;
begin
  if new.group_key is null or new.status = 'cancelled' then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.status <> 'cancelled'
     and new.quantity <= old.quantity
     and new.group_key is not distinct from old.group_key then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.group_key, 0));

  select coalesce(nullif(o.action_config ->> 'capacity', '')::integer, 1)
    into v_capacity
    from public.offers o
   where o.id = new.offer_id;

  select coalesce(sum(b.quantity), 0)
    into v_used
    from public.bookings b
   where b.group_key = new.group_key
     and b.id <> new.id
     and b.status <> 'cancelled';

  if v_used + new.quantity > v_capacity then
    raise exception 'capacity_exceeded' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- Postgres fires triggers of the same event in name order, and the seat count
-- has to see the group_key the other trigger just set: hence a name that
-- sorts after "bookings_set_group_key".
create trigger bookings_zz_enforce_seats
  before insert or update of status, quantity, starts_at on public.bookings
  for each row execute function public.bookings_enforce_seats();
