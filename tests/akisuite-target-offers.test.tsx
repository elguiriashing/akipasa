// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
  targetOffers,
  targetOffer,
  targetOfferReadiness,
  targetOfferScopeMatches,
  targetOfferVersion,
} from "../src/lib/target-offers";
import {
  akisuitePlans,
  overlappingAkiSuitePlan,
} from "../src/lib/akisuite-catalogue";
import { TargetOfferCatalogue } from "../src/components/TargetOfferCatalogue";
import OffersPage from "../src/app/[locale]/offers/page";
import { config } from "../src/lib/config";
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not found");
  },
}));
const originalSwap = config.roleSwap;
afterEach(() => {
  cleanup();
  config.roleSwap = originalSwap;
  vi.unstubAllEnvs();
});
const uuid = "10000000-0000-4000-8000-000000000001";

it("versions target offers separately from every existing billing key", () => {
  expect(targetOfferVersion).toBe("akisuite-roles-v1");
  expect(new Set(targetOffers.map((offer) => offer.id)).size).toBe(10);
  for (const legacy of [
    "premium",
    "business",
    "business_pro",
    ...Object.keys(akisuitePlans),
  ]) {
    expect(targetOffer(legacy)).toBeUndefined();
    expect(targetOfferReadiness(legacy)).toBeNull();
    expect(
      targetOfferScopeMatches(legacy, {
        kind: "workspace",
        product: "akibusiness",
        id: "legacy-location",
      }),
    ).toBe(false);
  }
  // Existing catalogue/compatibility continues to mean the existing offers.
  expect(akisuitePlans.akihq_standard.monthlyCents).toBe(2000);
  expect(akisuitePlans.akiduermo_premium.monthlyCents).toBe(599);
  expect(overlappingAkiSuitePlan("akipasa_premium", ["premium"])).toBe(true);
  expect(overlappingAkiSuitePlan("akihq_pro", ["business_pro"])).toBe(true);
});

it("keeps each new paid offer individually blocked with no live price or annual invention", () => {
  for (const key of [
    "AKISUITE_CHECKOUT_ENABLED",
    "AKISUITE_TAX_READY",
    "AKISUITE_SUBSCRIPTIONS_READY",
    "AKISUITE_FEATURES_READY",
    "AKISUITE_BILLING_VERIFIED",
  ])
    vi.stubEnv(key, "true");
  for (const offer of targetOffers.filter(
    (offer) => offer.scope !== "management",
  )) {
    const readiness = targetOfferReadiness(offer.id)!;
    expect(readiness.status).toBe("blocked");
    expect(readiness.checkoutEnabled).toBe(false);
    expect(readiness.stripePriceId).toBeNull();
    expect(readiness.annual).toEqual({
      targetCents: null,
      blocker: "annual_policy",
    });
    expect(readiness.blockers).toEqual(
      expect.arrayContaining(["tax", "sandbox_lifecycle", "new_entitlement"]),
    );
  }
  expect(
    targetOfferReadiness("roles_v1_pasa_personal")?.blockers,
  ).not.toContain("features");
  expect(targetOfferReadiness("roles_v1_duermo_personal")?.blockers).toContain(
    "features",
  );
  expect(targetOfferReadiness("roles_v1_business_plus")?.blockers).toContain(
    "location_scope",
  );
  expect(targetOfferReadiness("roles_v1_duermo_listing")?.blockers).toContain(
    "catalogue_pricing",
  );
  expect(targetOfferReadiness("roles_v1_hq_management")).toMatchObject({
    status: "free_management",
    checkoutEnabled: false,
    blockers: [],
    annual: null,
  });
});

it("requires exact product and subject type, never inheriting business access from personal or listing offers", () => {
  for (const offer of targetOffers.filter(
    (offer) => offer.scope !== "management",
  )) {
    const subject = {
      kind: offer.scope,
      product: offer.product,
      id: offer.scope === "workspace" ? "private-location" : uuid,
    };
    expect(targetOfferScopeMatches(offer.id, subject)).toBe(true);
    expect(
      targetOfferScopeMatches(offer.id, {
        ...subject,
        product: "wrong-product",
      }),
    ).toBe(false);
    expect(
      targetOfferScopeMatches(offer.id, { ...subject, kind: "wrong-scope" }),
    ).toBe(false);
    expect(targetOfferScopeMatches(offer.id, { ...subject, id: "" })).toBe(
      false,
    );
  }
  for (const id of [
    "roles_v1_pasa_personal",
    "roles_v1_duermo_personal",
    "roles_v1_coches_personal",
    "roles_v1_pasa_listing",
    "roles_v1_duermo_listing",
    "roles_v1_coches_listing",
  ]) {
    expect(
      targetOfferScopeMatches(id, {
        kind: "workspace",
        product: "akibusiness",
        id: "private-location",
      }),
    ).toBe(false);
  }
  expect(
    targetOfferScopeMatches("roles_v1_hq_management", {
      kind: "management",
      product: "akihq",
      id: uuid,
    }),
  ).toBe(false);
  expect(
    targetOfferScopeMatches("roles_v1_duermo_listing", {
      kind: "unit",
      product: "akiduermo",
      id: uuid,
    }),
  ).toBe(false);
  expect(
    targetOfferScopeMatches("roles_v1_coches_listing", {
      kind: "vehicle",
      product: "akicoches",
      id: uuid,
    }),
  ).toBe(false);
});

it.each(["en", "es"] as const)(
  "renders informational scopes and blockers without checkout controls in %s",
  (locale) => {
    const { container } = render(<TargetOfferCatalogue locale={locale} />);
    expect(screen.getAllByRole("article")).toHaveLength(10);
    expect(container.querySelector("form")).toBeNull();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.getAllByText(
        locale === "es"
          ? "No disponible para contratar"
          : "Not available to purchase",
      ),
    ).toHaveLength(9);
    const hq = screen
      .getByRole("heading", { name: "AkiHQ" })
      .closest("article")!;
    expect(
      within(hq).getByText(locale === "es" ? "Gratis" : "Free"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      `/${locale}/account/subscription`,
    );
  },
);

it("exposes the informational route only with the coordinated role switch", async () => {
  config.roleSwap = false;
  await expect(
    OffersPage({ params: Promise.resolve({ locale: "en" }) }),
  ).rejects.toThrow("not found");
  config.roleSwap = true;
  render(await OffersPage({ params: Promise.resolve({ locale: "es" }) }));
  expect(
    screen.getByRole("heading", { name: "Productos y ofertas previstas" }),
  ).toBeInTheDocument();
});
