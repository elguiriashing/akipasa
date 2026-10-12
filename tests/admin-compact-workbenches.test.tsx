// @vitest-environment jsdom

import React from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { readFileSync } from "node:fs";
import { AdminWorkbench } from "../src/app/[locale]/admin/AdminWorkbench";
import { VenueRelevanceReview } from "../src/components/VenueRelevanceReview";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const rows = [
  {
    id: "one",
    title: "Arte",
    subtitle: "art",
    keywords: "Arte Art",
    content: (
      <form aria-label="Edit Arte">
        <input name="nameEs" defaultValue="Arte" />
        <button>Guardar</button>
      </form>
    ),
  },
  {
    id: "two",
    title: "Música",
    subtitle: "music",
    keywords: "Music Música",
    content: (
      <form aria-label="Edit Música">
        <input name="nameEs" defaultValue="Música" />
        <button>Guardar</button>
      </form>
    ),
  },
];

describe("Admin master/detail catalogues on desktop, tablet and phone", () => {
  it("uses one active editor and switches the phone to editor when a record is selected", () => {
    const { container } = render(
      <AdminWorkbench
        locale="es"
        title="Categorías"
        items={rows}
        createLabel="Nueva categoría"
        createContent={
          <form aria-label="Create category">
            <input name="slug" />
          </form>
        }
      />,
    );
    expect(
      screen.getByRole("region", { name: "Categorías" }),
    ).toBeInTheDocument();
    expect(
      container.querySelector(".admin-master-detail--list"),
    ).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Edit Arte" })).toBeInTheDocument();
    expect(
      screen.queryByRole("form", { name: "Edit Música" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Música music/ }));
    expect(
      container.querySelector(".admin-master-detail--editor"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("form", { name: "Edit Música" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("form", { name: "Edit Arte" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Registros/ }));
    expect(
      container.querySelector(".admin-master-detail--list"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Nueva categoría/ }));
    expect(
      screen.getByRole("form", { name: "Create category" }),
    ).toBeInTheDocument();
    expect(
      container.querySelector(".admin-master-detail--editor"),
    ).toBeInTheDocument();
  });

  it("filters and selects one of the loaded settings records without mutating it", () => {
    const { container } = render(
      <AdminWorkbench
        locale="en"
        title="Platform features"
        items={[
          {
            id: "on",
            title: "Events",
            status: "enabled",
            subtitle: "events",
            content: <div>Events editor</div>,
          },
          {
            id: "off",
            title: "Partners",
            status: "disabled",
            subtitle: "partners",
            content: <div>Partners editor</div>,
          },
        ]}
        statusLabels={{ enabled: "Enabled", disabled: "Disabled" }}
      />,
    );
    fireEvent.change(
      screen.getByRole("combobox", { name: "Status of Platform features" }),
      { target: { value: "disabled" } },
    );
    expect(screen.getByText("Partners editor")).toBeInTheDocument();
    expect(screen.queryByText("Events editor")).not.toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search Platform features" }),
      { target: { value: "does-not-exist" } },
    );
    expect(screen.getByText("No matching records.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(container.querySelectorAll(".admin-master-row")).toHaveLength(2);
  });
});

const proposal = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Desidero Pizzeria",
  slug: "desidero-pizzeria",
  address: "Marbella",
  action: "KEEP",
  relevance_class: "core_venue",
  chain_name: null,
  confidence: "high",
  source_categories: "restaurant",
  reason: "Existing source merits inclusion.",
  fingerprint: "a".repeat(32),
  stale: false,
  manual_override: false,
};

describe("Catalogue relevance decision workbench", () => {
  it("shows a single selected editor, preserves authenticated decision payload and mobile tabs", async () => {
    const requests: Array<{
      url: string;
      method: string;
      body?: Record<string, unknown>;
    }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        requests.push({
          url,
          method: init?.method || "GET",
          body: init?.body
            ? (JSON.parse(String(init.body)) as Record<string, unknown>)
            : undefined,
        });
        return {
          ok: true,
          json: async () =>
            init?.method === "POST"
              ? { ok: true }
              : { rows: [proposal], total: 1 },
        };
      }),
    );
    const { container } = render(<VenueRelevanceReview locale="es" />);
    const proposalList = container.querySelector<HTMLElement>(
      ".admin-relevance-items",
    );
    expect(proposalList).toBeInTheDocument();
    await waitFor(() =>
      expect(
        within(proposalList!).getByRole("button", {
          name: /Desidero Pizzeria/,
        }),
      ).toBeInTheDocument(),
    );
    expect(
      container.querySelector(".admin-relevance-workspace--list"),
    ).toBeInTheDocument();
    fireEvent.click(
      within(proposalList!).getByRole("button", { name: /Desidero Pizzeria/ }),
    );
    expect(
      container.querySelector(".admin-relevance-workspace--editor"),
    ).toBeInTheDocument();
    const form = container.querySelector<HTMLFormElement>(
      ".admin-relevance-decision",
    );
    expect(form).toBeInTheDocument();
    const reason = within(form!).getByRole("textbox", {
      name: "Motivo auditado",
    });
    fireEvent.change(reason, {
      target: { value: "Source reviewed, keep existing local venue." },
    });
    fireEvent.submit(form!);
    await waitFor(() =>
      expect(requests.some((item) => item.method === "POST")).toBe(true),
    );
    const decision = requests.find((item) => item.method === "POST")!;
    expect(decision.url).toBe("/api/admin/venue-relevance");
    expect(decision.body).toMatchObject({
      venueId: proposal.id,
      fingerprint: proposal.fingerprint,
      action: "KEEP",
      weight: 0.5,
      reason: "Source reviewed, keep existing local venue.",
    });
    expect(
      within(form!).getByRole("combobox", { name: "Decisión" }),
    ).toBeInTheDocument();
  });
  it("preserves API-based pagination, existing endpoint and role protection", () => {
    const api = readFileSync(
      "src/app/api/admin/venue-relevance/route.ts",
      "utf8",
    );
    const route = readFileSync(
      "src/app/[locale]/admin/venue-relevance/page.tsx",
      "utf8",
    );
    const component = readFileSync(
      "src/components/VenueRelevanceReview.tsx",
      "utf8",
    );
    const css = readFileSync(
      "src/app/[locale]/admin/admin-compact.css",
      "utf8",
    );
    expect(api).toContain("relevanceAdministrator");
    expect(component).toContain("offset - 40");
    expect(component).toContain("offset + 40");
    expect(component).toContain('fetch("/api/admin/venue-relevance"');
    expect(route).toContain("VenueRelevanceReview");
    expect(css).toContain("@media (min-width: 1450px)");
    expect(css).toContain("@media (max-width: 1080px) and (min-width: 701px)");
    expect(css).toContain("@media (max-width: 700px)");
    expect(css).toContain("admin-relevance-workspace--editor");
    expect(css).toContain("admin-master-detail--editor");
  });
});

describe("unchanged Admin audit and mutations", () => {
  it("keeps catalogue and feature flag RPC actions and their audited reason fields", () => {
    const actions = readFileSync("src/app/[locale]/admin/actions.ts", "utf8");
    const catalogue = readFileSync(
      "src/app/[locale]/admin/FocusedCatalogue.tsx",
      "utf8",
    );
    expect(actions).toContain("upsert_catalog_category");
    expect(actions).toContain("upsert_catalog_city");
    expect(actions).toContain("set_feature_flag");
    expect(catalogue).toContain('name="reason"');
    expect(catalogue).toContain('name="categoryId"');
    expect(catalogue).toContain('name="cityId"');
    expect(catalogue).toContain('name="key"');
  });
});
