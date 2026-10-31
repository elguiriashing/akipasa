// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
const { rpc, memberIdentity, privacyIdentity } = vi.hoisted(() => {
  const rpc = vi.fn();
  return {
    rpc,
    memberIdentity: vi.fn(async () => ({ supabase: { rpc } })),
    privacyIdentity: vi.fn(async () => ({ supabase: { rpc } })),
  };
});
vi.mock("@/lib/auth", () => ({ requireUser: memberIdentity }));
vi.mock("@/lib/passport-prestige-identity", () => ({
  requirePrestigePrivacyIdentity: privacyIdentity,
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not-found");
  },
}));
vi.mock("../src/app/[locale]/passports/prestige/actions", () => ({
  prestigeMemberAction: vi.fn(),
  prestigePrivacyAction: vi.fn(),
}));
import Member from "../src/app/[locale]/passports/prestige/page";
import Privacy from "../src/app/[locale]/privacy/prestige/page";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});
for (const locale of ["en", "es"] as const) {
  for (const [name, page, path, action] of [
    ["member", Member, "passports/prestige", "read"],
    ["privacy", Privacy, "privacy/prestige", "export"],
  ] as const) {
    it(`${locale} ${name} offers localized canonical GET recovery without a mutation`, async () => {
      vi.stubEnv("AKIPASA_PRESTIGE_ENABLED", "true");
      rpc.mockResolvedValue({
        data: null,
        error: { message: "private diagnostic" },
      });
      render(await page({ params: Promise.resolve({ locale }) }));
      const retry = screen.getByRole("link", {
        name: locale === "es" ? "Reintentar" : "Retry",
      });
      expect(screen.getByRole("alert")).toContainElement(retry);
      expect(retry).toHaveAttribute("href", `/${locale}/${path}`);
      expect(retry.closest("form")).toBeNull();
      expect(screen.queryByText(/private diagnostic/)).not.toBeInTheDocument();
      expect(rpc).toHaveBeenCalledExactlyOnceWith("prestige_member", {
        p_action: action,
      });
      if (name === "member")
        expect(memberIdentity).toHaveBeenCalledWith(
          locale,
          `/${locale}/passports/prestige`,
        );
      else expect(privacyIdentity).toHaveBeenCalledWith(locale);
    });
  }
  it(`${locale} null member state has the same safe recovery`, async () => {
    vi.stubEnv("AKIPASA_PRESTIGE_ENABLED", "true");
    rpc.mockResolvedValue({ data: null, error: null });
    render(await Member({ params: Promise.resolve({ locale }) }));
    expect(
      screen.getByRole("link", {
        name: locale === "es" ? "Reintentar" : "Retry",
      }),
    ).toHaveAttribute("href", `/${locale}/passports/prestige`);
  });
}
