// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AkiSuiteMembershipGrid } from "../src/components/AkiSuiteMembershipGrid";
import { resolveMembershipHub } from "../src/lib/akisuite-membership";
vi.mock("@/app/[locale]/account/subscription/akisuite-actions", () => ({
  startAkiSuiteCheckout: vi.fn(),
}));
afterEach(cleanup);

describe("real AkiSuite catalogue interactions", () => {
  it.each(["en", "es"] as const)(
    "keeps seven packages visible and toggles the approved annual amounts in %s",
    (locale) => {
      render(
        <AkiSuiteMembershipGrid locale={locale} originatingApp="akiduermo" />,
      );
      expect(screen.getAllByRole("article")).toHaveLength(7);
      expect(screen.getAllByRole("article")[0].textContent).toContain(
        "Aki Enterprise",
      );
      for (const button of document.querySelectorAll(
        "article form button[type=submit]",
      ))
        expect((button as HTMLButtonElement).disabled).toBe(true);
      fireEvent.click(screen.getAllByRole("radio")[1]);
      expect(document.getElementById("aki_enterprise")?.textContent).toContain(
        locale === "es" ? "767,90" : "767.90",
      );
      expect(document.getElementById("akipasa_premium")?.textContent).toContain(
        locale === "es" ? "19,10" : "19.10",
      );
      expect(document.querySelectorAll('[data-origin="true"]')).toHaveLength(1);
      expect(document.querySelector("#akisuite-sector")).not.toBeNull();
    },
  );
  it("indicates Enterprise included benefits without offering another charge", () => {
    render(
      <AkiSuiteMembershipGrid
        locale="en"
        checkoutReady
        activePlans={["aki_enterprise"]}
      />,
    );
    expect(screen.getAllByText("Plan included")).toHaveLength(6);
    expect(
      (document.querySelector(
        "#akipasa_premium form button[type=submit]",
      ) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
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
