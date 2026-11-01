// @vitest-environment jsdom

import React from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";

const fixture = vi.hoisted(() => ({
  businessRows: [] as Record<string, unknown>[],
  businessError: null as null | { message: string },
  profile: { app_role: "administrator" } as { app_role: string } | null,
  prestigeData: null as null | {
    enabled: boolean;
    programmes: never[];
    requests: never[];
    fulfilment_enabled: boolean;
  },
  prestigeError: null as null | { message: string },
  featureEnabled: true,
}));
const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  rpc: vi.fn(),
  reviewBusinessApplication: vi.fn(),
  prestigeAdminAction: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not-found");
  },
}));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/passport-prestige", async (original) => ({
  ...(await original<typeof import("../src/lib/passport-prestige")>()),
  prestigeEnabled: () => fixture.featureEnabled,
}));
vi.mock("../src/app/[locale]/admin/business-applications/actions", () => ({
  reviewBusinessApplication: mocks.reviewBusinessApplication,
}));
vi.mock("../src/app/[locale]/admin/passports/prestige/actions", () => ({
  prestigeAdminAction: mocks.prestigeAdminAction,
}));

import BusinessApplicationsPage from "../src/app/[locale]/admin/business-applications/page";
import PrestigeAdminPage from "../src/app/[locale]/admin/passports/prestige/page";

const states = [
  "submitted",
  "under_review",
  "awaiting_payment",
  "active",
  "rejected",
];
const payments = [
  "not_started",
  "pending",
  "paid",
  "trial",
  "waived",
  "failed",
  "cancelled",
];
const labels = {
  en: {
    states: [
      "Waiting for review",
      "Under review",
      "Awaiting payment",
      "Business active",
      "Rejected",
    ],
    payments: [
      "Not required yet",
      "Pending",
      "Paid",
      "Trial",
      "No charge",
      "Needs attention",
      "Cancelled",
    ],
    decision: ["Under review", "Awaiting payment", "Rejected"],
    filter: "Filter Business applications by status",
  },
  es: {
    states: [
      "Pendiente de revisión",
      "En revisión",
      "Pendiente de pago",
      "Negocio activo",
      "Rechazada",
    ],
    payments: [
      "No se requiere todavía",
      "Pendiente",
      "Pagado",
      "Periodo de prueba",
      "Sin cargo",
      "Necesita atención",
      "Cancelado",
    ],
    decision: ["En revisión", "Pendiente de pago", "Rechazada"],
    filter: "Filtrar Solicitudes de negocio por estado",
  },
};
function rows() {
  return payments.map((payment, i) => ({
    id: `00000000-0000-4000-8000-${String(i + 100).padStart(12, "0")}`,
    applicant_id: "00000000-0000-4000-8000-000000000002",
    business_name: `Synthetic business ${i}`,
    contact_name: "Synthetic applicant",
    locality: "Málaga",
    website_url: null,
    message: "Synthetic application for isolated UI testing only.",
    state: states[i % states.length],
    payment_state: payment,
    review_reason: null,
    created_at: "2026-10-31T12:00:00Z",
  }));
}
beforeEach(() => {
  vi.clearAllMocks();
  fixture.businessRows = rows();
  fixture.businessError = null;
  fixture.profile = { app_role: "administrator" };
  fixture.featureEnabled = true;
  fixture.prestigeData = {
    enabled: false,
    programmes: [],
    requests: [],
    fulfilment_enabled: false,
  };
  fixture.prestigeError = null;
  mocks.rpc.mockImplementation(async () => ({
    data: fixture.prestigeData,
    error: fixture.prestigeError,
  }));
  mocks.requireUser.mockImplementation(async () => ({
    user: { id: "00000000-0000-4000-8000-000000000002" },
    supabase: {
      from(table: string) {
        const result = () =>
          table === "profiles"
            ? { data: fixture.profile, error: null }
            : { data: fixture.businessRows, error: fixture.businessError };
        const query = {
          select: () => query,
          eq: () => query,
          order: () => query,
          limit: () => query,
          maybeSingle: async () => result(),
          then: (done: (value: ReturnType<typeof result>) => unknown) =>
            Promise.resolve(result()).then(done),
        };
        return query;
      },
      rpc: mocks.rpc,
    },
  }));
  mocks.reviewBusinessApplication.mockImplementation(() => {
    throw new Error("Mutations forbidden");
  });
  mocks.prestigeAdminAction.mockImplementation(() => {
    throw new Error("Mutations forbidden");
  });
});
afterEach(cleanup);

async function renderBusiness(locale: "en" | "es") {
  return render(
    await BusinessApplicationsPage({
      params: Promise.resolve({ locale }),
      searchParams: Promise.resolve({}),
    }),
  );
}
async function renderPrestige(locale: "en" | "es", page = "7") {
  return render(
    await PrestigeAdminPage({
      params: Promise.resolve({ locale }),
      searchParams: Promise.resolve({ page }),
    }),
  );
}

describe("Admin application display labels preserve actual workflow values", () => {
  it.each(["en", "es"] as const)(
    "localizes badges/payment/filter/decision in %s without changing form payloads",
    async (locale) => {
      const { container } = await renderBusiness(locale);
      const cards = [...container.querySelectorAll("article.catalogue-card")];
      expect(cards).toHaveLength(7);
      cards.forEach((card, i) => {
        expect(card.querySelector(".status-pill")).toHaveTextContent(
          labels[locale].states[i % states.length],
        );
        expect(card.querySelector("dd")).toHaveTextContent(
          labels[locale].payments[i],
        );
        const decision = card.querySelector<HTMLSelectElement>(
          'select[name="state"]',
        )!;
        expect([...decision.options].map((option) => option.value)).toEqual([
          "under_review",
          "awaiting_payment",
          "rejected",
        ]);
        expect(
          [...decision.options].map((option) => option.textContent),
        ).toEqual(labels[locale].decision);
        expect(decision.value).toBe("under_review");
        expect(
          card.querySelector<HTMLInputElement>('input[name="applicationId"]')
            ?.value,
        ).toBe(fixture.businessRows[i].id);
        expect(
          card.querySelector<HTMLInputElement>('input[name="applicantId"]')
            ?.value,
        ).toBe("00000000-0000-4000-8000-000000000002");
        const grants = card.querySelector<HTMLSelectElement>(
          'select[name="grantKind"]',
        )!;
        expect([...grants.options].map((option) => option.value)).toEqual([
          "none",
          "trial_1_month",
          "trial_3_month",
          "waived",
        ]);
        expect(grants.value).toBe("none");
      });
      const filter = screen.getByRole("combobox", {
        name: labels[locale].filter,
      });
      states.forEach((state, i) => {
        expect(
          within(filter).getByRole("option", {
            name: labels[locale].states[i],
          }),
        ).toHaveValue(state);
      });
      expect(mocks.reviewBusinessApplication).not.toHaveBeenCalled();
      expect(mocks.requireUser).toHaveBeenCalledWith(
        locale,
        `/${locale}/admin/business-applications`,
      );
    },
  );
  it.each(["en", "es"] as const)(
    "keeps localized filter selection tied to canonical state in %s",
    async (locale) => {
      const { container } = await renderBusiness(locale);
      fireEvent.change(
        screen.getByRole("combobox", { name: labels[locale].filter }),
        { target: { value: "under_review" } },
      );
      const cards = [...container.querySelectorAll("article.catalogue-card")];
      expect(cards).toHaveLength(2);
      expect(
        cards.map((card) => card.querySelector("h2")?.textContent),
      ).toEqual(["Synthetic business 1", "Synthetic business 6"]);
      expect(mocks.reviewBusinessApplication).not.toHaveBeenCalled();
    },
  );
  it.each(["en", "es"] as const)(
    "withholds stale business rows/forms after a failed read in %s",
    async (locale) => {
      fixture.businessError = { message: "Synthetic private backend detail" };
      const { container } = await renderBusiness(locale);
      expect(
        container.querySelectorAll("form, article.catalogue-card"),
      ).toHaveLength(0);
      expect(screen.getByRole("alert")).not.toHaveTextContent(
        "Synthetic private backend detail",
      );
      expect(
        screen.getByRole("link", {
          name: locale === "es" ? "Reintentar" : "Retry",
        }),
      ).toHaveAttribute("href", `/${locale}/admin/business-applications`);
    },
  );
});

describe("Admin Prestige failed-read recovery remains a safe GET", () => {
  it.each(["en", "es"] as const)(
    "retries its bounded page in %s with all mutation forms withheld",
    async (locale) => {
      fixture.prestigeError = { message: "Synthetic private RPC detail" };
      const { container } = await renderPrestige(locale);
      const retry = screen.getByRole("link", {
        name: locale === "es" ? "Reintentar" : "Retry",
      });
      expect(retry).toHaveAttribute(
        "href",
        `/${locale}/admin/passports/prestige?page=7`,
      );
      expect(screen.getByRole("alert")).toContainElement(retry);
      expect(screen.getByRole("alert")).not.toHaveTextContent(
        "Synthetic private RPC detail",
      );
      expect(container.querySelectorAll("form")).toHaveLength(0);
      expect(mocks.prestigeAdminAction).not.toHaveBeenCalled();
    },
  );
  it.each([
    ["es", "-7", "1"],
    ["en", "999999", "10000"],
    ["es", "https://outside.invalid", "1"],
    ["en", "not-a-number", "1"],
  ] as const)(
    "does not copy unsafe/unbounded page %s/%s to Retry",
    async (locale, page, expected) => {
      fixture.prestigeData = null;
      const { container } = await renderPrestige(locale, page);
      const retry = screen.getByRole("link", {
        name: locale === "es" ? "Reintentar" : "Retry",
      });
      expect(retry).toHaveAttribute(
        "href",
        `/${locale}/admin/passports/prestige?page=${expected}`,
      );
      expect(container.querySelectorAll("form")).toHaveLength(0);
    },
  );
  it.each(["en", "es"] as const)(
    "keeps healthy closed-launch studio behavior unchanged in %s",
    async (locale) => {
      await renderPrestige(locale);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name: locale === "es" ? "Crear borrador" : "Create draft",
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name: locale === "es" ? "Revocar reconocimiento" : "Revoke award",
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          locale === "es" ? "Programa digital:" : "Digital programme:",
          { exact: false },
        ),
      ).toHaveTextContent(
        locale === "es" ? "Cerrado para lanzamiento" : "Closed for launch",
      );
      expect(mocks.prestigeAdminAction).not.toHaveBeenCalled();
    },
  );
  it("keeps the feature gate closed before authentication or private reads", async () => {
    fixture.featureEnabled = false;
    await expect(
      PrestigeAdminPage({
        params: Promise.resolve({ locale: "es" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("not-found");
    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each(["user", "moderator", null])(
    "keeps nonadministrator fixture %s out of the RPC",
    async (role) => {
      fixture.profile = role ? { app_role: role } : null;
      await expect(
        PrestigeAdminPage({
          params: Promise.resolve({ locale: "en" }),
          searchParams: Promise.resolve({}),
        }),
      ).rejects.toThrow("not-found");
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );
});
