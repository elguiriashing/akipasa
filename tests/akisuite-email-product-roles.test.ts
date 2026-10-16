import { afterEach, describe, expect, it } from "vitest";
import { productRoles, resolveProductRoles } from "../src/lib/product-roles";
import {
  suiteEmailCopy,
  suiteEmailKinds,
  renderSuiteEmail,
} from "../src/lib/suite-email-templates";
import { renderClaimDecision } from "../src/lib/claim-decision-email";

const original = { ...productRoles };
afterEach(() => Object.assign(productRoles, original));
const setRoles = (roleSwap?: string) =>
  Object.assign(productRoles, resolveProductRoles({ roleSwap }));

describe("email product roles at render time", () => {
  it.each(["en", "es"] as const)(
    "keeps historical queue kinds but changes their displayed roles (%s)",
    (locale) => {
      setRoles("true");
      const management = suiteEmailCopy("welcome_akibusiness", locale);
      const operations = suiteEmailCopy("welcome_akihq", locale);
      expect(management.product).toBe("akihq");
      expect(management.subject).toContain("AkiHQ");
      expect(management.intro).toContain("AkiHQ");
      expect(management.href).toBe(`https://akihq.app/${locale}/business`);
      expect(operations.product).toBe("akibusiness");
      expect(operations.subject).toContain("AkiBusiness");
      expect(operations.intro).toContain("AkiBusiness");
      expect(operations.href).toBe("https://akibusiness.com/");
      expect(suiteEmailKinds).toContain("welcome_akibusiness");
      expect(suiteEmailKinds).toContain("welcome_akihq");
      expect(renderSuiteEmail("welcome_akibusiness", locale).html).toContain(
        "AkiHQ",
      );
      const claim = suiteEmailCopy("claim_received", locale);
      expect(claim.product).toBe("akihq");
      expect(claim.button).toContain("AkiHQ");
      expect(claim.href).toContain("https://akihq.app/");
      for (const decision of ["approved", "rejected"] as const) {
        const rendered = renderClaimDecision({
          claimId: "claim",
          venueId: "venue",
          venueName: "Venue",
          applicantName: null,
          decision,
          reason: "Reason",
          locale,
        });
        expect(rendered.text).toContain("AkiHQ");
        expect(rendered.text).toContain(`https://akihq.app/${locale}/business`);
        expect(rendered.text).not.toContain("AkiBusiness");
      }
    },
  );
  it("preserves default legacy welcome and rental destinations", () => {
    setRoles();
    expect(suiteEmailCopy("welcome_akibusiness", "en").href).toBe(
      "https://business.akipasa.com/en/business",
    );
    expect(suiteEmailCopy("welcome_akihq", "en").href).toBe(
      "https://crm.akipasa.com/",
    );
    expect(
      suiteEmailCopy("rental_booking_update", "en", {
        audience: "operator",
        companyId: "branch",
      }).href,
    ).toBe("https://akibusiness.com/en/business/mobility?company=branch");
  });
  it("routes rental operators to management after cutover, retaining branch identity", () => {
    setRoles("true");
    expect(
      suiteEmailCopy("rental_booking_update", "es", {
        audience: "operator",
        companyId: "branch/1",
      }).href,
    ).toBe("https://akihq.app/es/business/mobility?company=branch%2F1");
    expect(
      suiteEmailCopy("rental_booking_update", "es", { audience: "customer" })
        .href,
    ).toBe("https://akicoches.com/account?lang=es");
  });
  it("routes independent stay messages to the independent consumer before role cutover", () => {
    setRoles();
    for (const kind of [
      "stay_booking_requested",
      "stay_booking_cancelled",
    ] as const) {
      expect(
        suiteEmailCopy(kind, "en", { independentProperty: true }).href,
      ).toBe("https://akiduermo.com/bookings?lang=en");
      expect(suiteEmailCopy(kind, "en").href).toBe(
        "https://akiduermo.akipasa.com/bookings?lang=en",
      );
      setRoles("true");
      expect(suiteEmailCopy(kind, "en").href).toBe(
        "https://akiduermo.com/bookings?lang=en",
      );
      setRoles();
    }
    setRoles("true");
    expect(
      suiteEmailCopy("stay_saved_reminder", "en", { venueId: "property" }).href,
    ).toBe("https://akiduermo.com/stays/property");
  });
});
