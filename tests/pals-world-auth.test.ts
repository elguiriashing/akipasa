import { describe, expect, it } from "vitest";
import {
  safeAuthDestination,
  taskFromAuthCallback,
} from "@/lib/auth-security";

describe("restricted World login return", () => {
  for (const locale of ["en", "es"] as const) {
    it(`returns ${locale} sign-in to the exact private World route`, () => {
      expect(safeAuthDestination(locale, "/pals/world")).toBe("/pals/world");
      expect(safeAuthDestination(locale, "/pals")).toBe("/pals");
      expect(
        taskFromAuthCallback(locale, "/pals/world", "https://akipasa.com"),
      ).toBe("/pals/world");
    });
    it(`does not broaden ${locale} external or arbitrary path returns`, () => {
      for (const requested of [
        "//example.invalid/pals/world",
        "https://example.invalid/pals/world",
        "/pals/world-evil",
        "/pals/world/../../admin",
        "/pals/world?next=https://example.invalid",
        "/pals/%77orld",
      ]) {
        expect(safeAuthDestination(locale, requested)).toBe(
          `/${locale}/account`,
        );
      }
    });
  }
});
