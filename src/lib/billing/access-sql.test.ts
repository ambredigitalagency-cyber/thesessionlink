import { readFileSync } from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ACCESS_MATRIX, NOW } from "./access-matrix";

/**
 * The end of the trial, in the database: the rule itself (same matrix as the
 * app), what an expired page still exposes (nothing), what a locked account
 * may still write (nothing but leaving), the emails (once each) and the trial
 * summary. Run from the very text of migration 20261104000001.
 */
const migration = (name: string) =>
  readFileSync(path.join(process.cwd(), "supabase/migrations", name), "utf8");
const trialEnd = migration("20261104000001_trial_end.sql");

function block(sql: string, from: string, to: string): string {
  const start = sql.indexOf(from);
  const end = sql.indexOf(to, start);
  if (start < 0 || end < 0) throw new Error(`block ${from} not found`);
  return sql.slice(start, end);
}

let db: PGlite;
const DAY = 86_400_000;
// The functions below read the real clock (now()): their cases are dated from it.
const BASE = Date.now();
const iso = (days: number) => new Date(BASE + days * DAY).toISOString();

const USER = "00000000-0000-4000-8000-0000000000a1";
const PROFILE = "10000000-0000-4000-8000-0000000000a1";

const as = async (uid: string | null, role = "authenticated") => {
  await db.exec(`select set_config('test.uid', '${uid ?? ""}', false)`);
  await db.exec(`select set_config('test.role', '${role}', false)`);
};

/** Puts the profile in a state, by its dates. */
const setState = (fields: {
  trial: number;
  active?: boolean;
  ended?: number | null;
  suspended?: boolean;
}) =>
  as(null, "service_role").then(() =>
    db.query(
      `update public.profiles
        set trial_ends_at = $1, subscription_active = $2, subscription_ended_at = $3,
            suspended_at = case when $4 then now() end
      where id = '${PROFILE}'`,
      [
        iso(fields.trial),
        fields.active ?? false,
        fields.ended === undefined || fields.ended === null ? null : iso(fields.ended),
        fields.suspended ?? false,
      ],
    ),
  );

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql as $$
      select nullif(current_setting('test.uid', true), '')::uuid $$;
    create function auth.role() returns text language sql as $$
      select nullif(current_setting('test.role', true), '') $$;
    create schema vault;
    create view vault.decrypted_secrets as select null::text as name, null::text as decrypted_secret where false;
    create schema net;
    create function net.http_post(url text, headers jsonb, body jsonb) returns bigint language sql as $$ select 1::bigint $$;
    create schema cron;
    create function cron.schedule(a text, b text, c text) returns bigint language sql as $$ select 1::bigint $$;
    create schema storage;
    create table storage.objects (bucket_id text, name text);
    create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
    alter table storage.objects enable row level security;
    create policy "Users upload to their own media folder" on storage.objects for insert with check (true);
    create policy "Users update their own media" on storage.objects for update using (true);

    create table public.platform_admins (user_id uuid primary key);
    create function public.is_platform_admin() returns boolean language sql security definer as $$
      select exists (select 1 from public.platform_admins a where a.user_id = auth.uid()) $$;
    create table public.activity_categories (id uuid primary key, name jsonb);
    create table public.profiles (
      id uuid primary key, user_id uuid unique, slug text unique, display_name text,
      headline text, bio text, avatar_url text, category_id uuid, location text, theme text default 'classic',
      accent_color text default '#f2542d', locale text default 'fr', timezone text default 'Europe/Paris',
      currency text default 'EUR', whatsapp_number text, contact_email text, custom_fields jsonb default '[]',
      onboarding_completed_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now(),
      trial_ends_at timestamptz, subscription_active boolean default false, subscription_status text,
      subscription_renews_at timestamptz, subscription_synced_at timestamptz, paddle_customer_id text,
      paddle_subscription_id text, suspended_at timestamptz, suspension_reason text, suspended_by uuid,
      deleted_at timestamptz, deletion_warned_at timestamptz
    );
    create function public.current_profile_id() returns uuid language sql security definer as $$
      select id from public.profiles where user_id = auth.uid() $$;
    create table public.offers (
      id uuid primary key default gen_random_uuid(), profile_id uuid references public.profiles (id) on delete cascade,
      title text, action_type text, is_active boolean default true
    );
    create table public.page_blocks (
      id uuid primary key default gen_random_uuid(), profile_id uuid references public.profiles (id) on delete cascade,
      type text, visible boolean default true, pending boolean default false
    );
    create table public.tracking_sources (
      id uuid primary key default gen_random_uuid(), profile_id uuid references public.profiles (id) on delete cascade,
      slug text, label text, kind text
    );
    create table public.page_events (
      id bigserial primary key, profile_id uuid, type text, created_at timestamptz default now()
    );
    create function public.exposes_whatsapp(p_profile_id uuid) returns boolean language sql as $$
      select exists (select 1 from public.page_blocks b where b.profile_id = p_profile_id and b.type = 'whatsapp' and b.visible) $$;
    create function public.is_live_profile(p_profile_id uuid) returns boolean language sql as $$ select true $$;
    alter table public.page_blocks enable row level security;
    alter table public.offers enable row level security;
    alter table public.tracking_sources enable row level security;
    create policy "Owners create blocks" on public.page_blocks for insert with check (true);
    create policy "Owners update blocks" on public.page_blocks for update using (true);
    create policy "Owners delete blocks" on public.page_blocks for delete using (true);
    create policy "Owners read their blocks" on public.page_blocks for select to authenticated
      using (profile_id = public.current_profile_id());
    create policy "Visible blocks of live pages are public" on public.page_blocks for select to anon
      using (visible and not pending and public.is_live_profile(profile_id));
    create policy "Owners create offers" on public.offers for insert with check (true);
    create policy "Owners update offers" on public.offers for update using (true);
    create policy "Owners delete offers" on public.offers for delete using (true);
    create policy "Owners manage their sources" on public.tracking_sources for all using (true);
    grant select, insert, update, delete on public.page_blocks, public.offers, public.tracking_sources, public.profiles to authenticated;
    grant select on public.page_blocks to anon;
    create view public.admin_coach_overview as select 1 as placeholder;

    insert into public.profiles (id, user_id, slug, display_name, onboarding_completed_at, created_at, trial_ends_at, whatsapp_number)
      values ('${PROFILE}', '${USER}', 'sara', 'Sara', now(), '${iso(-14)}', '${iso(0)}', '+212600000000');
    insert into public.page_blocks (profile_id, type) values ('${PROFILE}', 'whatsapp');
  `);
  await db.exec(
    `create function public.profiles_guard_billing() returns trigger language plpgsql as $$ begin return new; end $$;`,
  );
  // Everything up to the console part, which needs the real schema.
  await db.exec(block(trialEnd, "alter table public.profiles add column", "-- 7. The console"));
}, 120_000);

afterAll(async () => {
  await db.close();
});

describe("access state (database)", () => {
  for (const { name, fields, expected } of ACCESS_MATRIX) {
    it(name, async () => {
      const { rows } = await db.query<{ state: string }>(
        `select public.access_state_at($1, $2, $3, $4) as state`,
        [
          fields.trial_ends_at,
          fields.subscription_active,
          fields.subscription_ended_at ?? null,
          NOW.toISOString(),
        ],
      );
      expect(rows[0].state).toBe(expected);
    });
  }
});

describe("what a page exposes, by state", () => {
  const exposure = async () => {
    await as(null, "anon");
    const live = (
      await db.query<{ v: boolean }>(`select public.is_live_profile($1) as v`, [PROFILE])
    ).rows[0].v;
    const unavailable = (
      await db.query<{ v: boolean }>(`select public.profile_unavailable('sara') as v`)
    ).rows[0].v;
    const listed = (await db.query(`select 1 from public.public_profiles where slug = 'sara'`)).rows
      .length;
    await db.exec(`set role anon`);
    const blocks = (await db.query(`select 1 from public.page_blocks`)).rows.length;
    await db.exec(`reset role`);
    return { live, unavailable, listed, blocks };
  };

  it("is fully online during the trial and in grace", async () => {
    await setState({ trial: 3 });
    expect(await exposure()).toEqual({ live: true, unavailable: false, listed: 1, blocks: 1 });
    await setState({ trial: -3 });
    expect(await exposure()).toEqual({ live: true, unavailable: false, listed: 1, blocks: 1 });
  });

  it("exposes nothing once expired: no profile, no blocks, the unavailable page", async () => {
    await setState({ trial: -10 });
    expect(await exposure()).toEqual({ live: false, unavailable: true, listed: 0, blocks: 0 });
  });

  it("comes back at once with a subscription", async () => {
    await setState({ trial: -10, active: true });
    expect(await exposure()).toEqual({ live: true, unavailable: false, listed: 1, blocks: 1 });
  });

  it("stays offline when suspended, whatever the subscription", async () => {
    await setState({ trial: -10, active: true, suspended: true });
    expect((await exposure()).live).toBe(false);
    expect((await exposure()).unavailable).toBe(true);
  });
});

describe("what a locked account may still write", () => {
  const canEdit = async () => {
    await as(USER);
    return (await db.query<{ v: boolean }>(`select public.can_edit_own_page() as v`)).rows[0].v;
  };

  it("edits freely in trial and when subscribed", async () => {
    await setState({ trial: 3 });
    expect(await canEdit()).toBe(true);
    await setState({ trial: -30, active: true });
    expect(await canEdit()).toBe(true);
  });

  it("cannot edit in grace, expired or suspended", async () => {
    await setState({ trial: -2 });
    expect(await canEdit()).toBe(false);
    await setState({ trial: -20 });
    expect(await canEdit()).toBe(false);
    await setState({ trial: 3, suspended: true });
    expect(await canEdit()).toBe(false);
  });

  it("refuses page changes on the profile row, but lets the coach leave or change language", async () => {
    await setState({ trial: -2 });
    await as(USER);
    await expect(
      db.query(`update public.profiles set bio = 'new' where id = '${PROFILE}'`),
    ).rejects.toThrow(/subscription_required/);
    await expect(
      db.query(
        `update public.profiles set locale = 'en', deleted_at = now() where id = '${PROFILE}'`,
      ),
    ).resolves.toBeTruthy();
    await as(null, "service_role");
    await db.query(
      `update public.profiles set deleted_at = null, locale = 'fr' where id = '${PROFILE}'`,
    );
  });
});

describe("emails", () => {
  const claim = async (now: string) => {
    await as(null, "service_role");
    return (
      await db.query<{ kind: string }>(`select kind from public.claim_access_emails($1)`, [now])
    ).rows.map((row) => row.kind);
  };

  it("sends each email once per period, in order, never an overtaken one", async () => {
    await db.exec(`delete from public.access_emails`);
    await setState({ trial: 0 });
    const end = BASE;
    const day = (n: number) => new Date(end + n * DAY).toISOString();

    expect(await claim(day(-5))).toEqual([]); // too early
    expect(await claim(day(-2))).toEqual(["trial_ending"]);
    expect(await claim(day(-1))).toEqual([]); // already sent
    expect(await claim(day(0.1))).toEqual(["grace_started"]);
    expect(await claim(day(1))).toEqual([]);
    expect(await claim(day(5.5))).toEqual(["offline_soon"]);
    expect(await claim(day(7.2))).toEqual(["offline"]);
    expect(await claim(day(8))).toEqual([]);
    expect(await claim(day(20))).toEqual([]); // an old expiry is never mailed late
  });

  it("skips the emails a late run overtook", async () => {
    await db.exec(`delete from public.access_emails`);
    await setState({ trial: 0 });
    expect(await claim(new Date(BASE + 6 * DAY).toISOString())).toEqual(["offline_soon"]);
    expect(await claim(new Date(BASE + 6.5 * DAY).toISOString())).toEqual([]);
    const { rows } = await db.query<{ kind: string; status: string }>(
      `select kind, status from public.access_emails order by kind`,
    );
    expect(rows).toEqual([
      { kind: "grace_started", status: "skipped" },
      { kind: "offline_soon", status: "claimed" },
      { kind: "trial_ending", status: "skipped" },
    ]);
  });

  it("sends nothing to a subscriber, and starts afresh for a new period", async () => {
    await db.exec(`delete from public.access_emails`);
    await setState({ trial: -30, active: true });
    expect(await claim(new Date(BASE).toISOString())).toEqual([]);
    // Subscribed, then stopped: a new period, its own emails.
    await setState({ trial: -30, active: false, ended: -1 });
    expect(await claim(new Date(BASE).toISOString())).toEqual(["grace_started"]);
  });
});

describe("what the page brought during the trial", () => {
  it("counts the trial's events only, and only for the coach or an admin", async () => {
    await setState({ trial: 0 });
    await db.exec(`
      delete from public.page_events;
      insert into public.page_events (profile_id, type, created_at) values
        ('${PROFILE}', 'view', '${iso(-10)}'), ('${PROFILE}', 'view', '${iso(-3)}'),
        ('${PROFILE}', 'click', '${iso(-3)}'), ('${PROFILE}', 'contact', '${iso(-2)}'),
        ('${PROFILE}', 'view', '${iso(1)}'), ('${PROFILE}', 'view', '${iso(-20)}');
    `);
    await as(USER);
    const { rows } = await db.query<{ s: unknown }>(`select public.trial_summary($1) as s`, [
      PROFILE,
    ]);
    expect(rows[0].s).toEqual({ views: 2, clicks: 2, contacts: 1 });

    await as("00000000-0000-4000-8000-0000000000ff");
    await expect(db.query(`select public.trial_summary($1)`, [PROFILE])).rejects.toThrow(
      /forbidden/,
    );
    await as(null, null as unknown as string);
    await expect(db.query(`select public.trial_summary($1)`, [PROFILE])).rejects.toThrow(
      /forbidden/,
    );
  });
});
