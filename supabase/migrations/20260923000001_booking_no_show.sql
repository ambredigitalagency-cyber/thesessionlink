-- =============================================================================
-- No-show tracking.
--
-- A client who never showed up is not a cancellation: nobody freed the slot,
-- the pro lost the hour anyway. The statistics page reports both, separately,
-- so "annulations + absences" never hides which of the two is the problem.
--
-- The flag only makes sense on a confirmed session whose start has passed;
-- that rule lives in markNoShow() rather than in a constraint, because a
-- booking marked absent and cancelled afterwards must still be storable. The
-- stats count such a row once, as a cancellation.
-- =============================================================================

alter table public.bookings
  add column no_show boolean not null default false;

comment on column public.bookings.no_show is
  'The client did not show up. Only set on confirmed sessions already past — '
  'see markNoShow() in src/actions/bookings.ts.';

-- Absences are only ever read per profile, alongside the other statuses.
create index bookings_no_show_idx on public.bookings (profile_id) where no_show;
