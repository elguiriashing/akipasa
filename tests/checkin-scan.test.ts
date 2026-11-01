import { describe, expect, it } from "vitest";
import { verifiedVenueQrPath } from "../src/lib/checkin-scan";

const token = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
describe("verified venue QR navigation", () => {
  it.each([
    "a".repeat(36),
    "-".repeat(36),
    "aaaaaaaaa-bbb-cccc-dddd-eeeeeeeeeeee",
    "aaaaaaaa-bbbbcccc-dddd-eeeeeeeeeeee",
    "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeeg",
    `${token}/extra`,
    `${token}?next=/en/account`,
    `${token}#fragment`,
    encodeURIComponent(`${token}/extra`),
  ])("rejects malformed or injected UUID path %s", (value) => {
    for (const locale of ["en", "es"] as const)
      expect(
        verifiedVenueQrPath(
          `/${locale}/check-in/${value}`,
          "https://akipasa.com",
          locale,
        ),
      ).toBeNull();
  });
  it.each([
    token,
    token.toUpperCase(),
    "00000000-0000-0000-0000-000000000000",
    "ffffffff-ffff-ffff-ffff-ffffffffffff",
  ])("retains canonical UUID variant %s", (value) => {
    for (const locale of ["en", "es"] as const)
      expect(
        verifiedVenueQrPath(
          `/${locale}/check-in/${value}`,
          "https://akipasa.com",
          locale,
        ),
      ).toBe(`/${locale}/check-in/${value}`);
  });
  it("accepts an exact same-origin token", () => {
    expect(
      verifiedVenueQrPath(
        `https://akipasa.com/en/check-in/${token}`,
        "https://akipasa.com",
        "en",
      ),
    ).toBe(`/en/check-in/${token}`);
  });
  it("rejects cross-site, wrong locale and arbitrary QR payloads", () => {
    expect(
      verifiedVenueQrPath(
        `https://evil.example/en/check-in/${token}`,
        "https://akipasa.com",
        "en",
      ),
    ).toBeNull();
    expect(
      verifiedVenueQrPath(`/es/check-in/${token}`, "https://akipasa.com", "en"),
    ).toBeNull();
    expect(
      verifiedVenueQrPath("javascript:alert(1)", "https://akipasa.com", "en"),
    ).toBeNull();
    expect(
      verifiedVenueQrPath("not-a-venue", "https://akipasa.com", "en"),
    ).toBeNull();
  });
  it("rejects fake suffix and parameter injection", () => {
    expect(
      verifiedVenueQrPath(
        `/en/check-in/${token}?redirect=other`,
        "https://akipasa.com",
        "en",
      ),
    ).toBeNull();
    expect(
      verifiedVenueQrPath(
        `/en/check-in/${token}/extra`,
        "https://akipasa.com",
        "en",
      ),
    ).toBeNull();
  });
});
