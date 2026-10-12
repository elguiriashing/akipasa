import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

describe("AkiSuite checkout activation safeguards", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("refuses checkout until billing and tax gates are enabled", async () => {
    vi.stubEnv("AKISUITE_CHECKOUT_ENABLED", "false");
    vi.stubEnv("AKISUITE_TAX_READY", "false");
    const { startAkiSuiteCheckout } = await import(
      "../src/app/[locale]/account/subscription/akisuite-actions"
    );
    const form = new FormData();
    form.set("locale", "en");
    form.set("plan", "aki_enterprise");
    form.set("interval", "year");
    await expect(startAkiSuiteCheckout(form)).rejects.toThrow(
      "REDIRECT:/en/account/subscription?error=checkout_unavailable",
    );
  });

  it("never trusts unsupported client plan codes", async () => {
    vi.stubEnv("AKISUITE_CHECKOUT_ENABLED", "true");
    vi.stubEnv("AKISUITE_TAX_READY", "true");
    vi.stubEnv("AKISUITE_STRIPE_ACCOUNT_ID", "acct_example");
    const { startAkiSuiteCheckout } = await import(
      "../src/app/[locale]/account/subscription/akisuite-actions"
    );
    const form = new FormData();
    form.set("locale", "es");
    form.set("plan", "free_enterprise_admin");
    form.set("interval", "month");
    await expect(startAkiSuiteCheckout(form)).rejects.toThrow(
      "REDIRECT:/es/account/subscription?error=plan",
    );
  });
});
