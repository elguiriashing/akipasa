import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(file, "utf8");

describe("rental operations visual integration", () => {
  const page = source("src/app/[locale]/business/mobility/page.tsx");
  const css = source("src/components/AkiConduzco.module.css");

  it("keeps private company, vehicle and booking data under the existing identity", () => {
    expect(page).toContain("requireUser(");
    expect(page).toContain('.eq("submitted_by", user.id)');
    expect(page).toContain('.eq("company_id", company.id)');
    expect(page).toContain('.eq("vehicle.company_id", company.id)');
    expect(page).toContain("createRentalCompany");
    expect(page).toContain("createRentalVehicle");
    expect(page).toContain("updateRentalBookingStatus");
  });

  it("shows only working nav targets for each rental workspace state", () => {
    expect(page).toContain('data-pasa-operation="rental-mobility"');
    expect(page).toContain("{!companyError && (");
    expect(page).toContain("{company ? (");
    for (const anchor of ["#overview", "#fleet", "#availability", "#bookings"]) {
      expect(page).toContain(`href="${anchor}"`);
    }
    expect(page).toContain('href="#setup"');
    expect(page).toContain('id="setup"');
    expect(page).toContain("!company && !companyError");
  });

  it("uses a responsive, focusable, reduced-motion-aware light/dark workspace", () => {
    expect(css).toContain("AkiPasa coordinated rental-operations visual pass");
    expect(css).toContain('html[data-theme="dark"]');
    expect(css).toContain("safe-area-inset-bottom");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("min-height: 44px");
    expect(css).toContain("@media (max-width: 600px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(page).toContain("styles.businessBack");
    expect(page).toContain("styles.businessFooter");
  });
});
