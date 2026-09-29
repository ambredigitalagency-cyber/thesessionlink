-- =============================================================================
-- Time off by the hour.
--
-- time_off was whole days only: a holiday, a sick day. A dentist appointment
-- on a Tuesday afternoon meant blocking the whole Tuesday. start_time and
-- end_time, both set or both null, narrow a block to those hours on each day
-- of starts_on..ends_on; null keeps the old meaning, the whole day.
--
-- Wall-clock times in the pro's timezone, like availabilities.start_time.
-- The slot engine (src/lib/scheduling/slots.ts) is the only reader that
-- matters: a slot overlapping a timed block is not offered.
-- =============================================================================

alter table public.time_off
  add column start_time time,
  add column end_time   time,
  add constraint time_off_hours_check check (
    (start_time is null and end_time is null)
    or (start_time is not null and end_time is not null and end_time > start_time)
  );

comment on column public.time_off.start_time is
  'Null = the whole day. Otherwise the block covers start_time..end_time on each day of the range.';
