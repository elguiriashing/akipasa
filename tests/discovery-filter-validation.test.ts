import { expect, it } from "vitest";
import { discoveryRangeError } from "@/lib/discovery-filter-validation";

it("localizes inverted price and date ranges", () => {
  expect(discoveryRangeError({ minPrice: "20", maxPrice: "10" }, "en")).toBe(
    "Minimum price cannot be greater than maximum price.",
  );
  expect(
    discoveryRangeError({ dateFrom: "2026-11-03", dateTo: "2026-11-01" }, "es"),
  ).toBe("La fecha inicial no puede ser posterior a la final.");
  expect(
    discoveryRangeError(
      { minPrice: "10", maxPrice: "20", dateFrom: "2026-11-01" },
      "en",
    ),
  ).toBeNull();
});
