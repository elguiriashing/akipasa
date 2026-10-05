import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { applyAction, initialState, type Context } from "../src/lib/pals/engine";
import {
  itemPurchasable,
  validateCatalogue,
  type Catalogue,
} from "../src/lib/pals/catalogue";
import { legacyCatalogue } from "../src/lib/pals/catalogue-legacy";
import {
  activeEntitlements,
  entitlementReason,
  legacyWardrobeEntitlements,
} from "../src/lib/pals/entitlements";
import {
  evaluateRewardRules,
  type RewardFacts,
  type RewardRule,
} from "../src/lib/pals/rewards";
import {
  legacyAchievementRewardRules,
  rewardFactsFromAchievements,
} from "../src/lib/pals/reward-catalogue";
import { renderSnapshotFromState } from "../src/lib/pals/render-snapshot";
import {
  sanitizePalsAnalyticsEvent,
  type PalsAnalyticsEvent,
} from "../src/lib/pals/analytics";

const now = Date.UTC(2026, 9, 5, 12);
const ctx: Context = {
  now,
  id: (() => {
    let n = 0;
    return () => `id-${++n}`;
  })(),
  random: () => 0.2,
};

function adopted() {
  return applyAction(
    initialState(now),
    { type: "adopt", family: "moka", name: "Mochi" },
    ctx,
  );
}

describe("AkiPals product catalogue", () => {
  it("adapts the current wardrobe into named scalable collections", () => {
    const catalogue = legacyCatalogue();
    expect(validateCatalogue(catalogue)).toBe(true);
    expect(catalogue.items.length).toBeGreaterThanOrEqual(60);
    expect(catalogue.collections.map((collection) => collection.id)).toEqual(
      expect.arrayContaining([
        "akipasa-originals",
        "city-keepsakes",
        "explorer-story",
      ]),
    );
    for (const item of catalogue.items) {
      expect(item.collectionId).toBeTruthy();
      expect(item.compatibleFamilies).toBeTruthy();
      expect(item.render.kind).toBeTruthy();
    }
  });

  it("keeps prestigious earned items non-purchasable", () => {
    const catalogue = legacyCatalogue();
    for (const item of catalogue.items.filter((item) => item.prestigious)) {
      expect(itemPurchasable(item)).toBe(false);
      expect(item.price).toBeNull();
    }
  });

  it("supports sponsored collections without special-case product code", () => {
    const sponsored: Catalogue = {
      brands: [{ id: "test-brand", name: "Test Brand", metadata: {} }],
      campaigns: [{
        id: "summer-test",
        title: "Summer Test",
        brandId: "test-brand",
        collectionIds: ["summer-kit"],
        unlockRuleIds: ["visit-three"],
        analyticsKey: "summer-test",
        metadata: {},
      }],
      collections: [{
        id: "summer-kit",
        title: "Summer Kit",
        description: "Infrastructure-only sponsored test collection.",
        brandId: "test-brand",
        campaignId: "summer-test",
        itemIds: ["summer-glow"],
        unlockMethod: "campaign",
        metadata: {},
      }],
      items: [{
        id: "summer-glow",
        name: "Summer glow",
        collectionId: "summer-kit",
        slot: "effect",
        rarity: "epic",
        render: { kind: "effect", effect: "glow" },
        compatibleFamilies: "all",
        source: "sponsored",
        unlockRuleIds: ["visit-three"],
        brandId: "test-brand",
        campaignId: "summer-test",
        metadata: {},
      }],
    };
    expect(validateCatalogue(sponsored)).toBe(true);
  });
});

describe("AkiPals entitlement provenance", () => {
  it("can always explain legacy ownership", () => {
    const entitlements = legacyWardrobeEntitlements(
      ["bucket-hat"],
      new Date(now).toISOString(),
    );
    expect(activeEntitlements(entitlements)).toHaveLength(1);
    expect(entitlementReason(entitlements[0])).toMatchObject({
      obtainedVia: "admin",
      sourceType: "legacy-save",
    });
  });

  it("writes provenance for new starter and shop grants", () => {
    let state = adopted();
    expect(state.entitlements?.some((entry) => entry.sourceType === "starter-pack")).toBe(true);
    state.threads = 1000;
    state = applyAction(state, { type: "buy", sku: "headphones" }, ctx);
    const purchase = state.entitlements?.find((entry) => entry.itemId === "headphones");
    expect(purchase).toMatchObject({
      obtainedVia: "shop",
      sourceType: "threads-shop",
    });
    expect(purchase?.metadata).toMatchObject({ currency: "threads" });
  });
});

describe("AkiPals universal rewards", () => {
  const emptyFacts: RewardFacts = {
    achievementKeys: new Set(),
    achievementCities: new Set(),
    passportTiers: new Map(),
    venueVisits: [],
    completedAdventures: new Set(),
    participatedEvents: new Set(),
    campaignRequirements: new Set(),
  };

  it("evaluates Passport, adventure, event and campaign conditions generically", () => {
    const rules: RewardRule[] = [
      {
        id: "passport-malaga-3",
        title: "Passport test",
        active: true,
        match: "all",
        conditions: [{ type: "passport_tier", cityKey: "malaga", minimumTier: 3 }],
        rewards: [{ type: "cosmetic", itemId: "test-passport-item" }],
        sourceType: "passport",
        sourceId: "malaga:3",
        metadata: {},
      },
      {
        id: "campaign-test",
        title: "Campaign test",
        active: true,
        match: "any",
        conditions: [
          { type: "adventure_completed", adventureId: "gig" },
          { type: "event_participation", eventId: "event-1" },
          { type: "campaign_requirement", campaignId: "campaign-1", requirementKey: "qualified" },
        ],
        rewards: [{ type: "currency", currency: "threads", amount: 50 }],
        sourceType: "campaign",
        sourceId: "campaign-1",
        metadata: {},
      },
    ];
    const facts: RewardFacts = {
      ...emptyFacts,
      passportTiers: new Map([["malaga", 3]]),
      completedAdventures: new Set(["gig"]),
    };
    expect(evaluateRewardRules(rules, facts, new Set())).toHaveLength(2);
    expect(evaluateRewardRules(rules, facts, new Set(["passport-malaga-3"]))).toHaveLength(1);
  });

  it("expresses existing achievement keepsakes through the same rule engine", () => {
    const facts = rewardFactsFromAchievements([
      {
        key: "visit-1",
        city_key: "Málaga",
        unlocked_at: new Date(now).toISOString(),
      },
      ...Array.from({ length: 9 }, (_, index) => ({
        key: `other-${index}`,
        city_key: null,
        unlocked_at: new Date(now).toISOString(),
      })),
    ]);
    const rewards = evaluateRewardRules(
      legacyAchievementRewardRules,
      facts,
      new Set(),
    );
    expect(rewards.map((reward) => reward.ruleId)).toEqual(
      expect.arrayContaining([
        "achievement-count-1",
        "achievement-count-5",
        "achievement-count-10",
        "achievement-city-malaga",
      ]),
    );
  });
});

describe("AkiPals reusable rendering and analytics", () => {
  it("produces a UI-independent render snapshot", () => {
    const snapshot = renderSnapshotFromState(adopted());
    expect(snapshot).toMatchObject({
      version: 1,
      family: "moka",
      displayName: "Mochi",
    });
    expect(snapshot?.layers).toHaveLength(4);
    expect(snapshot?.effects).toEqual([]);
  });

  it("strips personal/location fields from analytics context", () => {
    const event: PalsAnalyticsEvent = {
      name: "item_viewed",
      occurredAt: new Date(now).toISOString(),
      itemId: "bucket-hat",
      context: {
        screen: "shop",
        latitude: "36.5",
        email: "nope@example.com",
      },
    };
    expect(sanitizePalsAnalyticsEvent(event).context).toEqual({ screen: "shop" });
  });

  it("ships the database contracts for content, provenance and reporting", () => {
    const migration = readFileSync(
      "database/migrations/20261005123000_akipals_product_foundations.sql",
      "utf8",
    );
    expect(migration).toContain("create table if not exists public.pals_items");
    expect(migration).toContain("create table if not exists public.pals_collections");
    expect(migration).toContain("create table if not exists public.pals_campaigns");
    expect(migration).toContain("create table if not exists public.pals_entitlements");
    expect(migration).toContain("create table if not exists public.pals_reward_rules");
    expect(migration).toContain("create table if not exists public.pals_analytics_events");
    expect(migration).toContain("not prestigious or price_amount is null");
    expect(migration).toContain("enable row level security");
  });
});
