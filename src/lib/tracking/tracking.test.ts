import { describe, expect, it } from "vitest";

import { THEME_IDS, contrast } from "@/lib/page/themes";

import { QR_MIN_CONTRAST, qrColors, trackingUrl } from "./qr";
import { classifyInApp, classifyReferrer, parseSrc, resolveSource } from "./sources";
import { insight, isEmpty, parseStats, rate, variation, type PageStats } from "./stats";
import { deviceOf, geoFrom, isBot, visitorHash } from "./visitor";

const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
const SAFARI_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const CHROME_DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

describe("?src=", () => {
  it("keeps a slug and lowercases it", () => {
    expect(parseSrc("instagram")).toBe("instagram");
    expect(parseSrc("QR-Flyer")).toBe("qr-flyer");
    expect(parseSrc("a".repeat(30))).toBe("a".repeat(30));
  });

  it("ignores anything that is not a short slug", () => {
    for (const value of [
      "",
      "a".repeat(31),
      "insta gram",
      "<script>",
      "café",
      "a/b",
      "src=1&x",
      null,
    ]) {
      expect(parseSrc(value), String(value)).toBeNull();
    }
  });
});

describe("source classification", () => {
  it.each([
    ["https://l.instagram.com/?u=x", "instagram"],
    ["https://www.instagram.com/", "instagram"],
    ["https://m.facebook.com/", "facebook"],
    ["https://lm.facebook.com/l.php", "facebook"],
    ["https://www.tiktok.com/@x", "tiktok"],
    ["https://www.youtube.com/watch?v=1", "youtube"],
    ["https://www.google.fr/", "google"],
    ["https://www.google.co.uk/", "google"],
    ["https://web.whatsapp.com/", "whatsapp"],
    ["https://www.linkedin.com/feed/", "linkedin"],
    ["https://t.co/abc", "x"],
    ["https://monblog.fr/article", "web"],
    ["https://notinstagram.com.evil.io/", "web"],
  ])("referrer %s → %s", (referrer, source) => {
    expect(classifyReferrer(referrer)).toBe(source);
  });

  it("ignores its own pages and anything that is not a web page", () => {
    expect(
      classifyReferrer("https://thesessionlink.com/lea?offer=1", "thesessionlink.com"),
    ).toBeNull();
    expect(classifyReferrer("android-app://com.google.android.gm/")).toBeNull();
    expect(classifyReferrer("not a url")).toBeNull();
    expect(classifyReferrer(null)).toBeNull();
  });

  it("recognises in-app browsers that send no referrer", () => {
    expect(classifyInApp(`${SAFARI_IPHONE} Instagram 352.0.0.37.106`)).toBe("instagram");
    expect(classifyInApp(`${SAFARI_IPHONE} [FBAN/FBIOS;FBAV/482.0]`)).toBe("facebook");
    expect(classifyInApp(`${CHROME_ANDROID} musical_ly_2023.1 BytedanceWebview`)).toBe("tiktok");
    expect(classifyInApp(SAFARI_IPHONE)).toBeNull();
  });

  it("trusts ?src= first, then the referrer, then the app, else direct", () => {
    expect(
      resolveSource({
        src: "qr-flyer",
        referrer: "https://google.com/",
        userAgent: CHROME_DESKTOP,
      }),
    ).toBe("qr-flyer");
    expect(resolveSource({ src: "no way!", referrer: "https://google.com/" })).toBe("google");
    expect(resolveSource({ userAgent: `${SAFARI_IPHONE} Instagram 352` })).toBe("instagram");
    expect(resolveSource({ userAgent: SAFARI_IPHONE })).toBe("direct");
  });
});

describe("visitor code", () => {
  const base = { secret: "s3cret", ip: "203.0.113.7", userAgent: CHROME_DESKTOP, profileId: "p1" };

  it("is stable within a day", () => {
    const morning = visitorHash({ ...base, now: new Date("2026-11-02T06:00:00Z") });
    const evening = visitorHash({ ...base, now: new Date("2026-11-02T23:59:00Z") });
    expect(morning).toBe(evening);
    expect(morning).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes the next day, on another page, and with another secret", () => {
    const today = visitorHash({ ...base, now: new Date("2026-11-02T12:00:00Z") });
    expect(visitorHash({ ...base, now: new Date("2026-11-03T12:00:00Z") })).not.toBe(today);
    expect(
      visitorHash({ ...base, profileId: "p2", now: new Date("2026-11-02T12:00:00Z") }),
    ).not.toBe(today);
    expect(
      visitorHash({ ...base, secret: "other", now: new Date("2026-11-02T12:00:00Z") }),
    ).not.toBe(today);
  });

  it("does not contain the IP", () => {
    expect(visitorHash(base)).not.toContain("203");
  });
});

describe("robots and devices", () => {
  it.each([
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "WhatsApp/2.23.20.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36",
    "curl/8.4.0",
    "python-requests/2.31.0",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2)",
    "",
  ])("%s is a robot", (userAgent) => {
    expect(isBot(userAgent)).toBe(true);
  });

  it("lets real browsers through", () => {
    for (const userAgent of [
      CHROME_ANDROID,
      SAFARI_IPHONE,
      CHROME_DESKTOP,
      `${SAFARI_IPHONE} Instagram 352`,
    ]) {
      expect(isBot(userAgent)).toBe(false);
    }
  });

  it("tells phones, tablets and computers apart", () => {
    expect(deviceOf(CHROME_ANDROID)).toBe("mobile");
    expect(deviceOf(SAFARI_IPHONE)).toBe("mobile");
    expect(deviceOf("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15")).toBe(
      "tablet",
    );
    expect(
      deviceOf(
        "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/131 Safari/537.36",
      ),
    ).toBe("tablet");
    expect(deviceOf(CHROME_DESKTOP)).toBe("desktop");
  });

  it("only trusts well-formed geolocation headers", () => {
    const headers = new Headers({
      "x-vercel-ip-country": "fr",
      "x-vercel-ip-city": "Saint-%C3%89tienne",
    });
    expect(geoFrom(headers)).toEqual({ country: "FR", city: "Saint-Étienne" });
    expect(
      geoFrom(new Headers({ "x-vercel-ip-country": "FRA", "x-vercel-ip-city": "%3Cscript%3E" })),
    ).toEqual({
      country: null,
      city: null,
    });
  });
});

function stats(patch: Partial<PageStats>): PageStats {
  return parseStats({
    days: 30,
    totals: { views: 0, clicks: 0, contacts: 0 },
    previous: { views: 0, clicks: 0, contacts: 0 },
    ...patch,
  });
}

describe("aggregations", () => {
  it("computes change and rates, without dividing by nothing", () => {
    expect(variation(150, 100)).toBe(50);
    expect(variation(50, 100)).toBe(-50);
    expect(variation(10, 0)).toBeNull();
    expect(rate(30, 120)).toBe(25);
    expect(rate(3, 0)).toBeNull();
  });

  it("reads numbers the database sends as strings", () => {
    const parsed = parseStats({
      totals: { views: "12", clicks: 5, contacts: null },
      sources: [{ source: "x", views: "3" }],
    });
    expect(parsed.totals).toEqual({ views: 12, clicks: 5, contacts: 0 });
    expect(parsed.sources[0]).toEqual({ source: "x", views: 3, contacts: 0 });
    expect(isEmpty(parseStats({}))).toBe(true);
  });

  it("says where visits come from when one source clearly leads", () => {
    const result = insight(
      stats({
        totals: { views: 100, clicks: 20, contacts: 5 },
        sources: [
          { source: "instagram", views: 70, contacts: 4 },
          { source: "direct", views: 30, contacts: 1 },
        ],
      }),
    );
    expect(result).toEqual({ key: "topSource", source: "instagram", share: 70 });
  });

  it("reports a marked change only on numbers that mean something", () => {
    expect(
      insight(
        stats({
          totals: { views: 30, clicks: 0, contacts: 0 },
          previous: { views: 20, clicks: 0, contacts: 0 },
        }),
      ),
    ).toEqual({ key: "visitsUp", change: 50 });
    // 3 visits after 1 is +200 %, and says nothing.
    expect(
      insight(
        stats({
          totals: { views: 3, clicks: 0, contacts: 0 },
          previous: { views: 1, clicks: 0, contacts: 0 },
        }),
      ),
    ).toEqual({ key: "firstVisits", views: 3 });
  });

  it("has nothing to say about an empty period", () => {
    expect(insight(stats({}))).toBeNull();
  });
});

describe("QR codes", () => {
  it("keep the coach's colour when it scans", () => {
    const { fg, bg, branded } = qrColors("#7c3aed", "classic");
    expect(branded).toBe(true);
    expect(fg).not.toBe("#000000");
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(QR_MIN_CONTRAST);
  });

  it("always scan: dark modules on white, whatever the accent and theme", () => {
    for (const accent of ["#ffeb3b", "#ffffff", "#00ff88", "#f2542d", "#0c0c0d"]) {
      for (const theme of THEME_IDS) {
        const { fg, bg } = qrColors(accent, theme);
        expect(bg).toBe("#ffffff");
        expect(contrast(fg, bg), `${accent} on ${theme}`).toBeGreaterThanOrEqual(QR_MIN_CONTRAST);
      }
    }
  });

  it("carry the source in the link", () => {
    expect(trackingUrl("https://thesessionlink.com", "lea", "qr-flyer")).toBe(
      "https://thesessionlink.com/lea?src=qr-flyer",
    );
  });
});
