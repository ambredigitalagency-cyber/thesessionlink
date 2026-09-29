-- =============================================================================
-- A reminder in the coach's own words.
--
-- The reminder email was the same for everyone: date, place, "see or cancel".
-- reminder_message is a short text the coach writes once in Settings — what
-- to bring, where to park, the door code — shown in every reminder, above
-- the booking details. It may carry {client}, {offer} and {time}, filled in
-- per booking when the email is sent (src/lib/emails/reminder-text.ts).
--
-- The delay was already there (reminder_hours_before). Null = no message, the
-- reminder stays as it was.
-- =============================================================================

alter table public.profiles
  add column reminder_message text
    check (char_length(reminder_message) <= 500);

comment on column public.profiles.reminder_message is
  'Coach''s own text in every reminder email. Tokens: {client}, {offer}, {time}.';
