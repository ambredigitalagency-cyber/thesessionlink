import { describe, expect, it } from "vitest";

import { exportFilename, toCsv } from "./export";

describe("toCsv", () => {
  it("writes a header, quotes what needs quoting, and starts with a BOM", () => {
    const csv = toCsv(
      [
        { name: "Léa", note: 'Dit "bonjour"', tags: ["VIP", "trail"], empty: null },
        { name: "Karim, Benali", note: "ligne 1\nligne 2", tags: [], empty: undefined },
      ],
      ["name", "note", "tags", "empty"],
    );
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.slice(1).split("\r\n")).toEqual([
      "name,note,tags,empty",
      'Léa,"Dit ""bonjour""","[""VIP"",""trail""]",',
      '"Karim, Benali","ligne 1\nligne 2",[],',
      "",
    ]);
  });
});

describe("exportFilename", () => {
  it("names the coach, the content and the day", () => {
    expect(exportFilename("atelier-sofia", "offers", "csv", new Date("2026-09-28T10:00:00Z"))).toBe(
      "export-atelier-sofia-offers-2026-09-28.csv",
    );
  });
});
