import { describe, expect, it, vi } from "vitest";
import { akiSuiteMembershipReturnPath } from "../src/lib/akisuite-catalogue";
const fixture = vi.hoisted(() => ({
  next: null as string | null,
  requireUser: vi.fn(async () => {
    throw new Error("sign in required");
  }),
}));
vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers(
      fixture.next ? { "x-akipasa-membership-next": fixture.next } : {},
    ),
}));
vi.mock("@/lib/auth", () => ({ requireUser: fixture.requireUser }));
vi.mock("@/components/WorkspaceShell", () => ({ WorkspaceShell: () => null }));
import AccountLayout from "../src/app/[locale]/account/layout";
describe("membership authentication return path", () => {
  for (const locale of ["en", "es"] as const)
    for (const app of ["akipasa", "akibusiness", "akiduermo", "akihq"]) {
      it(`keeps ${locale} ${app} through the parent layout`, async () => {
        fixture.next = `/${locale}/account/subscription?from=${app}`;
        await expect(
          AccountLayout({
            children: null,
            params: Promise.resolve({ locale }),
          }),
        ).rejects.toThrow("sign in required");
        expect(fixture.requireUser).toHaveBeenLastCalledWith(
          locale,
          fixture.next,
        );
      });
    }
  it("rejects external, wrong-locale and unrelated destinations", () => {
    for (const candidate of [
      "//attacker.example/en/account/subscription",
      "https://attacker.example/en/account/subscription",
      "/es/account/subscription",
      "/en/account/settings",
    ])
      expect(akiSuiteMembershipReturnPath("en", candidate)).toBe("/en/account");
  });
});
