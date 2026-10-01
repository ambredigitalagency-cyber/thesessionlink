import { describe, expect, it } from "vitest";

import { config } from "@/proxy";

import { LEGAL_PATHS, legalPathLocale } from "./types";

describe("legalPathLocale", () => {
  it("reads the language each legal URL fixes", () => {
    expect(legalPathLocale("/cgu")).toBe("fr");
    expect(legalPathLocale("/confidentialite")).toBe("fr");
    expect(legalPathLocale("/mentions-legales")).toBe("fr");
    expect(legalPathLocale("/terms")).toBe("en");
    expect(legalPathLocale("/privacy")).toBe("en");
    expect(legalPathLocale("/legal")).toBe("en");
  });

  it("leaves every other path to the cookie", () => {
    expect(legalPathLocale("/")).toBeNull();
    expect(legalPathLocale("/dashboard")).toBeNull();
    expect(legalPathLocale("/cgu/extra")).toBeNull();
    expect(legalPathLocale("/marie-dupont")).toBeNull();
  });

  it("is reached by the proxy on every legal path", () => {
    const paths = Object.values(LEGAL_PATHS).flatMap((byLocale) => Object.values(byLocale));
    for (const path of paths) expect(config.matcher).toContain(path);
  });
});
