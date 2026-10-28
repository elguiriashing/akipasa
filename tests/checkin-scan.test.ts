import { describe, expect, it } from "vitest";
import { verifiedVenueQrPath } from "../src/lib/checkin-scan";

const token = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
describe("verified venue QR navigation", () => {
  it("accepts an exact same-origin token", () => {
    expect(verifiedVenueQrPath(`https://akipasa.com/en/check-in/${token}`, "https://akipasa.com", "en")).toBe(`/en/check-in/${token}`);
  });
  it("rejects cross-site, wrong locale and arbitrary QR payloads", () => {
    expect(verifiedVenueQrPath(`https://evil.example/en/check-in/${token}`, "https://akipasa.com", "en")).toBeNull();
    expect(verifiedVenueQrPath(`/es/check-in/${token}`, "https://akipasa.com", "en")).toBeNull();
    expect(verifiedVenueQrPath("javascript:alert(1)", "https://akipasa.com", "en")).toBeNull();
    expect(verifiedVenueQrPath("not-a-venue", "https://akipasa.com", "en")).toBeNull();
  });
  it("rejects fake suffix and parameter injection", () => {
    expect(verifiedVenueQrPath(`/en/check-in/${token}?redirect=other`, "https://akipasa.com", "en")).toBeNull();
    expect(verifiedVenueQrPath(`/en/check-in/${token}/extra`, "https://akipasa.com", "en")).toBeNull();
  });
});
