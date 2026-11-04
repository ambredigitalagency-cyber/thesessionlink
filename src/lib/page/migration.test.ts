import { readFileSync } from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { parseBlocks } from "./blocks";

/**
 * Existing profiles get a page through build_default_page(), in the migration
 * that creates page_blocks. That function is run here — the very text of the
 * migration, extracted — against a minimal stand-in of the tables it reads,
 * so "no public page becomes empty" is checked, not hoped.
 */
const sql = readFileSync(
  path.join(process.cwd(), "supabase/migrations/20261101000001_page_blocks.sql"),
  "utf8",
);

function fn(name: string): string {
  const start = sql.indexOf(`create or replace function public.${name}(`);
  const end = sql.indexOf("$$;", sql.indexOf("as $$", start)) + 3;
  if (start < 0 || end < 3) throw new Error(`function ${name} not found in the migration`);
  return sql.slice(start, end);
}

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create table public.profiles (
      id uuid primary key,
      social_links jsonb not null default '{}',
      contact_channels jsonb not null default '{"email": true, "phone": false, "whatsapp": true}',
      whatsapp_number text,
      phone_number text,
      contact_email text,
      page_initialized_at timestamptz
    );
    create table public.offers (
      id uuid primary key,
      profile_id uuid not null references public.profiles (id),
      position integer not null default 0,
      created_at timestamptz not null default now()
    );
    create table public.page_blocks (
      id uuid primary key default gen_random_uuid(),
      profile_id uuid not null references public.profiles (id),
      type text not null,
      position integer not null,
      config jsonb not null default '{}',
      offer_id uuid references public.offers (id)
    );
  `);
  await db.exec(fn("social_url"));
  await db.exec(fn("build_default_page"));
  // Loading the WebAssembly Postgres takes a few seconds on a cold machine.
}, 120_000);

afterAll(async () => {
  await db.close();
});

const P1 = "00000000-0000-4000-8000-000000000001";
const P2 = "00000000-0000-4000-8000-000000000002";

async function blocksOf(profileId: string) {
  const { rows } = await db.query<{
    id: string;
    type: string;
    config: unknown;
    offer_id: string | null;
  }>(
    `select id, type, config, offer_id from public.page_blocks where profile_id = $1 order by position`,
    [profileId],
  );
  return rows;
}

describe("page migration of existing profiles", () => {
  it("rebuilds socials, the contacts that were shown, and every offer", async () => {
    await db.query(
      `insert into public.profiles (id, social_links, contact_channels, whatsapp_number, phone_number, contact_email)
       values ($1, $2, $3, '+33612345678', '+33100000000', 'coach@example.com')`,
      [
        P1,
        {
          instagram: "@atelier",
          website: "monsite.fr",
          tiktok: "",
          youtube: "https://youtube.com/@chaine",
        },
        { email: true, phone: false, whatsapp: true },
      ],
    );
    await db.query(
      `insert into public.offers (id, profile_id, position) values
         ('10000000-0000-4000-8000-000000000002', $1, 1),
         ('10000000-0000-4000-8000-000000000001', $1, 0)`,
      [P1],
    );

    const { rows } = await db.query<{ n: number }>(`select public.build_default_page($1) as n`, [
      P1,
    ]);
    expect(rows[0].n).toBe(5);

    const blocks = await blocksOf(P1);
    expect(blocks.map((block) => block.type)).toEqual([
      "socials",
      "whatsapp",
      "email",
      "service",
      "service",
    ]);
    expect(blocks[0].config).toEqual({
      links: ["https://instagram.com/atelier", "https://youtube.com/@chaine", "https://monsite.fr"],
    });
    // Offers keep their order on the page.
    expect(blocks.slice(3).map((block) => block.offer_id)).toEqual([
      "10000000-0000-4000-8000-000000000001",
      "10000000-0000-4000-8000-000000000002",
    ]);

    // Every block it writes is one the app accepts and renders.
    process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54421";
    const parsed = parseBlocks(blocks.map((block) => ({ ...block, visible: true })));
    expect(parsed).toHaveLength(blocks.length);
  });

  it("runs once: a second call leaves the page alone", async () => {
    const { rows } = await db.query<{ n: number }>(`select public.build_default_page($1) as n`, [
      P1,
    ]);
    expect(rows[0].n).toBe(0);
    expect(await blocksOf(P1)).toHaveLength(5);
  });

  it("gives a profile without socials, contacts or offers an empty page, not an error", async () => {
    await db.query(`insert into public.profiles (id, contact_channels) values ($1, '{}')`, [P2]);
    const { rows } = await db.query<{ n: number }>(`select public.build_default_page($1) as n`, [
      P2,
    ]);
    expect(rows[0].n).toBe(0);
    const stamped = await db.query<{ done: boolean }>(
      `select page_initialized_at is not null as done from public.profiles where id = $1`,
      [P2],
    );
    expect(stamped.rows[0].done).toBe(true);
  });
});
