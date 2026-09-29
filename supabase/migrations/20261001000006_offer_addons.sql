-- =============================================================================
-- Add-ons: the extras a client can take with a booking.
--
-- "Towel and shower access +5 €", "Beard trim +10 €". Offered on the two
-- action types that are a transaction (calendar_booking, direct_reservation),
-- ticked by the client on the booking form, added to what they pay.
--
-- offers.addons   — what the coach offers: [{ id, label, price, description }]
-- bookings.addons — what this client took, copied at booking time with the
--                   label and price of that day, so editing an add-on later
--                   never rewrites a past booking or its payment.
--
-- The shape is validated by the app (src/lib/offers/addons.ts); the database
-- only insists on an array, and on a size that keeps a row small.
-- =============================================================================

alter table public.offers
  add column addons jsonb not null default '[]'::jsonb
    check (jsonb_typeof(addons) = 'array' and jsonb_array_length(addons) <= 6);

alter table public.bookings
  add column addons jsonb not null default '[]'::jsonb
    check (jsonb_typeof(addons) = 'array' and jsonb_array_length(addons) <= 6);

comment on column public.offers.addons is
  'Extras offered at booking: [{id, label, price, description}], at most 6.';
comment on column public.bookings.addons is
  'Extras taken, as they were priced at booking time: [{id, label, price}].';
