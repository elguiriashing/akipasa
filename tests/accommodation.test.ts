import { expect, it } from "vitest";
import { markerIsVisible, markerSource } from "../src/lib/accommodation";
import {
  mapSnapshotSchema,
  type CompactMapMarker,
} from "../src/lib/map-snapshot";
import { safePropertyWebsite, stayQuerySchema } from "../src/lib/akiduermo";

const hotel: CompactMapMarker = [
  "00000000-0000-4000-8000-000000000001",
  -4.6,
  36.5,
  1,
  1,
];
const cafe: CompactMapMarker = [
  "00000000-0000-4000-8000-000000000002",
  -4.6,
  36.5,
  1,
  0,
];
it("keeps accommodation out of activities and includes it only on its own map layer", () => {
  expect([hotel, cafe].filter((m) => markerIsVisible(m, "activities"))).toEqual(
    [cafe],
  );
  expect(
    [hotel, cafe].filter((m) => markerIsVisible(m, "accommodation")),
  ).toEqual([hotel]);
  expect(markerSource(hotel)).toBe("accommodation");
  expect(markerSource(cafe)).toBe("unclaimed");
});
it("rejects old cached markers that cannot distinguish accommodation", () => {
  expect(
    mapSnapshotSchema.safeParse({
      version: 1,
      generatedAt: "now",
      count: 1,
      markers: [hotel.slice(0, 4)],
    }).success,
  ).toBe(false);
  expect(
    mapSnapshotSchema.safeParse({
      version: 2,
      generatedAt: "now",
      count: 2,
      markers: [hotel, cafe],
    }).success,
  ).toBe(true);
});
it("validates property type and bounded pagination", () => {
  expect(
    stayQuerySchema.parse({ q: "  Málaga  ", type: "hotel", page: "2" }),
  ).toEqual({ q: "Málaga", type: "hotel", page: 2 });
  expect(stayQuerySchema.safeParse({ type: "restaurant" }).success).toBe(false);
  expect(stayQuerySchema.safeParse({ page: 0 }).success).toBe(false);
});
it("never turns imported website content into executable or credential-bearing links", () => {
  expect(safePropertyWebsite("javascript:alert(1)")).toBeNull();
  expect(safePropertyWebsite("https://person:password@example.org")).toBeNull();
  expect(safePropertyWebsite("https://example.org/hotel")).toBe(
    "https://example.org/hotel",
  );
});

import { stayLocale, stayText } from "../src/lib/akiduermo-i18n";
it("restores a supported language and gives explicit links precedence", () => {
  expect(stayLocale(null, "es")).toBe("es");
  expect(stayLocale("en", "es")).toBe("en");
  expect(stayLocale("es", "en")).toBe("es");
  expect(stayLocale("invalid", "es")).toBe("es");
  expect(stayLocale("invalid", "invalid")).toBe("en");
});
it("localizes search, property categories and verification copy", () => {
  expect(stayText("es", "Find a stay")).toBe("Buscar alojamiento");
  expect(stayText("es", "Guest houses")).toBe("Hostales y pensiones");
  expect(stayText("es", "Listings awaiting property verification")).toBe(
    "Alojamientos pendientes de verificación",
  );
  expect(stayText("en", "Find a stay")).toBe("Find a stay");
  expect(stayText("es", "AC Hotel Málaga Palacio")).toBe(
    "AC Hotel Málaga Palacio",
  );
});

import { stayHref, stayHostRoute } from "../src/lib/akiduermo-routing";
it("routes map and explore stays to dedicated subpages", () => {
  expect(stayHref("hotel-malaga", "es")).toBe(
    "https://akiduermo.akipasa.com/stays/hotel-malaga?lang=es",
  );
  expect(stayHostRoute("/stays/hotel-malaga")).toEqual({
    kind: "rewrite",
    path: "/akiduermo/stays/hotel-malaga",
  });
  expect(stayHostRoute("/en/venues/hotel-malaga")).toEqual({
    kind: "legacy",
    path: "/stays/hotel-malaga",
    locale: "en",
  });
});
it("isolates AkiDuermo from primary application and mutation endpoints", () => {
  for (const path of ["/en", "/es/login", "/en/account", "/auth/callback"])
    expect(stayHostRoute(path).kind).toBe("primary");
  expect(stayHostRoute("/api/bookings").kind).toBe("reject");
  expect(stayHostRoute("/api/stays").kind).toBe("public");
  expect(stayHostRoute("/api/map/venues").kind).toBe("public");
});
