import { readFileSync } from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

/**
 * The sign-up's database side, run from the very text of its migration over a
 * minimal stand-in of the tables it touches: the step reached and how it moves,
 * the publication of the page with its main button, the blocks "to complete"
 * that visitors never see, the free alternatives to a taken link, and the
 * console's access checks.
 */
const migration = (name: string) =>
  readFileSync(path.join(process.cwd(), "supabase/migrations", name), "utf8");
const onboarding = migration("20261103000001_onboarding.sql");
const core = migration("20260915000001_core_schema.sql");
const blocks = migration("20261101000001_page_blocks.sql");
const legalSlugs = migration("20261001000010_legal_slugs.sql");

function fn(sql: string, name: string): string {
  const start = sql.indexOf(`create or replace function public.${name}(`);
  const end = sql.indexOf("$$;", sql.indexOf("as $$", start)) + 3;
  if (start < 0 || end < 3) throw new Error(`function ${name} not found`);
  return sql.slice(start, end);
}

const USER = "00000000-0000-4000-8000-0000000000a1";
const OTHER = "00000000-0000-4000-8000-0000000000b2";
const ADMIN = "00000000-0000-4000-8000-0000000000c3";
const FITNESS = "10000000-0000-4000-8000-000000000001";
const RETIRED = "10000000-0000-4000-8000-000000000002";

let db: PGlite;

const as = async (uid: string | null, role: string | null = "authenticated") => {
  await db.exec(`select set_config('test.uid', '${uid ?? ""}', false)`);
  await db.exec(`select set_config('test.role', '${role ?? ""}', false)`);
};

const one = async <T>(sql: string, params: unknown[] = []) =>
  (await db.query<T>(sql, params)).rows[0];

const step = async (uid: string) =>
  (
    await one<{ step: string }>(`select step from public.onboarding_progress where user_id = $1`, [
      uid,
    ])
  )?.step ?? null;

const publish = (kind: string, block: unknown, pending: unknown[] = []) =>
  one<{ ok: boolean }>(`select public.onboarding_publish($1, $2::jsonb, $3, $4::jsonb) as ok`, [
    kind,
    block === null ? null : JSON.stringify(block),
    "Envoyer un message",
    JSON.stringify(pending),
  ]).then((row) => row.ok);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql as $$
      select nullif(current_setting('test.uid', true), '')::uuid $$;
    create function auth.role() returns text language sql as $$
      select nullif(current_setting('test.role', true), '') $$;
    create table auth.users (
      id uuid primary key, email text, raw_app_meta_data jsonb default '{}',
      created_at timestamptz default now(), last_sign_in_at timestamptz, email_confirmed_at timestamptz
    );
    create table auth.sessions (
      id uuid primary key default gen_random_uuid(), user_id uuid, created_at timestamptz default now(),
      updated_at timestamptz, refreshed_at timestamptz, not_after timestamptz
    );
    create table public.platform_admins (user_id uuid primary key);
    create function public.is_platform_admin() returns boolean language sql security definer as $$
      select exists (select 1 from public.platform_admins a where a.user_id = auth.uid()) $$;
    create table public.activity_categories (id uuid primary key, slug text, is_active boolean default true);
    create table public.profiles (
      id uuid primary key default gen_random_uuid(), user_id uuid unique, slug text unique,
      display_name text, category_id uuid, whatsapp_number text, phone_number text,
      page_initialized_at timestamptz, onboarding_completed_at timestamptz,
      suspended_at timestamptz, deleted_at timestamptz
    );
    create table public.offers (
      id uuid primary key default gen_random_uuid(), profile_id uuid references public.profiles (id),
      title text, price_type text, action_type text, action_config jsonb,
      position integer default 0, is_active boolean default true, created_at timestamptz default now()
    );
    create table public.page_blocks (
      id uuid primary key default gen_random_uuid(),
      profile_id uuid references public.profiles (id) on delete cascade,
      type text, position integer default 0, config jsonb default '{}',
      offer_id uuid references public.offers (id) on delete cascade, visible boolean default true
    );
    alter table public.page_blocks enable row level security;
    create policy "Visible blocks of live pages are public" on public.page_blocks for select using (true);
    grant select on public.page_blocks to anon;
    create table public.tracking_sources (
      id uuid primary key default gen_random_uuid(), profile_id uuid, slug text, label text, kind text,
      unique (profile_id, slug)
    );
    create function public.admin_unfinished_signups() returns void language sql as $$ select $$;
    create function public.social_url(p_key text, p_value text) returns text language sql as $$ select p_value $$;

    insert into auth.users (id, email) values
      ('${USER}', 'new@example.com'), ('${OTHER}', 'other@example.com'), ('${ADMIN}', 'admin@example.com');
    insert into public.platform_admins values ('${ADMIN}');
    insert into public.activity_categories values ('${FITNESS}', 'fitness-coach', true), ('${RETIRED}', 'old', false);
    -- An account that finished the earlier sign-up, and its page.
    insert into public.profiles (user_id, slug, display_name, onboarding_completed_at, page_initialized_at)
      values ('${OTHER}', 'taken-coach', 'Taken', now(), now());
  `);
  await db.exec(fn(legalSlugs, "is_reserved_slug"));
  await db.exec(fn(core, "is_slug_available"));
  await db.exec(fn(core, "offers_complete_onboarding"));
  await db.exec(fn(blocks, "is_live_profile"));
  await db.exec(fn(blocks, "build_default_page"));
  await db.exec(fn(blocks, "offers_add_page_block"));
  await db.exec(`
    create trigger offers_complete_onboarding after insert on public.offers
      for each row execute function public.offers_complete_onboarding();
    create trigger offers_add_page_block after insert on public.offers
      for each row execute function public.offers_add_page_block();
  `);
  // The migration, whole.
  await db.exec(onboarding);
}, 120_000);

afterAll(async () => {
  await db.close();
});

describe("existing accounts", () => {
  it("are marked finished, and their pages left alone", async () => {
    expect(await step(OTHER)).toBe("done");
  });
});

describe("steps", () => {
  beforeEach(async () => {
    await as(USER);
  });

  it("refuses to move without a session, or to a step the data does not allow", async () => {
    await as(null, "anon");
    await expect(
      db.query(`select public.onboarding_advance('identity', $1)`, [FITNESS]),
    ).rejects.toThrow(/unauthenticated/);
    await as(USER);
    await expect(
      db.query(`select public.onboarding_advance('identity', $1)`, [RETIRED]),
    ).rejects.toThrow(/invalid_category/);
    await expect(db.query(`select public.onboarding_advance('button')`)).rejects.toThrow(
      /no_profile/,
    );
    await expect(db.query(`select public.onboarding_advance('done')`)).rejects.toThrow(
      /not_published/,
    );
    await expect(db.query(`select public.onboarding_advance('category')`)).rejects.toThrow(
      /invalid_step/,
    );
    expect(await step(USER)).toBeNull();
  });

  it("stores the trade, then the link, and never goes back", async () => {
    await db.query(`select public.onboarding_advance('identity', $1)`, [FITNESS]);
    expect(await step(USER)).toBe("identity");

    await db.exec(`insert into public.profiles (user_id, slug, display_name, category_id)
      values ('${USER}', 'sara-coach', 'Sara', '${FITNESS}')`);
    await db.query(`select public.onboarding_advance('button')`);
    expect(await step(USER)).toBe("button");

    // Picking the trade again does not move the step back.
    await db.query(`select public.onboarding_advance('identity', $1)`, [FITNESS]);
    expect(await step(USER)).toBe("button");
  });
});

describe("publishing with the main button", () => {
  beforeAll(async () => {
    await as(USER);
  });

  it("is refused with an unknown kind or a missing block", async () => {
    await expect(publish("email", { email: "a@b.co" })).rejects.toThrow(/invalid_kind/);
    await expect(publish("whatsapp", null)).rejects.toThrow(/invalid_block/);
    const { published } = await one<{ published: boolean }>(
      `select onboarding_completed_at is not null as published from public.profiles where user_id = $1`,
      [USER],
    );
    expect(published).toBe(false);
  });

  it("creates the main block first, the suggested blocks to complete after, and goes live", async () => {
    const ok = await publish(
      "whatsapp",
      { number: "+212612345678", message: "Bonjour", label: null },
      [
        { type: "reviews", config: { layout: "carousel", items: [] } },
        { type: "whatsapp", config: {} }, // the main button's own type: skipped
        { type: "service", config: {} }, // never suggested: skipped
        { type: "hours", config: { days: [] } },
      ],
    );
    expect(ok).toBe(true);

    const rows = (
      await db.query<{ type: string; position: number; pending: boolean; suggested: boolean }>(
        `select type, position, pending, suggested from public.page_blocks b
           join public.profiles p on p.id = b.profile_id where p.user_id = $1 order by position`,
        [USER],
      )
    ).rows;
    expect(rows).toEqual([
      { type: "whatsapp", position: 0, pending: false, suggested: false },
      { type: "reviews", position: 1, pending: true, suggested: true },
      { type: "hours", position: 2, pending: true, suggested: true },
    ]);

    const profile = await one<{ published: boolean; whatsapp_number: string }>(
      `select onboarding_completed_at is not null as published, whatsapp_number from public.profiles where user_id = $1`,
      [USER],
    );
    expect(profile).toEqual({ published: true, whatsapp_number: "+212612345678" });
    expect(await step(USER)).toBe("appearance");
    const source = await one<{ n: number }>(
      `select count(*)::int as n from public.tracking_sources s join public.profiles p on p.id = s.profile_id
        where p.user_id = $1 and s.slug = 'instagram'`,
      [USER],
    );
    expect(source.n).toBe(1);
  });

  it("does nothing the second time: a double tap cannot add a second main button", async () => {
    expect(await publish("call", { number: "+212612345678", label: null })).toBe(false);
    const count = await one<{ n: number }>(
      `select count(*)::int as n from public.page_blocks b join public.profiles p on p.id = b.profile_id
        where p.user_id = $1`,
      [USER],
    );
    expect(count.n).toBe(3);
  });

  it("finishes at the look", async () => {
    await db.query(`select public.onboarding_advance('done')`);
    expect(await step(USER)).toBe("done");
  });

  it("with Send a message, creates the offer and leads with its block", async () => {
    const id = "00000000-0000-4000-8000-0000000000d4";
    await db.exec(`insert into auth.users (id, email) values ('${id}', 'msg@example.com');
      insert into public.profiles (user_id, slug, display_name) values ('${id}', 'msg-coach', 'Msg')`);
    await as(id);
    expect(await publish("message", null, [{ type: "faq", config: {} }])).toBe(true);
    const rows = (
      await db.query<{ type: string; position: number; title: string | null }>(
        `select b.type, b.position, o.title from public.page_blocks b
           join public.profiles p on p.id = b.profile_id
           left join public.offers o on o.id = b.offer_id
          where p.user_id = $1 order by b.position`,
        [id],
      )
    ).rows;
    expect(rows).toEqual([
      { type: "service", position: 0, title: "Envoyer un message" },
      { type: "faq", position: 1, title: null },
    ]);
    await as(USER);
  });
});

describe("blocks to complete", () => {
  it("are never readable by a visitor, nor make a WhatsApp number public", async () => {
    await db.exec(`set role anon`);
    const visible = (
      await db.query<{ type: string }>(`select type from public.page_blocks order by type`)
    ).rows.map((row) => row.type);
    await db.exec(`reset role`);
    expect(visible).toContain("whatsapp");
    expect(visible).not.toContain("reviews");
    expect(visible).not.toContain("hours");
    expect(visible).not.toContain("faq");

    // A WhatsApp block still to complete exposes nothing.
    const profile = await one<{ id: string }>(
      `select id from public.profiles where slug = 'msg-coach'`,
    );
    await db.exec(`insert into public.page_blocks (profile_id, type, position, config, pending)
      values ('${profile.id}', 'whatsapp', 5, '{"number":"+212600000000"}', true)`);
    const exposes = await one<{ v: boolean }>(`select public.exposes_whatsapp($1) as v`, [
      profile.id,
    ]);
    expect(exposes.v).toBe(false);
    await db.exec(
      `update public.page_blocks set pending = false where profile_id = '${profile.id}' and type = 'whatsapp'`,
    );
    expect(
      (await one<{ v: boolean }>(`select public.exposes_whatsapp($1) as v`, [profile.id])).v,
    ).toBe(true);
  });
});

describe("alternatives to a taken link", () => {
  it("keeps only the free, well-formed, unreserved ones, in order", async () => {
    await as(USER);
    const { slugs } = await one<{ slugs: string[] }>(`select public.available_slugs($1) as slugs`, [
      ["taken-coach", "taken-coach-2", "dashboard", "x", "coach-taken"],
    ]);
    expect(slugs).toEqual(["taken-coach-2", "coach-taken"]);
  });
});

describe("console access", () => {
  it("is refused when the role is unknown (NULL), not let through", async () => {
    await as(null, null);
    await expect(
      db.query(`select * from public.admin_active_sessions($1)`, [USER]),
    ).rejects.toThrow(/forbidden/);
    await expect(db.query(`select * from public.admin_unfinished_signups()`)).rejects.toThrow(
      /forbidden/,
    );
  });

  it("is refused to a coach, granted to an admin and to the service role", async () => {
    await as(USER);
    await expect(
      db.query(`select * from public.admin_active_sessions($1)`, [USER]),
    ).rejects.toThrow(/forbidden/);
    await expect(db.query(`select * from public.admin_unfinished_signups()`)).rejects.toThrow(
      /forbidden/,
    );
    await as(ADMIN);
    await expect(
      db.query(`select * from public.admin_active_sessions($1)`, [USER]),
    ).resolves.toBeTruthy();
    await as(null, "service_role");
    await expect(db.query(`select * from public.admin_unfinished_signups()`)).resolves.toBeTruthy();
  });

  it("lists unfinished sign-ups with the step reached", async () => {
    const id = "00000000-0000-4000-8000-0000000000e5";
    await db.exec(`insert into auth.users (id, email) values ('${id}', 'stopped@example.com')`);
    await as(ADMIN);
    const rows = (
      await db.query<{ email: string; step: string; slug: string | null }>(
        `select email, step, slug from public.admin_unfinished_signups() order by email`,
      )
    ).rows;
    // Finished accounts and admins are left out; a live page whose look is
    // still to choose is in, with its link.
    expect(rows).toEqual([
      { email: "msg@example.com", step: "appearance", slug: "msg-coach" },
      { email: "stopped@example.com", step: "category", slug: null },
    ]);
  });
});
