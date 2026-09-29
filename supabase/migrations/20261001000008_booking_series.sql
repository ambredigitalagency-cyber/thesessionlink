-- =============================================================================
-- Recurring bookings: one request, a series of sessions.
--
-- "Every Tuesday at 18:00 for eight weeks" used to be eight bookings made one
-- by one. A client can now ask for the series in one go on offers where the
-- coach allows it (action_config.allow_recurring); every occurrence is checked
-- against the slot engine like any single booking, and the ones that are free
-- are inserted together.
--
-- series_id ties them together. Each occurrence stays a booking of its own —
-- its own manage link, its own reminder, cancellable on its own — so nothing
-- downstream (reminders, stats, the calendar, the no-overlap constraint)
-- needed to learn about series.
-- =============================================================================

alter table public.bookings
  add column series_id uuid;

create index bookings_series_idx on public.bookings (series_id) where series_id is not null;

comment on column public.bookings.series_id is
  'Shared by the occurrences of one recurring request; null for a single booking.';
