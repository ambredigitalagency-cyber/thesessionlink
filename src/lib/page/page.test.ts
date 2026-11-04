import { describe, expect, it } from "vitest";

import { BLOCK_TYPES, defaultConfig, parseBlocks, validateBlock } from "./blocks";
import { defaultWeek, openStatus, type WeekHours } from "./hours";
import { BLOCK_SUGGESTIONS, blocksFor } from "./suggestions";
import { THEME_IDS, THEMES, accentPalette, contrast } from "./themes";
import { detectPlatform, linkLabel, safeUrl, whatsappUrl, youtubeId } from "./urls";

describe("safeUrl", () => {
  it("keeps http, https, mailto and tel", () => {
    expect(safeUrl("https://example.com/a?b=1")).toBe("https://example.com/a?b=1");
    expect(safeUrl("http://example.com")).toBe("http://example.com/");
    expect(safeUrl("mailto:hello@example.com")).toBe("mailto:hello@example.com");
    expect(safeUrl("tel:+33612345678")).toBe("tel:+33612345678");
  });

  it("reads a bare domain as https", () => {
    expect(safeUrl("monsite.fr/contact")).toBe("https://monsite.fr/contact");
    expect(safeUrl("www.instagram.com/atelier")).toBe("https://www.instagram.com/atelier");
  });

  it("refuses javascript:, data: and friends, however they are written", () => {
    for (const value of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      " javascript:alert(1)",
      "java\tscript:alert(1)",
      "java\nscript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
      "ftp://example.com",
    ]) {
      expect(safeUrl(value), value).toBeNull();
    }
  });

  it("refuses what is not a URL", () => {
    expect(safeUrl("")).toBeNull();
    expect(safeUrl("bonjour")).toBeNull();
    expect(safeUrl("https://localhost")).toBeNull();
    expect(safeUrl(null)).toBeNull();
  });
});

describe("detectPlatform", () => {
  it.each([
    ["https://www.instagram.com/atelier", "instagram"],
    ["instagram.com/atelier", "instagram"],
    ["https://youtu.be/dQw4w9WgXcQ", "youtube"],
    ["https://m.youtube.com/@chaine", "youtube"],
    ["https://www.tiktok.com/@moi", "tiktok"],
    ["https://fr.linkedin.com/in/moi", "linkedin"],
    ["https://twitter.com/moi", "x"],
    ["https://x.com/moi", "x"],
    ["https://www.facebook.com/page", "facebook"],
    ["https://www.snapchat.com/add/moi", "snapchat"],
    ["https://t.me/moi", "telegram"],
    ["https://wa.me/33612345678", "whatsapp"],
    ["https://open.spotify.com/show/1", "spotify"],
    ["mailto:a@b.co", "email"],
    ["tel:+33600000000", "phone"],
    ["https://monsite.fr", "website"],
    ["https://notinstagram.com.evil.io", "website"],
    ["javascript:alert(1)", "website"],
  ])("%s → %s", (url, platform) => {
    expect(detectPlatform(url)).toBe(platform);
  });

  it("gives a readable default title", () => {
    expect(linkLabel("https://www.instagram.com/atelier/")).toBe("instagram.com/atelier");
    expect(linkLabel("https://monsite.fr")).toBe("monsite.fr");
  });
});

describe("youtubeId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?si=abc", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/live/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ])("%s", (url, id) => {
    expect(youtubeId(url)).toBe(id);
  });

  it("refuses anything that is not a YouTube video", () => {
    expect(youtubeId("https://vimeo.com/123456")).toBeNull();
    expect(youtubeId("https://www.youtube.com/@chaine")).toBeNull();
    expect(youtubeId("https://evil.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(youtubeId("https://www.youtube.com/watch?v=<script>")).toBeNull();
    expect(youtubeId("javascript:alert(1)")).toBeNull();
  });
});

describe("openStatus", () => {
  // Mon–Fri 09:00–18:00, Saturday 10:00–13:00, closed on Sunday.
  const week: WeekHours = Array.from({ length: 7 }, (_, day) => ({
    closed: day === 0,
    open: day === 6 ? "10:00" : "09:00",
    close: day === 6 ? "13:00" : "18:00",
  }));
  // 2026-11-02 is a Monday. Paris is UTC+1 in November.
  const paris = (iso: string) => new Date(`${iso}+01:00`);

  it("is open within the day's hours, in the coach's timezone", () => {
    expect(openStatus(week, "Europe/Paris", paris("2026-11-02T10:30:00"))).toEqual({
      state: "open",
      until: "18:00",
    });
  });

  it("is closed before opening, and says when it opens", () => {
    expect(openStatus(week, "Europe/Paris", paris("2026-11-02T08:15:00"))).toEqual({
      state: "closed",
      next: { weekday: 1, time: "09:00" },
    });
  });

  it("closes at the closing minute", () => {
    expect(openStatus(week, "Europe/Paris", paris("2026-11-02T18:00:00")).state).toBe("closed");
  });

  it("skips closed days to find the next opening", () => {
    // Saturday 2026-11-07 at 14:00: closed until Monday 09:00.
    expect(openStatus(week, "Europe/Paris", paris("2026-11-07T14:00:00"))).toEqual({
      state: "closed",
      next: { weekday: 1, time: "09:00" },
    });
  });

  it("uses the coach's timezone, not the visitor's", () => {
    // 08:30 UTC on Monday is 09:30 in Paris (open) but 03:30 in New York.
    const instant = new Date("2026-11-02T08:30:00Z");
    expect(openStatus(week, "Europe/Paris", instant).state).toBe("open");
    expect(openStatus(week, "America/New_York", instant).state).toBe("closed");
  });

  it("handles hours running past midnight", () => {
    const bar: WeekHours = Array.from({ length: 7 }, () => ({
      closed: false,
      open: "20:00",
      close: "02:00",
    }));
    expect(openStatus(bar, "UTC", new Date("2026-11-03T01:30:00Z"))).toEqual({
      state: "open",
      until: "02:00",
    });
    expect(openStatus(bar, "UTC", new Date("2026-11-03T03:00:00Z")).state).toBe("closed");
  });

  it("is never open when every day is closed", () => {
    const closed = defaultWeek().map((day) => ({ ...day, closed: true }));
    expect(openStatus(closed, "UTC", new Date())).toEqual({ state: "closed", next: null });
  });
});

describe("block suggestions", () => {
  it("puts the trade's blocks first and keeps every other one available", () => {
    const { suggested, others } = blocksFor("hairdresser");
    expect(suggested).toEqual(["gallery", "pricing", "hours", "address"]);
    expect([...suggested, ...others].sort()).toEqual([...BLOCK_TYPES].sort());
  });

  it("matches the trades it was asked for", () => {
    expect(BLOCK_SUGGESTIONS["fitness-coach"]).toEqual(
      expect.arrayContaining(["pricing", "gallery", "reviews"]),
    );
    expect(BLOCK_SUGGESTIONS["real-estate"]).toEqual(
      expect.arrayContaining(["gallery", "stats", "call", "address"]),
    );
    expect(BLOCK_SUGGESTIONS.tutor).toEqual(
      expect.arrayContaining(["pricing", "faq", "reviews", "file"]),
    );
    expect(BLOCK_SUGGESTIONS["content-creator"]).toEqual(
      expect.arrayContaining(["socials", "youtube", "link", "announcement"]),
    );
  });

  it("falls back to a general list for an unknown or missing activity", () => {
    expect(blocksFor(null).suggested.length).toBeGreaterThan(0);
    expect(blocksFor("dog-trainer").suggested).toEqual(blocksFor(null).suggested);
  });

  it("only suggests blocks that exist", () => {
    for (const list of Object.values(BLOCK_SUGGESTIONS)) {
      for (const type of list) expect(BLOCK_TYPES).toContain(type);
    }
  });
});

describe("blocks", () => {
  it("refuses unsafe links and normalises safe ones", () => {
    expect(validateBlock("link", { url: "javascript:alert(1)", title: "x" }).ok).toBe(false);
    const ok = validateBlock("link", { url: "instagram.com/atelier", title: "  " });
    expect(ok).toEqual({ ok: true, config: { url: "https://instagram.com/atelier", title: null } });
  });

  it("only accepts YouTube videos in a video block", () => {
    expect(validateBlock("youtube", { url: "https://vimeo.com/1" }).ok).toBe(false);
    expect(validateBlock("youtube", { url: "https://youtu.be/dQw4w9WgXcQ" }).ok).toBe(true);
  });

  it("caps text lengths", () => {
    const result = validateBlock("text", { title: "x".repeat(81), body: "ok" });
    expect(result).toEqual({ ok: false, errors: { title: "too_long" } });
  });

  it("starts every block from a default the editor can show", () => {
    for (const type of BLOCK_TYPES) {
      expect(defaultConfig(type, { phone: null, whatsapp: null, email: null })).toBeTypeOf(
        "object",
      );
    }
  });

  it("drops stored blocks that do not validate instead of rendering them", () => {
    const blocks = parseBlocks([
      {
        id: "a",
        type: "link",
        config: { url: "https://example.com" },
        visible: true,
        offer_id: null,
      },
      {
        id: "b",
        type: "link",
        config: { url: "javascript:alert(1)" },
        visible: true,
        offer_id: null,
      },
      { id: "c", type: "nope", config: {}, visible: true, offer_id: null },
      { id: "d", type: "divider", config: {}, visible: true, offer_id: null },
    ]);
    expect(blocks.map((block) => block.id)).toEqual(["a", "d"]);
  });
});

describe("themes", () => {
  it("has eight themes whose text reads on their background", () => {
    expect(THEME_IDS).toHaveLength(8);
    for (const id of THEME_IDS) {
      const theme = THEMES[id];
      expect(contrast(theme.text, theme.base), `${id} text`).toBeGreaterThanOrEqual(7);
      expect(contrast(theme.muted, theme.base), `${id} muted`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps any accent readable on every theme", () => {
    for (const accent of ["#ffeb3b", "#f2542d", "#0c0c0d", "#ffffff", "#7c3aed", "#00ff88"]) {
      for (const id of THEME_IDS) {
        const theme = THEMES[id];
        const palette = accentPalette(accent, theme);
        expect(contrast(palette.ink, theme.base), `${accent} ink on ${id}`).toBeGreaterThanOrEqual(
          4.5,
        );
        expect(contrast(palette.on, palette.accent), `${accent} on`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("falls back to the default accent for anything that is not a colour", () => {
    expect(accentPalette("red; background:url(x)", THEMES.classic).accent).toBe("#f2542d");
  });
});

describe("whatsappUrl", () => {
  it("keeps digits only and encodes the message", () => {
    expect(whatsappUrl("+33 6 12 34 56 78", "Bonjour & merci")).toBe(
      "https://wa.me/33612345678?text=Bonjour%20%26%20merci",
    );
  });
});

describe("vCard", () => {
  it("escapes what would break the card and keeps only what was shared", async () => {
    const { buildVcard, vcardFilename } = await import("./vcard");
    const card = buildVcard({
      name: "Durand, Léa; coach",
      title: "Coach\nsportive",
      phone: "+33612345678",
      email: null,
      url: "https://thesessionlink.com/lea",
    });
    expect(card).toContain("FN:Durand\\, Léa\\; coach");
    expect(card).toContain("TITLE:Coach\\nsportive");
    expect(card).toContain("TEL;TYPE=CELL:+33612345678");
    expect(card).not.toContain("EMAIL");
    expect(card.startsWith("BEGIN:VCARD\r\nVERSION:3.0")).toBe(true);
    expect(vcardFilename("lea-martin")).toBe("lea-martin.vcf");
  });
});
