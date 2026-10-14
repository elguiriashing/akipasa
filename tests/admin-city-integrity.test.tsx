// @vitest-environment jsdom

import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({ rpc: vi.fn(), requireUser: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUser: fixture.requireUser }));
vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    throw new Error(href);
  },
}));
import { FocusedCatalogue } from "../src/app/[locale]/admin/FocusedCatalogue";
import {
  CatalogueSettings,
  pointCoordinates,
} from "../src/app/[locale]/admin/CatalogueSettings";
import { saveCity } from "../src/app/[locale]/admin/actions";

const city = {
  id: "10000000-0000-4000-8000-000000000001",
  slug: "fuengirola",
  name_es: "Fuengirola",
  name_en: "Fuengirola",
  center: { type: "Point", coordinates: [-4.624, 36.539] },
  timezone: "Europe/Madrid",
};
const centers = [
  ["GeoJSON", city.center],
  ["WKT", "POINT(-4.624 36.539)"],
  ["SRID WKT", "SRID=4326;POINT(-4.624e0 3.6539e1)"],
  ["little-endian EWKB", "0101000020e6100000e5d022dbf97e12c0a245b6f3fd444240"],
  ["big-endian EWKB", "0020000001000010e6c0127ef9db22d0e5404244fdf3b645a2"],
] as const;
function validForm(locale: "en" | "es", existing = true) {
  const form = new FormData();
  Object.entries({
    locale,
    cityId: existing ? city.id : "",
    slug: city.slug,
    nameEs: city.name_es,
    nameEn: city.name_en,
    latitude: "36.539",
    longitude: "-4.624",
    timezone: city.timezone,
    reason: "Correct the localized city name",
  }).forEach(([key, value]) => form.set(key, value));
  return form;
}
beforeEach(() => {
  vi.clearAllMocks();
  fixture.rpc.mockResolvedValue({ error: null });
  fixture.requireUser.mockResolvedValue({
    user: { id: "admin-city-fixture" },
    supabase: { rpc: fixture.rpc },
  });
});
afterEach(cleanup);

for (const locale of ["en", "es"] as const) {
  const es = locale === "es";
  it.each(centers)(
    `preserves non-Madrid coordinates when saving only the city name in the actual compact form (${locale}, %s)`,
    async (_shape, center) => {
      const { container } = render(
        <FocusedCatalogue
          locale={locale}
          section="cities"
          cities={[{ ...city, center }]}
        />,
      );
      const latitude = screen.getByLabelText(es ? "Latitud" : "Latitude");
      const longitude = screen.getByLabelText(es ? "Longitud" : "Longitude");
      expect(latitude).toHaveValue(36.539);
      expect(longitude).toHaveValue(-4.624);
      expect(latitude).toBeRequired();
      expect(longitude).toBeRequired();
      fireEvent.change(
        screen.getByLabelText(es ? "Nombre en español" : "Spanish name"),
        { target: { value: "Fuengirola Centro" } },
      );
      fireEvent.change(
        screen.getByLabelText(es ? "Motivo del cambio" : "Change reason"),
        { target: { value: "Correct the localized city name" } },
      );
      const form = new FormData(container.querySelector("form")!);
      await expect(saveCity(form)).rejects.toThrow(
        `/${locale}/admin/catalogue?section=cities&updated=city`,
      );
      expect(fixture.requireUser).toHaveBeenCalledWith(
        locale,
        `/${locale}/admin`,
      );
      expect(fixture.rpc).toHaveBeenCalledExactlyOnceWith(
        "upsert_catalog_city",
        {
          p_city: city.id,
          p_slug: city.slug,
          p_name_es: "Fuengirola Centro",
          p_name_en: city.name_en,
          p_latitude: 36.539,
          p_longitude: -4.624,
          p_timezone: city.timezone,
          p_reason: "Correct the localized city name",
        },
      );
    },
  );

  it(`starts a new city with empty required coordinates and accepts explicit Canary coordinates (${locale})`, async () => {
    const { container } = render(
      <FocusedCatalogue locale={locale} section="cities" cities={[city]} />,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: es ? "Nueva localidad" : "New locality",
      }),
    );
    expect(screen.getByLabelText(es ? "Latitud" : "Latitude")).toHaveValue(
      null,
    );
    expect(screen.getByLabelText(es ? "Longitud" : "Longitude")).toHaveValue(
      null,
    );
    expect(container.querySelector('[name="cityId"]')).toHaveValue("");
    const form = validForm(locale, false);
    form.set("slug", "las-palmas");
    form.set("latitude", "28.1235");
    form.set("longitude", "-15.4363");
    form.set("timezone", "Atlantic/Canary");
    await expect(saveCity(form)).rejects.toThrow(
      `/${locale}/admin/catalogue?section=cities&updated=city`,
    );
    expect(fixture.rpc).toHaveBeenCalledWith(
      "upsert_catalog_city",
      expect.objectContaining({
        p_city: null,
        p_slug: "las-palmas",
        p_latitude: 28.1235,
        p_longitude: -15.4363,
        p_timezone: "Atlantic/Canary",
      }),
    );
  });

  it.each([
    ["latitude", null],
    ["longitude", null],
    ["latitude", ""],
    ["longitude", " "],
    ["latitude", "NaN"],
    ["longitude", "Infinity"],
    ["latitude", "26.99"],
    ["longitude", "5.01"],
  ] as const)(
    `rejects missing or invalid %s=%s before any authorized city write (${locale})`,
    async (field, value) => {
      const form = validForm(locale);
      if (value === null) form.delete(field);
      else form.set(field, value);
      await expect(saveCity(form)).rejects.toThrow(
        `/${locale}/admin/catalogue?section=cities&error=city`,
      );
      expect(fixture.requireUser).not.toHaveBeenCalled();
      expect(fixture.rpc).not.toHaveBeenCalled();
    },
  );

  it(`retains valid coordinates in the older catalogue form and shows a blank malformed center (${locale})`, () => {
    const older = render(
      <CatalogueSettings
        locale={locale}
        categories={[]}
        cities={[city]}
        flags={[]}
      />,
    );
    const identity = older.container.querySelector(
      `input[value="${city.id}"]`,
    )!;
    const form = identity.closest("form")!;
    expect(form.querySelector('[name="latitude"]')).toHaveValue(36.539);
    expect(form.querySelector('[name="longitude"]')).toHaveValue(-4.624);
    older.unmount();
    render(
      <FocusedCatalogue
        locale={locale}
        section="cities"
        cities={[{ ...city, center: { coordinates: ["-4.624", null] } }]}
      />,
    );
    expect(screen.getByLabelText(es ? "Latitud" : "Latitude")).toHaveValue(
      null,
    );
    expect(screen.getByLabelText(es ? "Longitud" : "Longitude")).toHaveValue(
      null,
    );
  });
}
it.each([
  null,
  {},
  { coordinates: [1] },
  { coordinates: [1, Infinity] },
  { coordinates: ["-4.624", 36.539] },
  { type: "LineString", coordinates: [-4.624, 36.539] },
  "POINT(NaN 36.539)",
  "POINT(-4.624 1e999)",
  "SRID=3857;POINT(-4.624 36.539)",
  "0101000020e6100000e5d022dbf97e12c0a245b6f3fd4442",
  "0102000020e6100000e5d022dbf97e12c0a245b6f3fd444240",
  "0101000020110f0000e5d022dbf97e12c0a245b6f3fd444240",
  "0201000020e6100000e5d022dbf97e12c0a245b6f3fd444240",
  "0101000020e6100000e5d022dbf97e12c0000000000000f07f",
])("does not fabricate a point from an invalid center %#", (center) => {
  expect(pointCoordinates(center)).toBeNull();
});
