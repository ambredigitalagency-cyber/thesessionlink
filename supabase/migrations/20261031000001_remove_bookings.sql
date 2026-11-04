-- =============================================================================
-- Bookings are gone.
--
-- TheSessionLink is no longer a booking tool: a coach's page lists what they
-- offer and how to reach them, and that is all. Everything that only existed
-- to take a reservation goes in one step:
--
--   * the two reservation action types, calendar_booking ("book a slot") and
--     direct_reservation ("reserve without a time"). Offers of either type are
--     kept and become contact_request offers — same title, price, photos and
--     details, with a message form instead of a booking form;
--   * bookings, the clients CRM fed by them, weekly availabilities, time off
--     and the waitlist;
--   * online payment from a client to a coach (Stripe Connect, PayPal):
--     payment_accounts, payments, public_payment_options. The coach's own
--     subscription (Paddle) is untouched;
--   * the reminder and unpaid-checkout cron jobs, their functions, and the
--     profile settings that only steered bookings (reminders, new-booking
--     notifications, calendar visibility, add-ons on offers).
--
-- A contact or quote request is now an email to the coach and nothing else:
-- no row is stored.
--
-- Kept on purpose:
--   * is_reserved_slug() still lists 'booking', 'bookings' and 'waitlist'.
--     Links to /booking/<token> and /waitlist/<token> are in clients'
--     inboxes; a coach taking one of those words as a slug would inherit them.
--     It also backs the profiles.slug check, so it is left as it is;
--   * 'edit_booking' stays allowed in admin_audit_log.action: past console
--     interventions are history and are not rewritten;
--   * rate_limit_events and check_rate_limit(): the magic link and the public
--     request form still use them.
--
-- DESTRUCTIVE: every booking, client record, schedule, waitlist entry and
-- payment record is deleted. Take a dump first.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Scheduled jobs. Unscheduled by name, and only if present, so this runs the
-- same on a project where they were never set up.
-- -----------------------------------------------------------------------------
select cron.unschedule(jobid)
  from cron.job
 where jobname in ('thesessionlink-reminders', 'thesessionlink-expire-unpaid-bookings');

drop function if exists public.dispatch_reminders();
drop function if exists public.claim_due_reminders(integer);
drop function if exists public.expire_unpaid_bookings();

-- -----------------------------------------------------------------------------
-- Weekly schedule seeded for every new profile.
-- -----------------------------------------------------------------------------
drop trigger if exists profiles_default_availability on public.profiles;
drop function if exists public.profiles_default_availability();
drop function if exists public.replace_weekly_availability(uuid, jsonb);

-- -----------------------------------------------------------------------------
-- Views over the tables that go.
-- -----------------------------------------------------------------------------
drop view if exists public.client_summaries;
drop view if exists public.public_payment_options;

-- The console list loses its two booking counters. Columns cannot be removed
-- by create or replace, hence drop + create; same definition otherwise.
drop view if exists public.admin_coach_overview;

create view public.admin_coach_overview
with (security_invoker = true) as
  select
    p.id,
    p.user_id,
    p.display_name,
    p.slug,
    -- Set from the account's email at signup; the console searches on it.
    p.contact_email,
    p.locale,
    p.created_at,
    p.onboarding_completed_at,
    p.trial_ends_at,
    p.subscription_active,
    p.suspended_at,
    p.suspension_reason,
    p.category_id,
    c.name as category_name,
    (select count(*) from public.offers o where o.profile_id = p.id)::integer as offers_count,
    p.deleted_at,
    p.subscription_status
  from public.profiles p
  left join public.activity_categories c on c.id = p.category_id;

revoke all on public.admin_coach_overview from anon, authenticated;
grant select on public.admin_coach_overview to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Tables. Children first; their policies, triggers and indexes go with them.
-- -----------------------------------------------------------------------------
drop table if exists public.waitlist_entries;
drop table if exists public.payments;
drop table if exists public.payment_accounts;
drop table if exists public.bookings;
drop table if exists public.clients;
drop table if exists public.time_off;
drop table if exists public.availabilities;

-- Trigger functions of the tables above (the triggers left with the tables).
drop function if exists public.bookings_attach_client();
drop function if exists public.bookings_enforce_capacity();
drop function if exists public.bookings_set_group_key();
drop function if exists public.bookings_enforce_seats();
drop function if exists public.availabilities_check_offer();

drop type if exists public.booking_status;

-- -----------------------------------------------------------------------------
-- Offers: the two reservation types become message forms.
--
-- ask_phone is the one setting both sides share; everything else in the old
-- action_config (duration, seats, dates, payment…) has no meaning any more.
-- -----------------------------------------------------------------------------
update public.offers
   set action_type   = 'contact_request',
       action_config = case
         when action_config ? 'ask_phone'
           then jsonb_build_object('ask_phone', action_config -> 'ask_phone')
         else '{}'::jsonb
       end
 where action_type in ('calendar_booking', 'direct_reservation');

alter table public.offers drop column if exists addons;

-- An enum value cannot be dropped: the type is rebuilt with the three that
-- remain. Nothing else uses it once bookings is gone.
alter type public.action_type rename to action_type_old;

create type public.action_type as enum (
  'contact_request', -- send a message / ask for info
  'whatsapp_direct', -- open a WhatsApp conversation
  'quote_request'    -- describe a need, the pro comes back with a price
);

alter table public.offers
  alter column action_type type public.action_type
  using action_type::text::public.action_type;

drop type public.action_type_old;

-- -----------------------------------------------------------------------------
-- Activity categories: templates and defaults for the remaining types only.
-- -----------------------------------------------------------------------------
update public.activity_categories
   set config = jsonb_set(
         config,
         '{default_action_type}',
         to_jsonb('contact_request'::text)
       )
 where config ->> 'default_action_type' in ('calendar_booking', 'direct_reservation');

update public.activity_categories
   set config = jsonb_set(
         config,
         '{templates}',
         (config -> 'templates') - 'calendar_booking' - 'direct_reservation'
       )
 where config ? 'templates';

-- Field suggestions skipped for a removed type: the type no longer exists.
update public.activity_categories c
   set config = jsonb_set(
         c.config,
         '{suggested_fields}',
         (
           select coalesce(jsonb_agg(
             case
               when field ? 'skip_for_actions' then
                 jsonb_set(
                   field,
                   '{skip_for_actions}',
                   (field -> 'skip_for_actions') - 'calendar_booking' - 'direct_reservation'
                 )
               else field
             end
             order by ordinality
           ), '[]'::jsonb)
             from jsonb_array_elements(c.config -> 'suggested_fields') with ordinality as f(field, ordinality)
         )
       )
 where jsonb_typeof(c.config -> 'suggested_fields') = 'array';

-- -----------------------------------------------------------------------------
-- Profiles: settings that only steered bookings. public_profiles exposes two
-- of them, so it is rebuilt first — same definition as 20261001000011 without
-- calendar_visible and custom_closed_message.
-- -----------------------------------------------------------------------------
drop view if exists public.public_profiles;

create view public.public_profiles
with (security_invoker = false) as
  select
    id, slug, display_name, headline, bio, avatar_url, category_id, social_links,
    location, theme, locale, timezone, currency,
    case when coalesce((contact_channels ->> 'whatsapp')::boolean, false)
      then whatsapp_number else null end as whatsapp_number,
    case when coalesce((contact_channels ->> 'email')::boolean, false)
      then contact_email else null end as contact_email,
    case when coalesce((contact_channels ->> 'phone')::boolean, false)
      then phone_number else null end as phone_number,
    custom_fields
  from public.profiles p
  where suspended_at is null
    and deleted_at is null;

revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to anon, authenticated, service_role;

alter table public.profiles
  drop column if exists reminder_hours_before,
  drop column if exists reminder_message,
  drop column if exists notify_new_bookings,
  drop column if exists calendar_visible,
  drop column if exists custom_closed_message,
  drop column if exists payment_method;
