// @vitest-environment jsdom
import React, { type ComponentProps } from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const state = vi.hoisted(() => ({ failed: "", from: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  requireUser: async () => ({
    user: { id: "operator" },
    supabase: { from: state.from },
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
}));
vi.mock("../src/app/[locale]/admin/business-applications/actions", () => ({
  reviewBusinessApplication: vi.fn(),
}));

import CataloguePage from "../src/app/[locale]/admin/catalogue/page";
import SettingsPage from "../src/app/[locale]/admin/settings/page";
import PrivacyPage from "../src/app/[locale]/admin/privacy/page";
import AuditPage from "../src/app/[locale]/admin/audit/page";
import ApplicationsPage from "../src/app/[locale]/admin/business-applications/page";

beforeEach(() => {
  state.failed = "";
  state.from.mockImplementation((table: string) => {
    const result = {
      data: table === "profiles" ? { app_role: "administrator" } : [],
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
