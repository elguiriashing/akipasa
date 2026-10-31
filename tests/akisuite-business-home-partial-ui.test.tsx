// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("../src/components/BusinessTeamRefresh", () => ({
  BusinessTeamRefresh: () => null,
}));
import { BusinessHome } from "../src/components/BusinessHome";
afterEach(cleanup);
const places = Array.from({ length: 12 }, (_, index) => ({
  id: `known-${index}`,
  name: `Known place ${String(index).padStart(2, "0")}`,
  slug: `known-${index}`,
  status: "published",
  role: "manager",
  product: "venue" as const,
}));
it.each(["en", "es"] as const)(
  "%s retains and filters known rows without complete totals or a false empty state",
  (locale) => {
    const es = locale === "es";
    render(
      <BusinessHome
        locale={locale}
        places={places}
        readError
        retryHref={`/${locale}/business?view=venues`}
        deleteAction={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toBeVisible();
    expect(screen.getByText("Known place 00")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(
      es ? "total no disponible" : "total unavailable",
    );
    expect(
      screen.queryByText(
        es
          ? "Tu primer negocio empieza aquí"
          : "Your first business starts here",
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: es ? "Reintentar" : "Try again" }),
    ).toHaveAttribute("href", `/${locale}/business?view=venues`);
    fireEvent.click(
      screen.getByRole("button", { name: es ? "Siguiente" : "Next" }),
    );
    expect(screen.getByText("Known place 11")).toBeVisible();
    fireEvent.change(
      screen.getByRole("searchbox", {
        name: es ? "Buscar mis negocios" : "Search my places",
      }),
      { target: { value: "missing" } },
    );
    expect(screen.getByRole("alert")).toBeVisible();
    expect(
      screen.queryByRole("heading", {
        name: es ? "Sin resultados" : "No matches",
      }),
    ).not.toBeInTheDocument();
  },
);
it.each(["en", "es"] as const)(
  "%s distinguishes unknown empty from confirmed empty",
  (locale) => {
    const view = render(
      <BusinessHome
        locale={locale}
        places={[]}
        readError
        deleteAction={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toBeVisible();
    expect(
      screen.queryByRole("heading", {
        name:
          locale === "es"
            ? "Tu primer negocio empieza aquí"
            : "Your first business starts here",
      }),
    ).not.toBeInTheDocument();
    view.rerender(
      <BusinessHome locale={locale} places={[]} deleteAction={vi.fn()} />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name:
          locale === "es"
            ? "Tu primer negocio empieza aquí"
            : "Your first business starts here",
      }),
    ).toBeVisible();
  },
);
