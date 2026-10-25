// @vitest-environment jsdom
// Regression: an unavailable subscription must never expose checkout in either membership audience.
// The product selector itself remains usable without granting access.
// Failed billing reads must not enable a payment action.

import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";

const fixture = vi.hoisted(() => ({
  failedTable: "",
  tables: {} as Record<string, unknown>,
  refresh: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireUser: async () => ({
    user: { id: "account-unavailable-fixture", email: "member@example.test" },
    supabase: {
      from: (table: string) => {
        const result = () => ({
          data: fixture.tables[table] ?? null,
          error:
            fixture.failedTable === table
              ? { message: "Disposable failed read" }
              : null,
        });
        const query = {
          select: () => query,
          eq: () => query,
          in: () => query,
          maybeSingle: async () => result(),
          then: (resolve: (value: ReturnType<typeof result>) => unknown) =>
            Promise.resolve(result()).then(resolve),
        };
        return query;
      },
    },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: fixture.refresh }),
  notFound: () => {
    throw new Error("Unexpected invalid locale");
  },
}));

vi.mock("../src/app/[locale]/account/actions", () => ({
  requestAccountDeletion: vi.fn(),
}));
vi.mock("../src/app/[locale]/account/subscription/actions", () => ({
  openBillingPortal: vi.fn(),
  startSubscriptionCheckout: vi.fn(),
}));

import AccountPrivacyPage from "../src/app/[locale]/account/privacy/page";
import SubscriptionPage from "../src/app/[locale]/account/subscription/page";
import { requestAccountDeletion } from "../src/app/[locale]/account/actions";
import {
  openBillingPortal,
  startSubscriptionCheckout,
} from "../src/app/[locale]/account/subscription/actions";

beforeEach(() => {
  window.history.replaceState(null, "", "/en/account/subscription");
  vi.clearAllMocks();
  fixture.failedTable = "";
  fixture.tables = {
    personalisation_settings: { personalisation_enabled: true },
    account_deletion_requests: null,
    profiles: { membership_tier: "premium", business_plan_active: false },
    billing_subscriptions: [
      { plan_code: "premium", billing_interval: "month", status: "active" },
    ],
    staff_billing_grants: [],
    billing_customers: { stripe_customer_id: "cus_disposable" },
  };
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

for (const locale of ["en", "es"] as const) {
  it.each(["personalisation_settings", "account_deletion_requests"])(
    `keeps unknown privacy state out of mutable controls (${locale}, %s)`,
    async (table) => {
      fixture.failedTable = table;
      const { container } = render(
        await AccountPrivacyPage({
          params: Promise.resolve({ locale }),
          searchParams: Promise.resolve({}),
        }),
      );

      expect(screen.getByRole("alert")).toBeVisible();
      if (table === "personalisation_settings") {
        expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
        expect(
          screen.queryByRole("button", {
            name:
              locale === "es"
                ? "Borrar historial de recomendaciones"
                : "Clear recommendation history",
          }),
        ).not.toBeInTheDocument();
        expect(
          container.querySelector('input[name="confirmation"]'),
        ).not.toBeNull();
      } else {
        expect(
          container.querySelector('input[name="confirmation"]'),
        ).toBeNull();
        expect(screen.getByRole("checkbox")).toBeChecked();
      }
      expect(
        screen.getByRole("link", {
          name: locale === "es" ? "Descargar mis datos" : "Download my data",
        }),
      ).toHaveAttribute("href", `/${locale}/account/export`);
      fireEvent.click(
        screen.getByRole("button", {
          name: locale === "es" ? "Reintentar" : "Try again",
        }),
      );
      expect(fixture.refresh).toHaveBeenCalledOnce();
      expect(requestAccountDeletion).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it.each([
    "profiles",
    "billing_subscriptions",
    "staff_billing_grants",
    "billing_customers",
  ])(
    `offers billing recovery before changes when any access read fails (${locale}, %s)`,
    async (table) => {
      fixture.failedTable = table;
      const { container } = render(
        await SubscriptionPage({
          params: Promise.resolve({ locale }),
          searchParams: Promise.resolve({ plan: "premium" }),
        }),
      );
      expect(screen.getByRole("alert")).toBeVisible();
      expect(
        screen.getByRole("heading", {
          name:
            locale === "es"
              ? "Membresía no disponible"
              : "Membership unavailable",
        }),
      ).toBeVisible();
      expect(container.querySelector("form.billing-option")).toBeNull();
      const manage = screen.queryByRole("button", {
        name: locale === "es" ? "Gestionar pago" : "Manage billing",
      });
      if (table === "billing_customers") {
        expect(manage).not.toBeInTheDocument();
      } else {
        expect(manage).toBeVisible();
        expect(
          Object.fromEntries(new FormData(manage!.closest("form")!)),
        ).toEqual({ locale });
      }
      expect(
        screen.getByRole("tablist", {
          name: locale === "es" ? "Tipo de membresía" : "Membership type",
        }),
      ).toBeInTheDocument();
      fireEvent.click(
        screen.getByRole("tab", {
          name: locale === "es" ? "Negocios" : "Business",
        }),
      );
      expect(
        container.querySelector("#akibusiness_premium button:disabled"),
      ).not.toBeNull();
      expect(container.querySelector("#akibusiness_premium form")).toBeNull();
      fireEvent.click(
        screen.getByRole("button", {
          name: locale === "es" ? "Reintentar" : "Try again",
        }),
      );
      expect(fixture.refresh).toHaveBeenCalledOnce();
      expect(startSubscriptionCheckout).not.toHaveBeenCalled();
      expect(openBillingPortal).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    },
  );
}

it("keeps locked personal Premium hidden after successful billing reads", async () => {
  fixture.tables.profiles = { membership_tier: "free" };
  fixture.tables.billing_subscriptions = [];
  fixture.tables.billing_customers = null;
  render(
    await SubscriptionPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({ plan: "premium" }),
    }),
  );
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(
    screen.getByRole("tablist", { name: "Membership type" }),
  ).toBeInTheDocument();
  const lockedPersonal = screen
    .getByRole("heading", { name: "AkiPasa Premium (for individuals)" })
    .closest("article")!;
  expect(
    within(lockedPersonal).getByRole("button", { name: "Not available yet" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("tab", { name: "Business" }));
  const card = screen
    .getByRole("heading", { name: "AkiPasa Premium (for businesses)" })
    .closest("article")!;
  const form = within(card)
    .getByRole("button", { name: "Coming soon" })
    .closest("form")!;
  expect(Object.fromEntries(new FormData(form))).toEqual({
    locale: "en",
    plan: "akibusiness_premium",
    interval: "month",
  });
  expect(startSubscriptionCheckout).not.toHaveBeenCalled();
});
