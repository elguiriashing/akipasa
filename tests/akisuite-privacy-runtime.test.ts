import { afterEach, expect, it, vi } from "vitest";
import { operationsReleaseVars } from "./helpers/operations-release-config";
import { privateIdentityExportsReady } from "../src/lib/identity-private-export";
afterEach(() => vi.unstubAllEnvs());
it("declares the installed own-data privacy reader without opening paid or reward acquisition", () => {
  vi.stubEnv(
    "AKISUITE_PRIVATE_IDENTITY_EXPORTS_READY",
    operationsReleaseVars.AKISUITE_PRIVATE_IDENTITY_EXPORTS_READY,
  );
  expect(privateIdentityExportsReady()).toBe(true);
  expect(operationsReleaseVars.AKISUITE_FEATURES_READY).toBe("false");
  expect(operationsReleaseVars.AKISUITE_SUBSCRIPTIONS_READY).toBe("false");
  expect(operationsReleaseVars.AKISUITE_REFERRALS_READY).not.toBe("true");
  expect(operationsReleaseVars.AKIPASA_PRESTIGE_ENABLED).not.toBe("true");
  expect(operationsReleaseVars.AKIBUSINESS_OPERATIONS_CHECKOUT_READY).toBe(
    "false",
  );
  expect(operationsReleaseVars.AKIBUSINESS_OPERATIONS_TAX_READY).toBe("false");
  expect(
    operationsReleaseVars.NEXT_PUBLIC_AKISUITE_PRIVATE_IDENTITY_EXPORTS_READY,
  ).toBeUndefined();
});
