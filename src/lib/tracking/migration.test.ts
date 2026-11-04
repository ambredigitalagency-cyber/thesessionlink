import { readFileSync } from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { parseStats } from "./stats";

/**
 * The statistics functions, run from the very text of their migration against
 * a minimal stand-in of the tables they read: recording and its limits, the
 * aggregation, who may read it, the 13-month purge and the WhatsApp rule.
 */
const migration = (name: string) =>
  readFileSync(path.join(process.cwd(), "supabase/migrations", name), "utf8");
const tracking = migration("20261102000001_page_tracking.sql");
const blocks = migration("20261101000001_page_blocks.sql");

function fn(sql: string, name: string): string {
  const start = sql.indexOf(`create or replace function public.${name}(`);
  const end = sql.indexOf("$$;", sql.indexOf("as $$", start)) + 3;
  if (start < 0 || end < 3) throw new Error(`function ${name} not found`);
  return sql.slice(start, end);
}

function table(sql: string, name: string): string {
  const start = sql.indexOf(`create table public.${name} (`);
  const end = sql.indexOf("\n);", start) + 3;
  return sql.slice(start, end);
}

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const BLOCK = "10000000-0000-4000-8000-000000000001";
const HIDDEN = "10000000-0000-4000-8000-000000000002";
const OTHER_BLOCK = "10000000-0000-4000-8000-000000000003";
const H1 = "a".repeat(64);
const H2 = "b".repeat(64);

let db: PGlite;

const record = (args: {
  profile?: string;
  type?: string;
  block?: string | null;
  kind?: string | null;
  source?: string;
  hash?: string;
}) =>
  db
    .query<{ ok: boolean }>(
      `select public.record_page_event($1, $2, $3, $4, $5, 'FR', 'Lyon', 'mobile', $6) as ok`,
      [
        args.profile ?? A,
        args.type ?? "view",
        args.block ?? null,
        args.kind ?? null,
        args.source ?? "direct",
        args.hash ?? H1,
      ],
    )
    .then((result) => result.rows[0].ok);

const as = async (profileId: string | null, role = "authenticated") => {
  await db.exec(`select set_config('test.profile', '${profileId ?? ""}', false)`);
  await db.exec(`select set_config('test.role', '${role}', false)`);
};

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create schema auth;
    create function auth.role() returns text language sql as $$
      select coalesce(nullif(current_setting('test.role', true), ''), 'authenticated') $$;
    create table public.profiles (
      id uuid primary key, timezone text, whatsapp_number text,
      onboarding_completed_at timestamptz, suspended_at timestamptz, deleted_at timestamptz
    );
    create table public.offers (
      id uuid primary key, profile_id uuid references public.profiles (id),
      title text, action_type text, is_active boolean default true
    );
    create table public.page_blocks (
      id uuid primary key, profile_id uuid references public.profiles (id) on delete cascade,
      type text, visible boolean default true, config jsonb default '{}', offer_id uuid
    );
    create function public.current_profile_id() returns uuid language sql as $$
      select nullif(current_setting('test.profile', true), '')::uuid $$;
    create function public.is_platform_admin() returns boolean language sql as $$ select false $$;
  `);
  await db.exec(fn(blocks, "is_live_profile"));
  await db.exec(table(tracking, "page_events"));
  for (const name of ["record_page_event", "page_stats", "purge_page_events", "exposes_whatsapp"]) {
    await db.exec(fn(tracking, name));
  }
  await db.exec(`
    insert into public.profiles values
      ('${A}', 'Europe/Paris', '+33600000001', now(), null, null),
      ('${B}', 'Europe/Paris', '+33600000002', now(), null, null);
    insert into public.page_blocks (id, profile_id, type, visible) values
      ('${BLOCK}', '${A}', 'link', true),
      ('${HIDDEN}', '${A}', 'link', false),
      ('${OTHER_BLOCK}', '${B}', 'link', true);
  `);
}, 120_000);

afterAll(async () => {
  await db.close();
});

describe("recording", () => {
  it("counts a visit once per visitor every 30 minutes", async () => {
    expect(await record({})).toBe(true);
    expect(await record({})).toBe(false);
    expect(await record({ hash: H2 })).toBe(true);
  });

  it("refuses blocks that are hidden or belong to another page", async () => {
    expect(await record({ type: "click", block: HIDDEN })).toBe(false);
    expect(await record({ type: "click", block: OTHER_BLOCK })).toBe(false);
    expect(await record({ type: "click", block: BLOCK })).toBe(true);
  });

  it("treats a double tap as one click", async () => {
    expect(await record({ type: "click", block: BLOCK, hash: H2 })).toBe(true);
    expect(await record({ type: "click", block: BLOCK, hash: H2 })).toBe(false);
  });

  it("refuses inconsistent events and pages that are not live", async () => {
    expect(await record({ type: "contact", kind: null, hash: "c".repeat(64) })).toBe(false);
    expect(await record({ type: "click", kind: "whatsapp", hash: "c".repeat(64) })).toBe(false);
    await db.exec(`update public.profiles set suspended_at = now() where id = '${B}'`);
    expect(await record({ profile: B, hash: "c".repeat(64) })).toBe(false);
    await db.exec(`update public.profiles set suspended_at = null where id = '${B}'`);
  });

  it("caps a visitor at 30 clicks an hour", async () => {
    const hash = "d".repeat(64);
    await db.exec(`
      insert into public.page_events (profile_id, type, source, visitor_hash, created_at)
      select '${A}', 'click', 'direct', '${hash}', now() - interval '10 minutes' from generate_series(1, 30)`);
    expect(await record({ type: "click", block: BLOCK, hash })).toBe(false);
  });
});

describe("page_stats", () => {
  beforeAll(async () => {
    await db.exec(`delete from public.page_events`);
    // This period: 4 visits (3 from instagram), 2 clicks, 1 contact.
    // The period before: 2 visits.
    await db.exec(`
      insert into public.page_events (profile_id, block_id, type, contact_kind, source, country, device, visitor_hash, created_at) values
        ('${A}', null, 'view', null, 'instagram', 'FR', 'mobile', '${"1".repeat(64)}', now() - interval '1 day'),
        ('${A}', null, 'view', null, 'instagram', 'FR', 'mobile', '${"2".repeat(64)}', now() - interval '2 days'),
        ('${A}', null, 'view', null, 'instagram', 'BE', 'desktop', '${"3".repeat(64)}', now() - interval '3 days'),
        ('${A}', null, 'view', null, 'direct', 'FR', 'mobile', '${"4".repeat(64)}', now()),
        ('${A}', '${BLOCK}', 'click', null, 'instagram', 'FR', 'mobile', '${"1".repeat(64)}', now() - interval '1 day'),
        ('${A}', '${BLOCK}', 'contact', 'whatsapp', 'instagram', 'FR', 'mobile', '${"1".repeat(64)}', now() - interval '1 day'),
        ('${A}', null, 'view', null, 'direct', 'FR', 'mobile', '${"5".repeat(64)}', now() - interval '10 days'),
        ('${A}', null, 'view', null, 'direct', 'FR', 'mobile', '${"6".repeat(64)}', now() - interval '12 days'),
        ('${B}', null, 'view', null, 'direct', 'FR', 'mobile', '${"7".repeat(64)}', now());
    `);
  });

  it("totals the period and the one before, day by day", async () => {
    await as(A);
    const { rows } = await db.query<{ s: unknown }>(`select public.page_stats($1, 7) as s`, [A]);
    const stats = parseStats(rows[0].s);
    expect(stats.totals).toEqual({ views: 4, clicks: 2, contacts: 1 });
    expect(stats.previous).toEqual({ views: 2, clicks: 0, contacts: 0 });
    // In people: 4 visitors, one of whom clicked and got in touch — never over 100 %.
    expect(stats.funnel).toEqual({ visitors: 4, clickers: 1, contacters: 1 });
    expect(stats.daily).toHaveLength(7);
    expect(stats.daily.reduce((sum, day) => sum + day.views, 0)).toBe(4);
    expect(stats.sources[0]).toEqual({ source: "instagram", views: 3, contacts: 1 });
    expect(stats.blocks[0]).toMatchObject({ id: BLOCK, clicks: 2, contacts: 1 });
    expect(stats.countries[0]).toEqual({ country: "FR", views: 3 });
    expect(stats.devices).toContainEqual({ device: "desktop", views: 1 });
    expect(stats.contact_kinds).toEqual([{ kind: "whatsapp", contacts: 1 }]);
  });

  it("is refused to any other coach", async () => {
    await as(B);
    await expect(db.query(`select public.page_stats($1, 7)`, [A])).rejects.toThrow(/forbidden/);
    await as(null, "anon");
    await expect(db.query(`select public.page_stats($1, 7)`, [A])).rejects.toThrow(/forbidden/);
    await as(null, "service_role");
    await expect(db.query(`select public.page_stats($1, 7)`, [A])).resolves.toBeTruthy();
  });
});

describe("retention", () => {
  it("purges events older than 13 months, and only those", async () => {
    await db.exec(`
      insert into public.page_events (profile_id, type, source, visitor_hash, created_at) values
        ('${A}', 'view', 'direct', '${"8".repeat(64)}', now() - interval '14 months'),
        ('${A}', 'view', 'direct', '${"9".repeat(64)}', now() - interval '12 months')`);
    const { rows } = await db.query<{ n: number }>(`select public.purge_page_events() as n`);
    expect(rows[0].n).toBe(1);
    const left = await db.query<{ n: number }>(
      `select count(*)::int as n from public.page_events where visitor_hash = '${"9".repeat(64)}'`,
    );
    expect(left.rows[0].n).toBe(1);
  });
});

describe("public WhatsApp number", () => {
  const exposes = async (profileId: string) =>
    (await db.query<{ v: boolean }>(`select public.exposes_whatsapp($1) as v`, [profileId])).rows[0]
      .v;

  it("stays private on a page with no WhatsApp", async () => {
    expect(await exposes(B)).toBe(false);
  });

  it("is public with a visible WhatsApp block, not a hidden one", async () => {
    await db.exec(`insert into public.page_blocks (id, profile_id, type, visible)
      values ('20000000-0000-4000-8000-000000000001', '${B}', 'whatsapp', false)`);
    expect(await exposes(B)).toBe(false);
    await db.exec(
      `update public.page_blocks set visible = true where id = '20000000-0000-4000-8000-000000000001'`,
    );
    expect(await exposes(B)).toBe(true);
    await db.exec(
      `delete from public.page_blocks where id = '20000000-0000-4000-8000-000000000001'`,
    );
  });

  it("is public with an active WhatsApp offer, which falls back on it", async () => {
    await db.exec(`insert into public.offers (id, profile_id, title, action_type, is_active)
      values ('30000000-0000-4000-8000-000000000001', '${B}', 'Chat', 'whatsapp_direct', false)`);
    expect(await exposes(B)).toBe(false);
    await db.exec(
      `update public.offers set is_active = true where id = '30000000-0000-4000-8000-000000000001'`,
    );
    expect(await exposes(B)).toBe(true);
  });
});
