import { describe, expect, it } from "vitest";

import { blockSchemas } from "@/lib/page/blocks";

import { CATEGORY_THEMES, slugWordFor, themeForCategory, whatsappMessageFor } from "./config";
import { internationalNumber } from "./phone";
import { pendingBlocksFor, planPrimary } from "./primary";
import { claimHref, slugCandidates, slugFromName, slugFromParam, slugShape } from "./slug";
import { canOpen, resolveStep } from "./steps";

describe("steps and resuming", () => {
  const progress = (step: string, categoryId: string | null = null) => ({ step, categoryId });

  it("starts at the trade, then the name and link once a trade is stored", () => {
    expect(resolveStep({ profile: null, progress: null })).toBe("category");
    expect(resolveStep({ profile: null, progress: progress("identity", "c1") })).toBe("identity");
    // A row without a trade (should not exist) is still the first screen.
    expect(resolveStep({ profile: null, progress: progress("identity") })).toBe("category");
  });

  it("is at the main button as long as the page is not published, whatever the row says", () => {
    expect(resolveStep({ profile: { published: false }, progress: null })).toBe("button");
    expect(resolveStep({ profile: { published: false }, progress: progress("done") })).toBe(
      "button",
    );
  });

  it("asks for the look after publishing, then never again", () => {
    expect(resolveStep({ profile: { published: true }, progress: progress("appearance") })).toBe(
      "appearance",
    );
    expect(resolveStep({ profile: { published: true }, progress: progress("done") })).toBe("done");
  });

  it("never sends an account that predates this sign-up back into it", () => {
    expect(resolveStep({ profile: { published: true }, progress: null })).toBe("done");
  });

  it("only lets the link screen go back to the trade", () => {
    expect(canOpen("category", "identity")).toBe(true);
    expect(canOpen("identity", "button")).toBe(false);
    expect(canOpen("button", "appearance")).toBe(false);
    expect(canOpen("appearance", "button")).toBe(false);
  });
});

describe("links", () => {
  it("suggests a link from the name", () => {
    expect(slugFromName("Sara El Amrani")).toBe("sara-el-amrani");
    expect(slugFromName("  Élodie & Co. ")).toBe("elodie-co");
    expect(slugFromName("x".repeat(60))).toHaveLength(40);
  });

  it("tells malformed and reserved links apart", () => {
    expect(slugShape("sara")).toBe("ok");
    expect(slugShape("ab")).toBe("invalid");
    expect(slugShape("-sara")).toBe("invalid");
    expect(slugShape("Sara")).toBe("invalid");
    expect(slugShape("dashboard")).toBe("reserved");
    expect(slugShape("onboarding")).toBe("reserved");
  });

  it("offers alternatives with the trade's word first, all valid and not the one taken", () => {
    const candidates = slugCandidates("sara", "coach");
    expect(candidates.slice(0, 3)).toEqual(["sara-coach", "coach-sara", "sara-2"]);
    expect(candidates).not.toContain("sara");
    expect(candidates.every((slug) => slugShape(slug) === "ok")).toBe(true);
    // A long name still gives links that fit.
    expect(slugCandidates("a".repeat(40), "consulting").every((slug) => slug.length <= 40)).toBe(
      true,
    );
    expect(slugWordFor("fitness-coach", "fr")).toBe("coach");
    expect(slugWordFor("unknown", "en")).toBe("pro");
  });
});

describe("the link chosen on the landing", () => {
  it("rides through the sign-in to the name-and-link screen", () => {
    const href = claimHref("sara-coach");
    expect(href).toBe("/login?intent=signup&next=%2Fonboarding%3Fslug%3Dsara-coach");
    const next = new URL(href, "https://x.co").searchParams.get("next");
    expect(next).toBe("/onboarding?slug=sara-coach");
    expect(slugFromParam(new URL(next!, "https://x.co").searchParams.get("slug"))).toBe(
      "sara-coach",
    );
  });

  it("is dropped when it is not a link a coach could have", () => {
    for (const value of [
      null,
      undefined,
      "",
      "ab",
      "Sara",
      "dashboard",
      "<script>",
      ["sara"],
      42,
    ]) {
      expect(slugFromParam(value)).toBeNull();
    }
  });
});

describe("phone numbers", () => {
  it("adds the country code and drops the trunk zero", () => {
    expect(internationalNumber("MA", "06 12 34 56 78")).toBe("+212612345678");
    expect(internationalNumber("MA", "612345678")).toBe("+212612345678");
    expect(internationalNumber("FR", "06.12.34.56.78")).toBe("+33612345678");
  });

  it("keeps a number that already says its country", () => {
    expect(internationalNumber("MA", "+33 6 12 34 56 78")).toBe("+33612345678");
    expect(internationalNumber("MA", "0033 6 12 34 56 78")).toBe("+33612345678");
  });

  it("refuses what is not a phone number", () => {
    expect(internationalNumber("MA", "")).toBeNull();
    expect(internationalNumber("MA", "1234")).toBeNull();
    expect(internationalNumber("MA", "06 12 ab 56 78")).toBeNull();
    expect(internationalNumber("MA", "+0 612345678")).toBeNull();
    expect(internationalNumber("MA", "+1234567890123456")).toBeNull();
    expect(internationalNumber("XX", "0612345678")).toBeNull();
  });
});

describe("main button", () => {
  const options = { categorySlug: "fitness-coach", offerTitle: "Envoyer un message" };

  it("turns WhatsApp into a WhatsApp block with its message", () => {
    const result = planPrimary(
      { kind: "whatsapp", country: "MA", number: "0612345678", message: "Bonjour" },
      options,
    );
    expect(result).toMatchObject({
      ok: true,
      plan: {
        kind: "whatsapp",
        block: { number: "+212612345678", message: "Bonjour", label: null },
        offerTitle: null,
      },
    });
  });

  it("turns Call into a Call block", () => {
    const result = planPrimary({ kind: "call", country: "FR", number: "0612345678" }, options);
    expect(result).toMatchObject({
      ok: true,
      plan: { kind: "call", block: { number: "+33612345678", label: null } },
    });
  });

  it("turns Message into the offer, with no block config of its own", () => {
    const result = planPrimary({ kind: "message" }, options);
    expect(result).toMatchObject({
      ok: true,
      plan: { kind: "message", block: null, offerTitle: "Envoyer un message" },
    });
  });

  it("turns Link into a Link block, and only for web addresses", () => {
    const ok = planPrimary(
      { kind: "link", url: "maboutique.ma/sara", label: "Ma boutique" },
      options,
    );
    expect(ok).toMatchObject({
      ok: true,
      plan: { kind: "link", block: { url: "https://maboutique.ma/sara", title: "Ma boutique" } },
    });
    for (const url of [
      "javascript:alert(1)",
      "java\tscript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "mailto:a@b.co",
      "tel:+33600000000",
      "localhost",
    ]) {
      expect(planPrimary({ kind: "link", url, label: "x" }, options)).toMatchObject({ ok: false });
    }
    expect(planPrimary({ kind: "link", url: "https://a.co", label: "" }, options)).toMatchObject({
      ok: false,
    });
  });

  it("refuses unknown kinds, bad numbers and oversized input", () => {
    expect(planPrimary({ kind: "email" }, options)).toMatchObject({ ok: false });
    expect(planPrimary({ kind: "call", country: "MA", number: "12" }, options)).toMatchObject({
      ok: false,
      errors: { number: "invalid_phone" },
    });
    expect(
      planPrimary(
        { kind: "whatsapp", country: "MA", number: "0612345678", message: "x".repeat(301) },
        options,
      ),
    ).toMatchObject({ ok: false });
  });

  it("adds the trade's suggested blocks to complete, blank, without the main one", () => {
    const pending = pendingBlocksFor("real-estate", "call");
    expect(pending.map((block) => block.type)).toEqual(["gallery", "stats", "address"]);
    // Nothing invented: every suggested block starts empty, and fails
    // validation until the coach fills it — except hours, a template the
    // coach must still validate explicitly.
    for (const block of pending) {
      expect(blockSchemas[block.type].safeParse(block.config).success).toBe(false);
    }
    expect(pendingBlocksFor("content-creator", "link").map((block) => block.type)).toEqual([
      "socials",
      "youtube",
      "announcement",
    ]);
    expect(pendingBlocksFor(null, "whatsapp").map((block) => block.type)).toEqual([
      "link",
      "socials",
      "text",
    ]);
  });
});

describe("trade defaults", () => {
  it("preselects a theme per trade and a general one otherwise", () => {
    expect(themeForCategory("beauty")).toBe(CATEGORY_THEMES.beauty);
    expect(themeForCategory("other")).toBe("classic");
    expect(themeForCategory(null)).toBe("classic");
  });

  it("words the WhatsApp message for the trade, in the coach's language", () => {
    expect(whatsappMessageFor("hairdresser", "fr")).toMatch(/rendez-vous/);
    expect(whatsappMessageFor("hairdresser", "en")).toMatch(/appointment/);
    expect(whatsappMessageFor("other", "fr")).toMatch(/informations/);
    expect(whatsappMessageFor("photographer", "fr").length).toBeLessThanOrEqual(300);
  });
});
