import { describe, expect, it } from "vitest";

import { firstName, renderReminderMessage } from "./reminder-text";

const values = { client: "Julie", offer: "Séance individuelle", time: "mardi 14 octobre à 18:00" };

describe("renderReminderMessage", () => {
  it("fills the three tokens, as often as they appear", () => {
    expect(
      renderReminderMessage("Bonjour {client} ! {offer}, {time}. À {time} donc.", values),
    ).toBe(
      "Bonjour Julie ! Séance individuelle, mardi 14 octobre à 18:00. À mardi 14 octobre à 18:00 donc.",
    );
  });

  it("leaves any other brace as typed", () => {
    expect(renderReminderMessage("Code porte {1234} — {Client}", values)).toBe(
      "Code porte {1234} — {Client}",
    );
  });

  it("has nothing to say for an empty message", () => {
    expect(renderReminderMessage(null, values)).toBeNull();
    expect(renderReminderMessage("   ", values)).toBeNull();
  });
});

describe("firstName", () => {
  it("keeps the first word of the name", () => {
    expect(firstName("  Julie  Martin ")).toBe("Julie");
    expect(firstName("Karim")).toBe("Karim");
  });
});
