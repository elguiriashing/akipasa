import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  conduzcoHostMethodAllowed,
  conduzcoHostRoute,
  safeConduzcoDestination,
} from "../src/lib/akiconduzco-routing";
import {
  formatRentalPrice,
  rentalEurosToCents,
  rentalSearchSchema,
} from "../src/lib/akiconduzco";

describe("AkiConduzco host and booking boundaries", () => {
  it("keeps public pages on the rental origin and rejects non-product paths", () => {
    expect(conduzcoHostRoute("/")).toEqual({
      kind: "rewrite",
      path: "/akiconduzco",
    });
    expect(conduzcoHostRoute("/map")).toEqual({
      kind: "rewrite",
      path: "/akiconduzco/map",
    });
    expect(conduzcoHostRoute("/rentals/example-car").kind).toBe("rewrite");
    expect(conduzcoHostRoute("/bookings")).toEqual({
      kind: "rewrite",
      path: "/akiconduzco/bookings",
    });
    expect(conduzcoHostRoute("/admin").kind).toBe("primary");
    expect(conduzcoHostRoute("/api/private").kind).toBe("reject");
  });

  it("allows authenticated booking requests while rejecting other writes", () => {
    expect(conduzcoHostMethodAllowed("/api/car-rentals/bookings", "POST")).toBe(
      true,
    );
    expect(conduzcoHostMethodAllowed("/api/car-rentals", "POST")).toBe(false);
    expect(conduzcoHostMethodAllowed("/account", "DELETE")).toBe(false);
  });

  it("accepts only safe same-host account return destinations", () => {
    expect(safeConduzcoDestination("/account")).toBe("/account");
    expect(safeConduzcoDestination("/rentals/a-car?lang=es")).toBe(
      "/rentals/a-car?lang=es",
    );
    expect(safeConduzcoDestination("//evil.example")).toBe("/account");
    expect(safeConduzcoDestination("https://evil.example/account")).toBe(
      "/account",
    );
  });

  it("validates bounded search dates and price ranges", () => {
    expect(
      rentalSearchSchema.safeParse({
        start: "2027-04-02",
        end: "2027-04-05",
        min: "2000",
        max: "8000",
      }).success,
    ).toBe(true);
    expect(rentalSearchSchema.safeParse({ start: "2027-04-02" }).success).toBe(
      false,
    );
    expect(
      rentalSearchSchema.safeParse({ start: "2027-04-05", end: "2027-04-02" })
        .success,
    ).toBe(false);
    expect(
      rentalSearchSchema.safeParse({ min: "8000", max: "2000" }).success,
    ).toBe(false);
    expect(formatRentalPrice(12900, "es")).toContain("129");
    expect(rentalEurosToCents(70)).toBe(7000);
  });

  it("keeps rental records separate from venue claims and mirrors both migrations", () => {
    const root = process.cwd();
    for (const name of [
      "20261014223000_akiconduzco_rentals.sql",
      "20261014230000_akiconduzco_rls_indexes.sql",
    ]) {
      const dbMigration = readFileSync(
        join(root, "database/migrations", name),
        "utf8",
      );
      const supabaseMigration = readFileSync(
        join(root, "supabase/migrations", name),
        "utf8",
      );
      expect(supabaseMigration).toBe(dbMigration);
      expect(dbMigration).toContain(
        name.endsWith("rentals.sql")
          ? "enable row level security"
          : "create policy",
      );
    }
    const rentalSchema = readFileSync(
      join(root, "database/migrations/20261014223000_akiconduzco_rentals.sql"),
      "utf8",
    );
    expect(rentalSchema).toContain("request_car_rental_booking");
    expect(rentalSchema).toContain("review_car_rental_company");
    expect(rentalSchema).not.toContain("discovery_vertical");
  });
});
