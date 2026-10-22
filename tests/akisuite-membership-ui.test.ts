import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  akisuitePlans,
  akisuitePriceCents,
} from "../src/lib/akisuite-catalogue";

describe("AkiSuite membership audience contract", () => {
  const grid = readFileSync(
    "src/components/AkiSuiteMembershipGrid.tsx",
    "utf8",
  );
  const source = readFileSync(
    "src/components/AkiSuiteAudienceStudio.tsx",
    "utf8",
  );
  const css = readFileSync(
    "src/components/AkiSuiteAudienceStudio.module.css",
    "utf8",
  );
  const publicPage = readFileSync(
    "src/app/[locale]/membership/page.tsx",
    "utf8",
  );
  const accountPage = readFileSync(
    "src/app/[locale]/account/subscription/page.tsx",
    "utf8",
  );
  it("does not mutate existing billing prices and retains server checkout gates", () => {
    expect(akisuitePlans.akihq_pro.monthlyCents).toBe(6000);
    expect(akisuitePriceCents("akihq_pro", "year")).toBe(57600);
    expect(grid).toContain("AkiSuiteAudienceStudio");
    expect(grid).toContain("personalPremiumUnlocked = false");
    expect(grid).not.toContain("OPERATION_PRICES");
    expect(grid).not.toContain("akihq_standard");
    expect(grid).not.toContain("setInterval");
    expect(grid).toContain("startAkiSuiteCheckout");
    expect(grid).toContain("workspaceId");
    const actions = readFileSync(
      "src/app/[locale]/account/subscription/akisuite-actions.ts",
      "utf8",
    );
    expect(actions).toContain("!personalPremiumLaunchOpen()");
  });
  it("uses the identical reviewable audience-first component in three discovery apps", () => {
    expect(source).toContain('role="tablist"');
    expect(source).toContain("aria-selected={audience === key}");
    expect(source).toContain('"ArrowRight"');
    expect(source).toContain('"AkiBusiness"');
    expect(css).toContain("grid-template-columns:repeat(2,minmax(0,1fr))");
    expect(css).toContain("@media(max-width:680px)");
    for (const [path, sha] of [
      [
        "src/components/AkiSuiteAudienceStudio.tsx",
        "9ed87ee732c51105f2533f8ef66b6950b387b7b4",
      ],
      [
        "src/components/AkiSuiteAudienceStudio.module.css",
        "d84e4bc5367b5b22371d27c6958aedcecf7516a9",
      ],
    ] as const) {
      const blob = readFileSync(path);
      expect(
        createHash("sha1")
          .update("blob " + blob.length + "\0")
          .update(blob)
          .digest("hex"),
      ).toBe(sha);
    }
  });
  it("keeps the public and account membership UI sharing an adapter", () => {
    for (const page of [publicPage, accountPage]) {
      expect(page).toContain("AkiSuiteMembershipGrid");
      expect(page).toContain("akiSuiteCheckoutReady()");
      expect(page).not.toContain("MembershipPicker");
    }
    expect(publicPage).toContain('purchaseMode="account"');
    expect(accountPage).not.toContain('purchaseMode="account"');
  });
  it("preserves established membership aliases", () => {
    for (const path of [
      "src/app/[locale]/business/memberships/page.tsx",
      "src/app/[locale]/duermo/memberships/page.tsx",
    ]) {
      expect(readFileSync(path, "utf8")).toContain("/membership?from=");
    }
  });
});
