// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { PublicVenueCatalogue } from "../src/components/PublicVenueCatalogue";
import {
  blankCatalogue,
  blankCatalogueItem,
  parseCatalogueDocument,
} from "../src/lib/venue-catalogue";

afterEach(() => {
  document.body.innerHTML = "";
});

it.each(["en", "es"] as const)(
  "publishes existing and deliberately visible items without %s starter labels",
  (locale) => {
    const starter = blankCatalogueItem();
    const free = {
      ...blankCatalogueItem(),
      visible: true,
      name: { es: "Entrada gratuita", en: "Free entry" },
      priceCents: 0,
    };
    const priced = {
      ...blankCatalogueItem(),
      visible: true,
      name: { es: "Producto existente", en: "Existing item" },
      priceCents: 1299,
    };
    const document = blankCatalogue(locale);
    document.sections = [
      {
        id: "section-1",
        title: { es: "Servicios", en: "Services" },
        items: [starter, free, priced],
      },
    ];
    // Editing a new default must not rewrite visibility/prices of existing rows.
    const restored = parseCatalogueDocument(
      JSON.parse(JSON.stringify(document)),
      locale,
    );
    expect(
      restored.sections[0].items.map((item) => [item.visible, item.priceCents]),
    ).toEqual([
      [false, 0],
      [true, 0],
      [true, 1299],
    ]);
    render(<PublicVenueCatalogue locale={locale} document={restored} />);
    expect(
      screen.queryByText(locale === "es" ? "Nuevo elemento" : "New item"),
    ).toBeNull();
    expect(
      screen.getByText(locale === "es" ? "Entrada gratuita" : "Free entry"),
    ).toBeTruthy();
    expect(
      screen.getByText(
        locale === "es" ? "Producto existente" : "Existing item",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        (0).toLocaleString(locale, { style: "currency", currency: "EUR" }),
        { normalizer: (value) => value },
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        (12.99).toLocaleString(locale, { style: "currency", currency: "EUR" }),
        { normalizer: (value) => value },
      ),
    ).toBeTruthy();
  },
);

it.each(["en", "es"] as const)(
  "retains the explicit %s visibility choice",
  (locale) => {
    const item = {
      ...blankCatalogueItem(),
      visible: true,
      name: { es: "Servicio revisado", en: "Reviewed service" },
    };
    const document = blankCatalogue(locale);
    document.sections = [
      {
        id: "section-1",
        title: { es: "Servicios", en: "Services" },
        items: [item],
      },
    ];
    render(<PublicVenueCatalogue locale={locale} document={document} />);
    expect(
      screen.getByText(
        locale === "es" ? "Servicio revisado" : "Reviewed service",
      ),
    ).toBeTruthy();
  },
);
