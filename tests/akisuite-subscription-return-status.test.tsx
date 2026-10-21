import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/components/SubscriptionRefresh", () => ({
  SubscriptionRefresh: () => null,
}));
vi.mock("@/components/PremiumAdsConversion", () => ({
  PremiumAdsConversion: () => null,
}));
vi.mock("@/components/AkiSuiteMembershipGrid", () => ({
  AkiSuiteMembershipGrid: () => null,
}));
vi.mock("../src/app/[locale]/account/AccountPageHeader", () => ({
  AccountPageHeader: () => null,
}));
vi.mock("../src/app/[locale]/account/subscription/akisuite-actions", () => ({
  changeAkiSuiteSubscription: vi.fn(),
  prepareAkiSuiteWorkspace: vi.fn(),
}));
vi.mock("../src/app/[locale]/account/subscription/actions", () => ({
  openBillingPortal: vi.fn(),
}));
import Page from "../src/app/[locale]/account/subscription/page";
import { requireUser } from "@/lib/auth";
afterEach(() => vi.unstubAllEnvs());
describe("untrusted checkout return is not payment evidence", () => {
  it.each(["en", "es"] as const)(
    "renders pending confirmation for a success query without paid records in %s",
    async (locale) => {
      vi.stubEnv("AKISUITE_SUBSCRIPTIONS_READY", "false");
      const q = {
        select: () => q,
        eq: () => q,
        maybeSingle: async () => ({ data: null, error: null }),
        then: (resolve: (value: unknown) => void) =>
          resolve({ data: [], error: null }),
      };
      vi.mocked(requireUser).mockResolvedValue({
        user: { id: "fixture" },
        supabase: { from: () => q },
      } as never);
      const html = renderToStaticMarkup(
        await Page({
          params: Promise.resolve({ locale }),
          searchParams: Promise.resolve({
            checkout: "success",
            session_id: "cs_untrusted",
          }),
        }),
      );
      expect(html).toContain(
        locale === "es" ? "Has vuelto del pago" : "You returned from checkout",
      );
      expect(html).toContain(
        locale === "es"
          ? "solo se actualiza cuando Stripe confirma el pago"
          : "only after Stripe confirms payment",
      );
      expect(html).not.toMatch(/Pago completado|Checkout completed/);
    },
  );
});
