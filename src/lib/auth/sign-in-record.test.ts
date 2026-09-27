import { describe, expect, it } from "vitest";

import { describeDevice, ipPrefix, methodFromAccessToken } from "./sign-in-record";

const token = (payload: object) =>
  `x.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.y`;

describe("methodFromAccessToken", () => {
  it("reads the amr claim", () => {
    expect(methodFromAccessToken(token({ amr: [{ method: "oauth", timestamp: 1 }] }))).toBe(
      "google",
    );
    expect(methodFromAccessToken(token({ amr: [{ method: "otp", timestamp: 1 }] }))).toBe(
      "magic_link",
    );
    expect(methodFromAccessToken(token({ amr: [{ method: "magiclink", timestamp: 1 }] }))).toBe(
      "magic_link",
    );
    expect(methodFromAccessToken(token({ amr: [{ method: "password", timestamp: 1 }] }))).toBe(
      "other",
    );
  });

  it("never throws on a bad token", () => {
    expect(methodFromAccessToken(undefined)).toBe("other");
    expect(methodFromAccessToken("not-a-jwt")).toBe("other");
  });
});

describe("describeDevice", () => {
  it("names the browser family and the system, nothing more", () => {
    expect(
      describeDevice(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
      ),
    ).toBe("Chrome · Windows");
    expect(
      describeDevice(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("Safari · iOS");
    expect(
      describeDevice(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36 Edg/140.0",
      ),
    ).toBe("Edge · Windows");
    expect(describeDevice(null)).toBeNull();
    expect(describeDevice("curl/8.0")).toBeNull();
  });
});

describe("ipPrefix", () => {
  it("keeps only the network", () => {
    expect(ipPrefix("203.0.113.7")).toBe("203.0.113.0/24");
    expect(ipPrefix("203.0.113.7, 10.0.0.1")).toBe("203.0.113.0/24");
    expect(ipPrefix("::ffff:203.0.113.7")).toBe("203.0.113.0/24");
    expect(ipPrefix("2001:db8:85a3:8d3:1319:8a2e:370:7348")).toBe("2001:db8:85a3::/48");
    expect(ipPrefix("::1")).toBeNull();
    expect(ipPrefix("")).toBeNull();
    expect(ipPrefix(null)).toBeNull();
  });
});
