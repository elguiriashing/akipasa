// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AkiSuiteMembershipGrid } from "../src/components/AkiSuiteMembershipGrid";
import { resolveMembershipHub } from "../src/lib/akisuite-membership";
vi.mock("@/app/[locale]/account/subscription/akisuite-actions", () => ({
  startAkiSuiteCheckout: vi.fn(),
}));
afterEach(cleanup);
const business = (locale: "en" | "es") =>
  fireEvent.click(
    screen.getByRole("tab", {
      name: locale === "es" ? "Negocios" : "Business",
    }),
  );

describe("Individual and Business membership separation", () => {
  it.each(["en", "es"] as const)(
    "shows two plans per audience in %s with safe business handoff",
    (locale) => {
      const { container } = render(
        <AkiSuiteMembershipGrid locale={locale} purchaseMode="account" />,
      );
      expect(container.querySelectorAll("[data-offer]")).toHaveLength(2);
      expect(container.querySelector("#personal-free")).not.toBeNull();
      expect(
        container.querySelector("#akipasa_premium button:disabled"),
      ).not.toBeNull();
      business(locale);
      expect(container.querySelectorAll("[data-offer]")).toHaveLength(2);
      expect(container.querySelector("#akihq-free")?.textContent).toContain(
        locale === "es" ? "gestionar gratis" : "managing your free",
      );
      expect(
        container.querySelector("#akibusiness_premium")?.textContent,
      ).toContain(
        locale === "es"
          ? "AkiPasa Premium (para empresas)"
          : "AkiPasa Premium (for businesses)",
      );
      expect(
        container.querySelector("#akibusiness_premium")?.textContent,
      ).toContain(locale === "es" ? "11,99" : "€11.99");
      expect(
        container.querySelector('a[href*="akibusiness.com"]'),
      ).not.toBeNull();
      expect(container.querySelector("[id^=operations-]")).toBeNull();
      expect(
        screen
          .getByRole("link", {
            name: locale === "es" ? /^Abrir AkiHQ gratis/ : /^Open free AkiHQ/,
          })
          .getAttribute("href"),
      ).toBe(`https://akihq.app/${locale}/business`);
    },
  );
  it("keeps AkiDuermo property offers separate from historical personal Premium", () => {
    const { container } = render(
      <AkiSuiteMembershipGrid
        locale="en"
        originatingApp="akiduermo"
        purchaseMode="account"
      />,
    );
    business("en");
    expect(
      container.querySelector("#akiduermo-listing-premium")?.textContent,
    ).toContain("€24.99");
    expect(
      container
        .querySelector("#akiduermo-listing-premium a")
        ?.getAttribute("href"),
    ).toBe("https://akiduermo.com/membership?lang=en");
    expect(
      container.querySelector("#akiduermo-listing-premium form"),
    ).toBeNull();
  });
  it("preserves explicit workspace choice and prevents premature checkout", () => {
    const { container } = render(
      <AkiSuiteMembershipGrid
        locale="en"
        workspaces={[
          { id: "private-one", name: "One" },
          { id: "private-two", name: "Two" },
        ]}
        checkoutReady
      />,
    );
    business("en");
    expect(container.querySelector("input[name=workspaceId]")).toBeNull();
    fireEvent.change(
      screen.getByRole("combobox", { name: "Business location" }),
      { target: { value: "private-two" } },
    );
    const form = container.querySelector("#akibusiness_premium form")!;
    expect(
      form.querySelector<HTMLInputElement>("input[name=workspaceId]")?.value,
    ).toBe("private-two");
    expect(
      form.querySelector<HTMLInputElement>("input[name=plan]")?.value,
    ).toBe("akibusiness_premium");
    expect(
      form.querySelector<HTMLInputElement>("input[name=interval]")?.value,
    ).toBe("month");
    expect(container.querySelector("[id^=operations-] form")).toBeNull();
  });
  it("shows existing entitlement without another purchase", () => {
    const { container } = render(
      <AkiSuiteMembershipGrid
        locale="en"
        checkoutReady
        activePlans={["aki_enterprise"]}
      />,
    );
    business("en");
    expect(container.querySelector("#akibusiness_premium form")).toBeNull();
    expect(screen.getByRole("link", { name: "View my access" })).toBeTruthy();
  });
  it("keeps personal launch and failed reads closed", () => {
    const { container } = render(
      <AkiSuiteMembershipGrid locale="en" checkoutReady accessUnavailable />,
    );
    expect(
      container.querySelector("#akipasa_premium button[disabled]"),
    ).not.toBeNull();
    business("en");
    expect(
      container.querySelector("#akibusiness_premium button[disabled]"),
    ).not.toBeNull();
    expect(container.querySelector("form")).toBeNull();
  });
  it("does not infer access from delinquent or future grants", () => {
    const now = Date.parse("2026-10-12T12:00:00Z");
    const access = resolveMembershipHub(
      [
        {
          plan_code: "premium",
          billing_interval: "month",
          status: "past_due",
          current_period_end: "2026-11-01",
          cancel_at_period_end: false,
        },
      ],
      [],
      [
        { plan_code: "business_pro", grant_kind: "waived", expires_at: null },
        {
          plan_code: "premium",
          grant_kind: "trial",
          starts_at: "2027-01-01",
          expires_at: null,
        },
      ],
      now,
    );
    expect(access.apps.akihq).toBe("pro");
    expect(access.apps.akipasa).toBe(false);
    expect(access.paid).toEqual([]);
  });
});
