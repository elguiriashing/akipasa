// @vitest-environment jsdom
import React, { type ComponentProps } from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

const state = vi.hoisted(() => ({
  failed: "",
  rows: {} as Record<string, unknown>,
  from: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  requireUser: async () => ({
    user: { id: "operator" },
    supabase: { from: state.from, rpc: state.rpc },
  }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw Error("not-found");
  },
  usePathname: () => "/en/admin",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/link", () => ({
  default: (props: ComponentProps<"a">) => <a {...props} />,
}));
vi.mock("../src/app/[locale]/admin/actions", () => ({
  saveCategory: vi.fn(),
  saveCity: vi.fn(),
  updateFeatureFlag: vi.fn(),
  updateDeletionRequest: vi.fn(),
  createPassport: vi.fn(),
  createFeatureSlot: vi.fn(),
  updatePromotion: vi.fn(),
}));
vi.mock("../src/app/[locale]/admin/business-applications/actions", () => ({
  reviewBusinessApplication: vi.fn(),
}));

import { updateDeletionRequest } from "../src/app/[locale]/admin/actions";

import CataloguePage from "../src/app/[locale]/admin/catalogue/page";
import SettingsPage from "../src/app/[locale]/admin/settings/page";
import PrivacyPage from "../src/app/[locale]/admin/privacy/page";
import AuditPage from "../src/app/[locale]/admin/audit/page";
import ApplicationsPage from "../src/app/[locale]/admin/business-applications/page";
import PersonalisationPage from "../src/app/[locale]/admin/personalisation/page";
import PromotionsPage from "../src/app/[locale]/admin/promotions/page";
import PassportsPage from "../src/app/[locale]/admin/passports/page";

beforeEach(() => {
  state.failed = "";
  state.rows = {};
  state.rpc.mockResolvedValue({ data: null, error: null });
  state.from.mockImplementation((table: string) => {
    const result = {
      data:
        table === "profiles"
          ? { app_role: "administrator" }
          : state.rows[table] || [],
      error:
        state.failed === table ? { message: "Private internal failure" } : null,
    };
    const query = {
      select: () => query,
      order: () => query,
      limit: () => query,
      eq: () => query,
      in: () => query,
      maybeSingle: () => Promise.resolve(result),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve(result).then(resolve),
    };
    return query;
  });
});
afterEach(cleanup);

const pages = [
  {
    page: CataloguePage,
    table: "categories",
    path: "catalogue?section=categories",
  },
  {
    page: CataloguePage,
    table: "cities",
    path: "catalogue?section=cities",
    section: "cities",
  },
  { page: SettingsPage, table: "feature_flags", path: "settings" },
  { page: PrivacyPage, table: "account_deletion_requests", path: "privacy" },
  { page: AuditPage, table: "moderation_actions", path: "audit" },
  {
    page: ApplicationsPage,
    table: "business_applications",
    path: "business-applications",
  },
];

it.each(
  pages.flatMap((item) =>
    (["en", "es"] as const).map((locale) => ({ ...item, locale })),
  ),
)(
  "$locale $table failure is unavailable, hides decisions and preserves Retry",
  async ({ page, table, path, section, locale }) => {
    state.failed = table;
    render(
      await page({
        params: Promise.resolve({ locale }),
        searchParams: Promise.resolve({ section }),
      }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      locale === "es" ? "no está disponible" : "unavailable",
    );
    expect(
      screen.getByRole("link", {
        name: locale === "es" ? "Reintentar" : "Retry",
      }),
    ).toHaveAttribute("href", `/${locale}/admin/${path}`);
    expect(document.querySelector("form")).toBeNull();
    expect(screen.queryByText("Private internal failure")).toBeNull();
  },
);

it.each(["en", "es"] as const)(
  "shows %s category save acknowledgement and successful empty creation",
  async (locale) => {
    render(
      await CataloguePage({
        params: Promise.resolve({ locale }),
        searchParams: Promise.resolve({ updated: "1" }),
      }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      locale === "es" ? "guardado" : "saved",
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(
      screen.getByRole("button", {
        name: locale === "es" ? "Nueva categoría" : "New category",
      }),
    ).toBeEnabled();
  },
);

it.each(["en", "es"] as const)(
  "keeps %s passport creation available when only the campaign list fails",
  async (locale) => {
    state.failed = "passports";
    render(
      await PassportsPage({
        params: Promise.resolve({ locale }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByRole("alert")).toBeVisible();
    expect(
      screen.getByText(locale === "es" ? "Crear pasaporte" : "Create passport"),
    ).toBeVisible();
    expect(
      screen.queryByText(
        locale === "es" ? "Campañas de pasaporte" : "Passport campaigns",
      ),
    ).not.toBeInTheDocument();
  },
);

it.each(["en", "es"] as const)(
  "hides %s passport creation when published venues cannot be confirmed",
  async (locale) => {
    state.failed = "venues";
    render(
      await PassportsPage({
        params: Promise.resolve({ locale }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      locale === "es" ? "locales publicados" : "Published venues",
    );
    expect(
      screen.queryByText(
        locale === "es" ? "Crear pasaporte" : "Create passport",
      ),
    ).not.toBeInTheDocument();
    expect(document.querySelector(".admin-search-list")).toHaveAttribute(
      "aria-label",
      locale === "es" ? "Campañas de pasaporte" : "Passport campaigns",
    );
  },
);

it.each(["en", "es"] as const)(
  "does not turn a failed %s personalisation read into zero metrics or a migration diagnosis",
  async (locale) => {
    state.rpc.mockResolvedValue({
      data: null,
      error: { message: "Private RPC failure" },
    });
    render(await PersonalisationPage({ params: Promise.resolve({ locale }) }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      locale === "es" ? "No se pudieron cargar" : "could not be loaded",
    );
    expect(
      screen.getByRole("link", {
        name: locale === "es" ? "Reintentar" : "Retry",
      }),
    ).toHaveAttribute("href", `/${locale}/admin/personalisation`);
    expect(
      screen.queryByText(
        locale === "es" ? "Perfiles de gusto" : "Taste profiles",
      ),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/migration|migración/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Private RPC failure")).not.toBeInTheDocument();
  },
);

it.each(["en", "es"] as const)(
  "keeps confirmed zero %s personalisation metrics and an absent ranking truthful",
  async (locale) => {
    state.rpc.mockResolvedValue({
      error: null,
      data: {
        behaviour_events: 0,
        anonymous_events: 0,
        preference_profiles: 0,
        recommendation_requests: 0,
        average_latency_ms: 0,
        fallback_requests: 0,
        impressions: 0,
        opens: 0,
        skips: 0,
        quick_exits: 0,
        saves: 0,
        going: 0,
        directions: 0,
        verified_check_ins: 0,
        not_interested: 0,
        active_ranking: null,
      },
    });
    render(await PersonalisationPage({ params: Promise.resolve({ locale }) }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        locale === "es" ? "Perfiles de gusto" : "Taste profiles",
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        locale === "es"
          ? "No hay una configuración de ranking activa."
          : "No active ranking configuration.",
      ),
    ).toBeVisible();
    expect(screen.queryByText(/weighted_ranker/)).not.toBeInTheDocument();
  },
);

it.each(["en", "es"] as const)(
  "shows %s configuration mutation failure independently of successful reads",
  async (locale) => {
    render(
      await SettingsPage({
        params: Promise.resolve({ locale }),
        searchParams: Promise.resolve({ error: "invalid" }),
      }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      locale === "es" ? "guardar" : "saved",
    );
  },
);

it.each(["en", "es"] as const)(
  "%s privacy status labels preserve request action values and safeguards",
  async (locale) => {
    const action = vi.mocked(updateDeletionRequest);
    action.mockReset();
    state.from.mockImplementation(() => {
      const result = {
        data: [
          {
            id: "synthetic-request",
            profile_id: "synthetic-profile",
            state: "requested",
            profiles: { display_name: "Synthetic privacy request" },
          },
        ],
        error: null,
      };
      const query = {
        select: () => query,
        in: () => query,
        order: () => query,
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve(result).then(resolve),
      };
      return query;
    });
    render(
      await PrivacyPage({
        params: Promise.resolve({ locale }),
        searchParams: Promise.resolve({}),
      }),
    );
    const detail = document.querySelector("details")!;
    detail.open = true;
    const select = screen.getByRole("combobox", {
      name: locale === "es" ? "Estado" : "State",
    });
    expect(
      Array.from(select.querySelectorAll("option"), (option) => [
        option.value,
        option.textContent,
      ]),
    ).toEqual([
      ["processing", locale === "es" ? "En proceso" : "Processing"],
      ["completed", locale === "es" ? "Completada" : "Completed"],
      ["cancelled", locale === "es" ? "Cancelada" : "Cancelled"],
    ]);
    const reason = screen.getByRole("textbox", {
      name: locale === "es" ? "Motivo y registro" : "Reason and record",
    });
    expect(reason).toBeRequired();
    expect(reason).toHaveAttribute("minlength", "10");
    const confirmation = screen.getByRole("checkbox");
    expect(confirmation).toHaveAttribute("name", "confirmedDeleted");
    expect(confirmation).not.toBeChecked();
    fireEvent.change(reason, {
      target: { value: "Synthetic fixture review only" },
    });
    fireEvent.submit(select.closest("form")!);
    await waitFor(() => expect(action).toHaveBeenCalledOnce());
    const data = action.mock.calls[0][0] as FormData;
    expect(data.get("state")).toBe("processing");
    expect(data.get("requestId")).toBe("synthetic-request");
    expect(data.get("locale")).toBe(locale);
    expect(data.get("confirmedDeleted")).toBeNull();
  },
);

it.each(["en", "es"] as const)(
  "%s promotion read failures are truthful and independently recoverable",
  async (locale) => {
    for (const table of ["promotion_requests", "feature_slots", "events"]) {
      state.failed = table;
      const view = render(
        await PromotionsPage({
          params: Promise.resolve({ locale }),
          searchParams: Promise.resolve({ error: "untrusted-query" }),
        }),
      );
      expect(screen.getByRole("alert")).toHaveTextContent(
        locale === "es" ? "no está disponible" : "unavailable",
      );
      expect(
        screen.getByRole("link", {
          name: locale === "es" ? "Reintentar" : "Retry",
        }),
      ).toHaveAttribute("href", `/${locale}/admin/promotions`);
      expect(screen.queryByText("Private internal failure")).toBeNull();
      const counts = [
        ...document.querySelectorAll(".workspace-stat strong"),
      ].map((x) => x.textContent);
      expect(counts).toEqual([
        table === "promotion_requests" ? "—" : "0",
        table === "feature_slots" ? "—" : "0",
      ]);
      expect(
        document.querySelector('form select[name="eventId"]') !== null,
      ).toBe(table !== "events");
      view.unmount();
    }
  },
);

it.each(["en", "es"] as const)(
  "%s promotion failures preserve healthy lists and independent editors",
  async (locale) => {
    state.rows = {
      promotion_requests: [
        {
          id: "ordinary",
          venue_id: "venue",
          service: "event_promotion",
          state: "new",
          venues: { name: "Ordinary fixture" },
          events: null,
          feature_slots: null,
        },
        {
          id: "featured",
          venue_id: "venue",
          event_id: "event",
          service: "featured_listing",
          state: "contacted",
          venues: { name: "Featured fixture" },
          events: null,
          feature_slots: {
            starts_at: "2026-10-30T20:00:00Z",
            ends_at: "2026-10-31T01:00:00Z",
          },
        },
      ],
      feature_slots: [
        {
          id: "slot",
          event_id: "event",
          label_en: "Fixture slot",
          label_es: "Destacado de prueba",
          starts_at: "2026-10-30T20:00:00Z",
          ends_at: "2026-10-31T01:00:00Z",
        },
      ],
      events: [
        {
          id: "event",
          venue_id: "venue",
          title_en: "Fixture event",
          title_es: "Evento de prueba",
        },
      ],
    };
    for (const table of ["promotion_requests", "feature_slots", "events"]) {
      state.failed = table;
      const view = render(
        await PromotionsPage({
          params: Promise.resolve({ locale }),
          searchParams: Promise.resolve({}),
        }),
      );
      for (const detail of document.querySelectorAll("details"))
        detail.open = true;
      const formIds = [
        ...document.querySelectorAll('form input[name="requestId"]'),
      ].map((x) => x.getAttribute("value"));
      expect(formIds).toEqual(
        table === "promotion_requests"
          ? []
          : table === "events"
            ? ["ordinary"]
            : ["ordinary", "featured"],
      );
      expect(
        document.querySelector(
          'form input[name="startsAt"][type="datetime-local"]',
        ) !== null,
      ).toBe(table !== "events");
      const counts = [
        ...document.querySelectorAll(".workspace-stat strong"),
      ].map((x) => x.textContent);
      expect(counts).toEqual([
        table === "promotion_requests" ? "—" : "1",
        table === "feature_slots" ? "—" : "1",
      ]);
      if (table === "events")
        expect(
          document.querySelector('form input[name="service"]'),
        ).toHaveValue("event_promotion");
      if (table === "feature_slots")
        expect(
          document.querySelector(
            'form input[name="startsAt"][type="datetime-local"][value]',
          ),
        ).toHaveAttribute("value", "2026-10-30T21:00");
      view.unmount();
    }
  },
);
