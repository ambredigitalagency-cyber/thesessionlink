-- =============================================================================
-- Taking payment at booking time.
--
-- The money goes from the client to the coach and never passes through
-- TheSessionLink. That single rule decides most of what follows:
--
--   * Stripe is connected as a STANDARD account and charged directly, so funds
--     land in the coach's own Stripe balance. We hold no balance, owe no
--     payouts, and carry no liability for refunds or chargebacks.
--   * PayPal orders name the coach as the payee (merchant id), same idea.
--   * We store provider *identifiers* and amounts. No card data, no tokens, no
--     secrets: everything that can move money lives in the provider, and the
--     credentials that talk to them live in environment variables.
--
-- What is stored here is therefore a ledger of what we asked for and what the
-- provider told us happened — never a source of truth we could be tempted to
-- trust over a webhook.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- The coach's connected gateways.
--
-- A table rather than columns on profiles: a coach may connect both providers,
-- each has its own onboarding state, and each can be disconnected on its own.
-- -----------------------------------------------------------------------------
create table public.payment_accounts (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles (id) on delete cascade,
  provider        text not null check (provider in ('stripe', 'paypal')),

  /** Stripe: the acct_… id. PayPal: the seller's merchant id. */
  external_id     text,

  /**
   * Our own reference sent along to the provider's onboarding, so the visitor
   * coming back can be matched to the row that started the flow. Random, and
   * useless on its own.
   */
  onboarding_ref  text unique,

  status          text not null default 'pending'
                    check (status in ('pending', 'connected', 'disabled')),

  /**
   * What the provider says the account may do. A connected account that cannot
   * take charges yet (Stripe still verifying, PayPal email unconfirmed) must
   * not be offered to clients.
   */
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,

  /** Display-only echo of the provider's answer: email, country, currency. */
  details         jsonb not null default '{}'::jsonb
                    check (jsonb_typeof(details) = 'object'),

  connected_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (profile_id, provider)
);

create index payment_accounts_profile_idx on public.payment_accounts (profile_id);

alter table public.payment_accounts enable row level security;

create trigger payment_accounts_updated_at
  before update on public.payment_accounts
  for each row execute function public.set_updated_at();

/**
 * A coach reads their own gateways — that is what draws the Settings page.
 *
 * Nobody writes through the API: connecting happens in the OAuth callbacks and
 * the webhooks, which run with the service key. There is no insert, update or
 * delete policy on purpose, so a compromised session cannot point a coach's
 * payouts at someone else's account.
 */
create policy "Pros read their own payment accounts"
  on public.payment_accounts for select
  to authenticated
  using (
    profile_id in (select p.id from public.profiles p where p.user_id = (select auth.uid()))
  );

revoke all on public.payment_accounts from anon, authenticated;
grant select on public.payment_accounts to authenticated;

-- -----------------------------------------------------------------------------
-- One row per attempt to pay.
--
-- Kept even when abandoned or failed: "the client says they paid" is answered
-- by looking here, and an empty table would answer nothing.
-- -----------------------------------------------------------------------------
create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid references public.bookings (id) on delete cascade,
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  offer_id     uuid references public.offers (id) on delete set null,

  provider     text not null check (provider in ('stripe', 'paypal')),

  /** Stripe Checkout Session id, or PayPal Order id. */
  external_id  text,
  /** Set once settled: Stripe PaymentIntent, PayPal capture id. */
  capture_id   text,

  status       text not null default 'pending'
                 check (status in ('pending', 'paid', 'failed', 'cancelled', 'refunded')),

  /** Minor units (cents), like every payment API. Never a float. */
  amount_cents integer not null check (amount_cents >= 0),
  currency     text not null check (char_length(currency) = 3),

  /** The provider's own error text when it failed, for support. */
  failure_reason text,

  paid_at      timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index payments_booking_idx on public.payments (booking_id);
create index payments_profile_idx on public.payments (profile_id, created_at desc);
create unique index payments_external_idx
  on public.payments (provider, external_id) where external_id is not null;

alter table public.payments enable row level security;

create trigger payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

create policy "Pros read their own payments"
  on public.payments for select
  to authenticated
  using (
    profile_id in (select p.id from public.profiles p where p.user_id = (select auth.uid()))
  );

create policy "Platform admins read every payment"
  on public.payments for select
  to authenticated
  using ((select public.is_platform_admin()));

revoke all on public.payments from anon, authenticated;
grant select on public.payments to authenticated;

-- -----------------------------------------------------------------------------
-- What the booking itself remembers.
--
-- payment_status is deliberately separate from status: "paid" and "confirmed"
-- answer different questions, and a paid booking can still be cancelled.
-- -----------------------------------------------------------------------------
alter table public.bookings
  add column payment_status text not null default 'none'
    check (payment_status in ('none', 'pending', 'paid', 'failed', 'refunded')),
  /** Copied from the payment when it settles, so the list needs no join. */
  add column payment_provider text check (payment_provider in ('stripe', 'paypal')),
  add column payment_amount_cents integer check (payment_amount_cents >= 0),
  add column payment_currency text check (char_length(payment_currency) = 3),
  /**
   * When an unpaid booking stops holding its slot.
   *
   * A booking that requires payment is inserted before the client reaches the
   * provider, so the slot cannot be taken from under them mid-checkout. If they
   * never come back, expire_unpaid_bookings() releases it.
   */
  add column payment_due_at timestamptz;

comment on column public.bookings.payment_status is
  '"none" covers both an offer without online payment and a client who chose to '
  'pay on site. "pending" means a checkout is open and the slot is being held.';

create index bookings_payment_due_idx on public.bookings (payment_due_at)
  where payment_due_at is not null and payment_status = 'pending';

-- -----------------------------------------------------------------------------
-- Releasing abandoned checkouts.
--
-- Cancelling rather than deleting: the coach can see that someone tried, and
-- the row keeps its payment history.
-- -----------------------------------------------------------------------------
create or replace function public.expire_unpaid_bookings()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with expired as (
    update public.bookings b
       set status         = 'cancelled',
           cancelled_at   = now(),
           cancelled_by   = 'client',
           payment_status = 'failed',
           payment_due_at = null
     where b.payment_status = 'pending'
       and b.payment_due_at is not null
       and b.payment_due_at <= now()
       and b.status <> 'cancelled'
    returning b.id
  )
  select count(*) into v_count from expired;

  update public.payments p
     set status = 'cancelled'
   where p.status = 'pending'
     and p.created_at <= now() - interval '24 hours';

  return v_count;
end;
$$;

revoke execute on function public.expire_unpaid_bookings() from public, anon, authenticated;

-- Every 10 minutes: a slot held by a checkout nobody finished is worth
-- releasing quickly, and the job is a single indexed update.
select cron.schedule(
  'thesessionlink-expire-unpaid-bookings',
  '*/10 * * * *',
  'select public.expire_unpaid_bookings()'
);

-- -----------------------------------------------------------------------------
-- What the public page is allowed to know.
--
-- The booking form needs to show the right buttons, which means knowing which
-- gateways a coach can actually take money through — and nothing else. A view
-- of booleans, readable by anyone, keeps the account ids out of reach.
-- -----------------------------------------------------------------------------
create or replace view public.public_payment_options
with (security_invoker = false) as
  select
    a.profile_id,
    a.provider
  from public.payment_accounts a
  join public.profiles p on p.id = a.profile_id
 where a.status = 'connected'
   and a.charges_enabled
   and p.suspended_at is null
   and p.deleted_at is null;

revoke all on public.public_payment_options from anon, authenticated;
grant select on public.public_payment_options to anon, authenticated;
