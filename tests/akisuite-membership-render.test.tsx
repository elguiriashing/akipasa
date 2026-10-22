// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AkiSuiteMembershipGrid } from "../src/components/AkiSuiteMembershipGrid";
import { resolveMembershipHub } from "../src/lib/akisuite-membership";
vi.mock("@/app/[locale]/account/subscription/akisuite-actions", () => ({
  startAkiSuiteCheckout: vi.fn(),
}));
afterEach(cleanup);
describe("canonical free hub and monthly operating catalogue", () => {
  it.each(["en", "es"] as const)(
    "shows approved monthly packages and no historical acquisition in %s",
    (locale) => {
      render(<AkiSuiteMembershipGrid locale={locale} purchaseMode="account" />);
      expect(document.querySelector("#akihq-free")?.textContent).toMatch(
        /Free management|Gestión gratuita/,
      );
      for (const [tier, amount, count] of [
        ["basico", "24", 4],
        ["standard", "44", 8],
        ["pro", "64", 12],
      ] as const) {
        const card = document.querySelector(`#operations-${tier}`)!;
        expect(card.textContent).toContain(amount);
        expect(card.textContent).toContain(`${count}`);
        expect(card.querySelector("form")).toBeNull();
      }
      expect(document.body.textContent).not.toMatch(
        /AkiHQ Standard|AkiHQ Pro|Aki Enterprise|Yearly|Anual|767[.,]90/,
      );
      expect(document.querySelectorAll("[data-offer]")).toHaveLength(5);
      expect(document.querySelector("#akihq-free")?.textContent).toContain(
        locale === "es" ? "gratis tu ficha de AkiPasa" : "free AkiPasa listing",
      );
      expect(
        document.querySelector("#akibusiness_premium")?.textContent,
      ).toContain(locale === "es" ? "PARA AKIHQ" : "FOR AKIHQ");
      expect(
        screen
          .getByRole("link", {
            name: locale === "es" ? "Abrir AkiHQ gratis" : "Open free AkiHQ",
          })
          .getAttribute("href"),
      ).toBe(`https://akihq.app/${locale}/business`);
      expect(
        document.querySelector("#akibusiness_premium")?.textContent,
      ).toContain("Listing Premium");
    },
  );
  it("requires an explicit scope choice when there are multiple locations and retains it in handoff", () => {
    render(
      <AkiSuiteMembershipGrid
        locale="en"
        workspaces={[
          { id: "private-one", name: "One" },
          { id: "private-two", name: "Two" },
        ]}
      />,
    );
    expect(
      screen
        .getAllByRole("link", { name: "Manage operating tools" })[0]
        .getAttribute("href"),
    ).toBe("/en/account/subscription/operations");
    fireEvent.change(
      screen.getByRole("combobox", { name: "Operating location" }),
      { target: { value: "private-two" } },
    );
    for (const link of screen.getAllByRole("link", {
      name: "Manage operating tools",
    }))
      expect(link.getAttribute("href")).toBe(
        "/en/account/subscription/operations?workspace=private-two",
      );
  });
  it("keeps existing listing benefits visible without a duplicate purchase", () => {
    render(
      <AkiSuiteMembershipGrid
        locale="en"
        checkoutReady
        activePlans={["aki_enterprise"]}
      />,
    );
    expect(document.querySelector("#akibusiness_premium form")).toBeNull();
    expect(screen.getByRole("link", { name: "View my access" })).toBeTruthy();
  });
  it("keeps listing checkout gated, scoped and independent of operational prices", () => {
    render(
      <AkiSuiteMembershipGrid
        locale="es"
        checkoutReady
        workspaces={[{ id: "private-one", name: "One" }]}
      />,
    );
    const form = document.querySelector("#akibusiness_premium form")!;
    expect(
      form.querySelector<HTMLInputElement>("input[name=plan]")?.value,
    ).toBe("akibusiness_premium");
    expect(
      form.querySelector<HTMLInputElement>("input[name=interval]")?.value,
    ).toBe("month");
    expect(
      form.querySelector<HTMLInputElement>("input[name=workspaceId]")?.value,
    ).toBe("private-one");
    expect(document.querySelector("#operations-basico form")).toBeNull();
  });
  it("keeps personal launch and failed access closed without a public tool selector", () => {
    render(
      <AkiSuiteMembershipGrid locale="en" checkoutReady accessUnavailable />,
    );
    expect(document.querySelector("#akipasa_premium")).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Access unavailable" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(
      screen.queryByRole("combobox", { name: "Business type" }),
    ).toBeNull();
    expect(document.body.textContent).not.toContain("Tools for your business");
  });
  it("distinguishes staff access and excludes future grants and delinquent subscriptions", () => {
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
