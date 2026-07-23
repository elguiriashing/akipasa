// @vitest-environment jsdom

import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/app/[locale]/admin/actions", () => ({
  saveCategory: vi.fn(),
  saveCity: vi.fn(),
  updateFeatureFlag: vi.fn(),
}));

import { CatalogueSettings } from "../src/app/[locale]/admin/CatalogueSettings";

afterEach(cleanup);

const categories = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    slug: "music",
    name_es: "Música",
    name_en: "Music",
  },
];
const cities = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    slug: "fuengirola",
    name_es: "Fuengirola",
    name_en: "Fuengirola",
    center: { type: "Point", coordinates: [-4.624, 36.539] },
    timezone: "Europe/Madrid",
  },
];
const flags = [
  {
    key: "community_submissions",
    enabled: true,
    label_es: "Sugerencias de eventos",
    label_en: "Community event suggestions",
    updated_at: "2026-07-23T00:00:00Z",
  },
  {
    key: "loyalty_check_ins",
    enabled: true,
    label_es: "Check-ins y recompensas",
    label_en: "Check-ins and rewards",
    updated_at: "2026-07-23T00:00:00Z",
  },
  {
    key: "promotion_requests",
    enabled: false,
    label_es: "Solicitudes de promoción",
    label_en: "Promotion requests",
    updated_at: "2026-07-23T00:00:00Z",
  },
];

describe("administrator catalogue and settings", () => {
  it("renders accessible English create/edit controls and all feature flags", () => {
    render(
      <CatalogueSettings
        locale="en"
        categories={categories}
        cities={cities}
        flags={flags}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Catalogue and settings" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create category" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create locality" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", {
        name: "Community event suggestions",
      }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Promotion requests" }),
    ).not.toBeChecked();
    expect(
      screen.getAllByRole("button", { name: "Save control" }),
    ).toHaveLength(3);
  });

  it("renders Spanish operational labels", () => {
    render(
      <CatalogueSettings
        locale="es"
        categories={categories}
        cities={cities}
        flags={flags}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Catálogo y configuración" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Crear categoría" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Sugerencias de eventos" }),
    ).toBeInTheDocument();
  });
});
