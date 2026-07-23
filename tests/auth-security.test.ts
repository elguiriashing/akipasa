import { describe, expect, it } from "vitest";
import {
  passwordSchema,
  safeAuthDestination,
  safeExternalUrlSchema,
} from "../src/lib/auth-security";

describe("authentication security", () => {
  it("requires a strong baseline password", () => {
    expect(passwordSchema.safeParse("Short1A").success).toBe(false);
    expect(passwordSchema.safeParse("alllowercase123").success).toBe(false);
    expect(passwordSchema.safeParse("SecureAccount42").success).toBe(true);
  });

  it("prevents external and cross-locale redirect targets", () => {
    expect(safeAuthDestination("es", "https://evil.example")).toBe(
      "/es/account",
    );
    expect(safeAuthDestination("es", "/en/account")).toBe("/es/account");
    expect(safeAuthDestination("es", "/es/community")).toBe("/es/community");
  });

  it("accepts only HTTPS external action links", () => {
    expect(
      safeExternalUrlSchema.safeParse("https://tickets.example/event").success,
    ).toBe(true);
    expect(safeExternalUrlSchema.safeParse("").success).toBe(true);
    expect(
      safeExternalUrlSchema.safeParse("http://tickets.example/event").success,
    ).toBe(false);
    expect(safeExternalUrlSchema.safeParse("javascript:alert(1)").success).toBe(
      false,
    );
    expect(
      safeExternalUrlSchema.safeParse("data:text/html,unsafe").success,
    ).toBe(false);
  });
});
