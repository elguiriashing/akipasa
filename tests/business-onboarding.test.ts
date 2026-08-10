import { describe, expect, it } from "vitest";
import { createEventSlug, createVenueSlug } from "../src/lib/business";

describe("business onboarding", () => {
  it("creates a safe venue URL without asking the owner for technical input", () => {
    const slug = createVenueSlug("Café Niño & Más");

    expect(slug).toMatch(/^cafe-nino-mas-[a-f0-9]{6}$/);
  });

  it("creates a safe event URL without asking the owner for technical input", () => {
    const slug = createEventSlug("Noche de Jazz & Tapas");

    expect(slug).toMatch(/^noche-de-jazz-tapas-[a-f0-9]{6}$/);
  });
});
