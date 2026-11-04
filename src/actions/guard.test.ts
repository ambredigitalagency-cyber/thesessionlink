import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Every server action, read from its source: an action that changes a coach's
 * data must go through requireProfileForAction() — which refuses a locked
 * account (grace, expired) — or be on the list below, with the reason it may
 * run without it. A new action that is neither fails this test, so none can
 * be forgotten.
 */

const DIR = path.join(process.cwd(), "src/actions");

/** Not guarded by the subscription, on purpose. */
const EXEMPT: Record<string, string> = {
  // The ways out of a locked account.
  "billing.startSubscriptionCheckout": "subscribing (allowLocked)",
  "billing.openBillingPortal": "the Paddle portal (allowLocked)",
  "settings.deleteAccount": "leaving: marks the account for deletion, nothing else",
  "auth.signOut": "signing out",
  "settings.setLocale": "the language cookie only",
  // Before any profile exists, an account cannot be locked.
  "auth.requestMagicLink": "public: sends a sign-in link",
  "onboarding.chooseCategory": "refuses once a profile exists",
  "onboarding.createIdentity": "creates the profile; a no-op when one exists",
  // Read only.
  "onboarding.checkSlug": "reads whether a link is free",
  "profile.checkSlugAvailability": "reads whether a link is free",
  "search.searchDashboard": "reads the coach's own data",
  "billing.currentAccessState": "reads the caller's own access state",
  // Visitors, not coaches: they check the page itself.
  "public-request.sendPublicRequest": "visitor form; refuses an expired page",
  "public-slug.checkPublicSlug": "visitor: reads whether a link is free",
  // The console: platform admins, behind their own guard.
  "admin-access.enterConsole": "console password",
  "admin-access.leaveConsole": "console password",
};

const ADMIN_GUARD = "requireAdminForAction(";

type Action = { id: string; body: string };

function actions(): Action[] {
  const found: Action[] = [];
  for (const file of readdirSync(DIR).filter(
    (name) => name.endsWith(".ts") && !name.endsWith(".test.ts"),
  )) {
    const source = readFileSync(path.join(DIR, file), "utf8");
    const name = file.replace(/\.ts$/, "");
    const starts = [...source.matchAll(/^export async function (\w+)/gm)];
    starts.forEach((match, index) => {
      const end = starts[index + 1]?.index ?? source.length;
      found.push({ id: `${name}.${match[1]}`, body: source.slice(match.index, end) });
    });
    // Anything exported another way would escape this test.
    expect(source, `${file}: export actions as "export async function"`).not.toMatch(
      /^export const \w+ = async/m,
    );
  }
  return found;
}

describe("server actions and the subscription gate", () => {
  const all = actions();

  it("finds the actions", () => {
    expect(all.length).toBeGreaterThan(40);
  });

  it("guards every action that is not knowingly exempt", () => {
    const unguarded = all.filter((action) => {
      if (EXEMPT[action.id]) return false;
      if (action.id.startsWith("admin.")) return !action.body.includes(ADMIN_GUARD);
      return !/requireProfileForAction\(\)/.test(action.body);
    });
    expect(unguarded.map((action) => action.id)).toEqual([]);
  });

  it("lets only the ways out through a locked account", () => {
    const allowLocked = all
      .filter((action) => action.body.includes("allowLocked: true"))
      .map((action) => action.id);
    expect(allowLocked.sort()).toEqual([
      "billing.openBillingPortal",
      "billing.startSubscriptionCheckout",
    ]);
  });

  it("keeps the exemption list honest: every entry still exists", () => {
    const ids = new Set(all.map((action) => action.id));
    expect(Object.keys(EXEMPT).filter((id) => !ids.has(id))).toEqual([]);
  });

  it("covers the writes on page, offers, sources, settings and the sign-up", () => {
    const guarded = all
      .filter((action) => /requireProfileForAction\(\)/.test(action.body))
      .map((action) => action.id);
    for (const id of [
      "page.addBlock",
      "page.updateBlock",
      "page.confirmBlock",
      "page.setBlockVisible",
      "page.deleteBlock",
      "page.reorderBlocks",
      "page.updateAppearance",
      "page.updatePageProfile",
      "page.updateSlug",
      "offers.createOffer",
      "offers.updateOffer",
      "offers.setOfferActive",
      "offers.deleteOffer",
      "offers.duplicateOffer",
      "offers.reorderOffers",
      "tracking.createSource",
      "tracking.deleteSource",
      "settings.updateSettings",
      "onboarding.publishPage",
      "onboarding.chooseTheme",
    ]) {
      expect(guarded, id).toContain(id);
    }
  });
});
