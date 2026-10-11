// @vitest-environment jsdom

import React from "react";
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.PropsWithChildren<{ href: string; "aria-current"?: "page" }>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { AdminSearchList } from "../src/app/[locale]/admin/AdminSearchList";
import { RewardsTabs } from "../src/app/[locale]/admin/RewardsTabs";

afterEach(cleanup);

const records = [
  {
    id: "a",
    search: "Fuengirola Luna new",
    status: "new",
    content: <article>Luna</article>,
  },
  {
    id: "b",
    search: "Málaga Sol won",
    status: "won",
    content: <article>Sol</article>,
  },
  {
    id: "c",
    search: "Mijas Café new",
    status: "new",
    content: <article>Café</article>,
  },
];

describe("Admin web app search controls", () => {
  it("filters visible rows by text and status without mutating underlying records", () => {
    const { container } = render(
      <AdminSearchList
        locale="es"
        label="Solicitudes"
        items={records}
        limit={2}
      />,
    );
    expect(
      screen.getByRole("searchbox", { name: "Buscar en Solicitudes" }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll(".admin-list-entry")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: /Ver más/ }));
    expect(container.querySelectorAll(".admin-list-entry")).toHaveLength(3);
    const select = screen.getByRole("combobox", {
      name: "Filtrar Solicitudes por estado",
    });
    fireEvent.change(select, { target: { value: "won" } });
    expect(screen.getByText("Sol")).toBeInTheDocument();
    expect(screen.queryByText("Luna")).not.toBeInTheDocument();
    fireEvent.change(select, { target: { value: "all" } });
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "mijas" },
    });
    expect(screen.getByText("Café")).toBeInTheDocument();
    expect(screen.queryByText("Sol")).not.toBeInTheDocument();
  });

  it("has meaningful no results, reset controls and English labels", () => {
    render(<AdminSearchList locale="en" label="Audit log" items={records} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "xxxxxxxx" },
    });
    expect(screen.getByText(/No matches/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("Luna")).toBeInTheDocument();
  });
});

describe("integrated Admin rewards tabs", () => {
  it("presents three accessible destinations with one selected tool", () => {
    render(<RewardsTabs locale="es" active="awards" />);
    const nav = screen.getByRole("navigation", {
      name: "Herramientas de recompensas",
    });
    expect(within(nav).getAllByRole("link")).toHaveLength(3);
    expect(
      within(nav).getByRole("link", { name: /Pasaportes/ }),
    ).toHaveAttribute("href", "/es/admin/passports");
    expect(
      within(nav).getByRole("link", { name: /Otorgar sellos/ }),
    ).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: /Logros/ })).toHaveAttribute(
      "href",
      "/es/admin/achievements",
    );
  });

  it("keeps privileged action routes unchanged and hides redundant Admin chrome", () => {
    const root = "src/app/[locale]/admin/";
    const layout = readFileSync(root + "layout.tsx", "utf8");
    expect(layout).toContain("hidePageHeading");
    expect(layout).toContain('label: es ? "Recompensas" : "Rewards"');
    expect(layout).not.toContain('label: es ? "Otorgar sellos"');
    expect(layout).not.toContain('label: es ? "Logros"');
    for (const file of [
      "passports/page.tsx",
      "passports/awards/page.tsx",
      "achievements/page.tsx",
      "achievements/venues/page.tsx",
    ]) {
      expect(readFileSync(root + file, "utf8")).toContain("<RewardsTabs");
    }
    const styles = readFileSync(root + "admin-suite.css", "utf8");
    expect(styles).toContain(".admin-rewards-tabs");
    expect(styles).toContain("overflow-wrap: anywhere;");
    expect(styles).toContain("overflow: visible;");
  });

  it("integrates search into core Admin queues without changing decision actions", () => {
    const root = "src/app/[locale]/admin/";
    for (const file of [
      "promotions/page.tsx",
      "business-applications/page.tsx",
      "privacy/page.tsx",
      "audit/page.tsx",
      "passports/page.tsx",
      "FocusedCatalogue.tsx",
    ]) {
      expect(readFileSync(root + file, "utf8")).toContain("<AdminSearchList");
    }
    const source = readFileSync(
      root + "business-applications/page.tsx",
      "utf8",
    );
    expect(source).toContain("reviewBusinessApplication");
    expect(readFileSync(root + "promotions/page.tsx", "utf8")).toContain(
      "updatePromotion",
    );
    expect(readFileSync(root + "privacy/page.tsx", "utf8")).toContain(
      "updateDeletionRequest",
    );
  });
});

describe("Admin business application disclosure indicator", () => {
  it("uses one CSS chevron for closed and open application rows", () => {
    const root = "src/app/[locale]/admin/";
    const applications = readFileSync(
      root + "business-applications/page.tsx",
      "utf8",
    );
    const css = readFileSync(root + "admin-suite.css", "utf8");
    expect(applications).toContain(
      'className="settings-disclosure full-width-disclosure"',
    );
    const rules = css.split(
      "/* Admin business applications: one disclosure chevron",
    )[1];
    expect(rules).toBeDefined();
    expect(rules).toContain("details.settings-disclosure.full-width-disclosure");
    expect(rules).toMatch(/summary::after\s*\{\s*content: "";[\s\S]*?transform: rotate\(45deg\);/);
    expect(rules).toMatch(/full-width-disclosure\[open\][\s\S]*?summary::after\s*\{\s*content: "";\s*transform: rotate\(225deg\);/);
    expect(rules).not.toContain('content: "+"');
    expect(rules).not.toContain('content: "−"');
  });
});
