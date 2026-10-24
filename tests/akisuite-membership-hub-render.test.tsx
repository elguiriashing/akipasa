// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AkiSuiteMembershipHub } from "../src/components/AkiSuiteMembershipHub";
vi.mock("@/app/[locale]/account/subscription/akisuite-actions", () => ({
  changeAkiSuiteSubscription: vi.fn(),
}));
vi.mock("@/app/[locale]/account/subscription/actions", () => ({
  openBillingPortal: vi.fn(),
}));
afterEach(cleanup);
const now = Date.parse("2026-10-21T00:00:00Z");
const record = (plan_code: string) => ({
  plan_code,
  status: "active",
  billing_interval: "month",
  current_period_end: "2027-10-21T00:00:00Z",
  cancel_at_period_end: false,
  stripe_subscription_id: "sub_fixture",
});
const base = {
  locale: "en" as const,
  legacy: [],
  suite: [],
  grants: [],
  hasStripeCustomer: false,
  now,
};
const card = (name: string) =>
  document.querySelector(`[data-product="${name}"]`)!;
describe("canonical five-product account membership overview", () => {
  it.each(["en", "es"] as const)(
    "shows correct roles and safe localized handoffs in %s",
    (locale) => {
      render(<AkiSuiteMembershipHub {...base} locale={locale} />);
      for (const product of [
        "akipasa",
        "akiduermo",
        "akicoches",
        "akihq",
        "akibusiness",
      ])
        expect(card(product)).not.toBeNull();
      expect(card("akihq").textContent).toContain(
        locale === "es" ? "Centro gratuito de gestión" : "Free management hub",
      );
      expect(card("akihq").querySelector("a")?.getAttribute("href")).toBe(
        `https://akihq.app/${locale}/business`,
      );
      expect(card("akicoches").querySelector("a")?.getAttribute("href")).toBe(
        `https://akicoches.com/?lang=${locale}`,
      );
      expect(card("akibusiness").textContent).toContain(
        locale === "es"
          ? "Herramientas operativas de pago"
          : "Paid operating tools",
      );
      expect(card("akibusiness").textContent).not.toMatch(
        /Gratis|Free|Activo|Active/,
      );
      expect(card("akibusiness").querySelector("a")?.getAttribute("href")).toBe(
        `https://akibusiness.com/account?locale=${locale}`,
      );
      expect(document.querySelector('a[href*="from=akihq"]')).toBeNull();
      expect(document.querySelector('a[href*="#akihq_standard"]')).toBeNull();
    },
  );
  it("does not claim there is no paid operating subscription from an empty listing ledger", () => {
    render(<AkiSuiteMembershipHub {...base} />);
    expect(
      document.querySelector("#billing-management")?.textContent,
    ).toContain("Review operating subscriptions by location");
    expect(document.body.textContent).not.toContain(
      "No active paid subscriptions on this account",
    );
  });
  it("does not interpret an old listing Premium SKU as an operating licence", () => {
    render(
      <AkiSuiteMembershipHub
        {...base}
        suite={[record("akibusiness_premium")]}
      />,
    );
    expect(card("akipasa").textContent).toContain(
      "Listing Premium benefits in authorised locations",
    );
    expect(card("akibusiness").textContent).toContain(
      "Access is checked for each location",
    );
    expect(card("akibusiness").textContent).not.toContain("Active");
    expect(screen.getByText("AkiPasa Premium (for businesses)")).toBeTruthy();
  });
  it("keeps paid legacy records and renewal/cancel data without advertising retired plans", () => {
    render(
      <AkiSuiteMembershipHub
        {...base}
        hasStripeCustomer
        legacy={[{ ...record("business_pro"), cancel_at_period_end: true }]}
        suite={[record("akihq_standard"), record("aki_enterprise")]}
        planChangesReady
      />,
    );
    expect(screen.getByText("Business Pro (legacy)")).toBeTruthy();
    expect(screen.getByText("AkiHQ Standard (legacy)")).toBeTruthy();
    expect(screen.getByText("Aki Enterprise (legacy)")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Manage billing" })).toBeTruthy();
    expect(
      document.querySelector("#billing-management")?.textContent,
    ).toContain("Ends");
    expect(card("akihq").textContent).toContain("Free management hub");
    expect(document.querySelector('option[value="akihq_pro"]')).toBeNull();
    expect(document.querySelector('option[value="aki_enterprise"]')).toBeNull();
  });
  it("existing personal and accommodation Premium lead to billing rather than acquisition", () => {
    render(
      <AkiSuiteMembershipHub
        {...base}
        suite={[record("akipasa_premium"), record("akiduermo_premium")]}
      />,
    );
    for (const key of ["akipasa", "akiduermo"])
      expect(card(key).querySelector("a")?.getAttribute("href")).toBe(
        "#billing-management",
      );
  });
  it("limits current plan controls to its existing product and keeps paid annual records", () => {
    render(
      <AkiSuiteMembershipHub
        {...base}
        suite={[{ ...record("akiduermo_premium"), billing_interval: "year" }]}
        planChangesReady
      />,
    );
    expect(
      document
        .querySelector('select[name="plan"] option')
        ?.getAttribute("value"),
    ).toBe("akiduermo_premium");
    expect(
      document.querySelectorAll('select[name="plan"] option'),
    ).toHaveLength(1);
    expect(
      document.querySelector('select[name="interval"]')?.getAttribute("name"),
    ).toBe("interval");
    expect(
      document.querySelector("#billing-management")?.textContent,
    ).toContain("Yearly");
  });
  it("does not fabricate an overview when subscription loading failed", () => {
    render(<AkiSuiteMembershipHub {...base} unavailable hasStripeCustomer />);
    expect(document.querySelector('[data-product="akihq"]')).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("couldn't load");
    expect(screen.queryByRole("button", { name: "Manage billing" })).toBeNull();
  });
});
