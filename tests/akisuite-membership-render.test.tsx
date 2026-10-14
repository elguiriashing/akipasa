// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AkiSuiteMembershipGrid } from "../src/components/AkiSuiteMembershipGrid";
import { startAkiSuiteCheckout } from "@/app/[locale]/account/subscription/akisuite-actions";
import { type AkiSuiteApp } from "../src/lib/akisuite-catalogue";
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
      const checkoutButtons = document.querySelectorAll("article form button");
      for (const button of checkoutButtons)
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
    const personalCheckout = document.querySelector<HTMLButtonElement>(
      "#akipasa_premium form button",
    );
    expect(personalCheckout?.disabled).toBe(true);
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

describe("membership account handoff", () => {
  it.each(["en", "es"] as const)(
    "navigates each public plan to the authenticated hub in %s without posting checkout",
    (locale) => {
      for (const app of [
        "akipasa",
        "akibusiness",
        "akiduermo",
        "akihq",
      ] as const) {
        const view = render(
          <AkiSuiteMembershipGrid
            locale={locale}
            originatingApp={app}
            checkoutReady
            purchaseMode="account"
          />,
        );
        const links = screen.getAllByRole("link", {
          name:
            locale === "es"
              ? "Continuar en mi cuenta"
              : "Continue in my account",
        });
        expect(links).toHaveLength(7);
        for (const link of links)
          expect(link.getAttribute("href")).toBe(
            `/${locale}/account/subscription?from=${app}`,
          );
        expect(document.querySelectorAll("article form")).toHaveLength(0);
        expect(startAkiSuiteCheckout).not.toHaveBeenCalled();
        view.unmount();
      }
    },
  );
  it("allowlists runtime origin values instead of constructing an external return", () => {
    render(
      <AkiSuiteMembershipGrid
        locale="en"
        originatingApp={"https://example.invalid" as AkiSuiteApp}
        checkoutReady
        purchaseMode="account"
      />,
    );
    for (const link of screen.getAllByRole("link"))
      expect(link.getAttribute("href")).toBe(
        "/en/account/subscription?from=akipasa",
      );
  });
  it.each(["en", "es"] as const)(
    "retains closed gates and blocks account workspace purchases until setup in %s",
    (locale) => {
      const publicView = render(
        <AkiSuiteMembershipGrid locale={locale} purchaseMode="account" />,
      );
      expect(screen.queryAllByRole("link")).toHaveLength(0);
      expect(
        screen.getAllByRole("button", {
          name: locale === "es" ? "Disponible próximamente" : "Coming soon",
        }),
      ).toHaveLength(7);
      for (const button of document.querySelectorAll<HTMLButtonElement>(
        "article form button",
      ))
        expect(button.disabled).toBe(true);
      publicView.unmount();
      render(<AkiSuiteMembershipGrid locale={locale} checkoutReady />);
      const workspaceButtons = screen.getAllByRole("button", {
        name:
          locale === "es"
            ? "Prepara un espacio de trabajo"
            : "Prepare a workspace",
      });
      expect(workspaceButtons).toHaveLength(6);
      for (const button of workspaceButtons)
        expect((button as HTMLButtonElement).disabled).toBe(true);
      expect(
        document.querySelector<HTMLButtonElement>(
          "#akipasa_premium form button",
        )?.disabled,
      ).toBe(false);
    },
  );
  it("keeps final account purchases scoped to the selected owned workspace and its access", () => {
    render(
      <AkiSuiteMembershipGrid
        locale="en"
        checkoutReady
        workspaces={[
          { id: "one", name: "One" },
          { id: "two", name: "Two" },
        ]}
        workspacePlans={{ one: ["akihq_pro"] }}
      />,
    );
    expect(
      document.querySelector<HTMLButtonElement>(
        "#akihq_business_addon form button",
      )?.disabled,
    ).toBe(false);
    expect(
      document.querySelector<HTMLInputElement>(
        "#akihq_business_addon input[name=workspaceId]",
      )?.value,
    ).toBe("one");
    fireEvent.click(screen.getByRole("radio", { name: "Two" }));
    expect(
      document.querySelector<HTMLButtonElement>(
        "#akihq_business_addon form button",
      )?.disabled,
    ).toBe(true);
    expect(
      document.querySelector<HTMLButtonElement>("#akihq_pro form button")
        ?.disabled,
    ).toBe(false);
    expect(
      document.querySelector<HTMLInputElement>(
        "#akihq_pro input[name=workspaceId]",
      )?.value,
    ).toBe("two");
    expect(
      document.querySelector("#akipasa_premium input[name=workspaceId]"),
    ).toBeNull();
  });
  it("does not hand off or permit purchase during an access-read failure", () => {
    const view = render(
      <AkiSuiteMembershipGrid
        locale="en"
        checkoutReady
        purchaseMode="account"
        accessUnavailable
      />,
    );
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    for (const button of document.querySelectorAll<HTMLButtonElement>(
      "article form button",
    ))
      expect(button.disabled).toBe(true);
    view.unmount();
    render(
      <AkiSuiteMembershipGrid
        locale="en"
        checkoutReady
        workspaces={[{ id: "one", name: "One" }]}
        accessUnavailable
      />,
    );
    for (const button of document.querySelectorAll<HTMLButtonElement>(
      "article form button",
    ))
      expect(button.disabled).toBe(true);
  });
});
