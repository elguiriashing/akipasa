import type { Entitlement } from "./entitlements";

export type RewardCondition =
  | { type: "achievement_unlocked"; achievementKey: string }
  | { type: "achievement_count"; minimumCount: number }
  | { type: "achievement_in_city"; cityKey: string }
  | {
      type: "passport_tier";
      cityKey: string;
      categoryKey?: string | null;
      minimumTier: number;
    }
  | {
      type: "venue_visits";
      cityKey?: string | null;
      categoryKey?: string | null;
      minimumVisits: number;
    }
  | { type: "adventure_completed"; adventureId: string }
  | { type: "event_participation"; eventId: string }
  | {
      type: "campaign_requirement";
      campaignId: string;
      requirementKey: string;
    };

export type RewardGrant =
  | { type: "cosmetic"; itemId: string; quantity?: number }
  | {
      type: "collection_item";
      collectionId: string;
      itemId: string;
      quantity?: number;
    }
  | { type: "currency"; currency: "threads" | "scrap"; amount: number }
  | { type: "title"; titleId: string }
  | { type: "badge"; badgeId: string }
  | { type: "effect"; effectItemId: string };

export type RewardRule = {
  id: string;
  title: string;
  active: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  match: "all" | "any";
  conditions: RewardCondition[];
  rewards: RewardGrant[];
  sourceType: string;
  sourceId?: string | null;
  metadata: Record<string, unknown>;
};

export type RewardFacts = {
  achievementKeys: Set<string>;
  achievementCities: Set<string>;
  passportTiers: Map<string, number>;
  venueVisits: Array<{ cityKey?: string | null; categoryKey?: string | null }>;
  completedAdventures: Set<string>;
  participatedEvents: Set<string>;
  campaignRequirements: Set<string>;
};

export type RewardResolution = {
  ruleId: string;
  rewards: RewardGrant[];
  entitlementDrafts: Omit<Entitlement, "id" | "grantedAt">[];
};

function conditionKey(city: string, category?: string | null) {
  return category ? `${city}:${category}` : city;
}

export function conditionSatisfied(
  condition: RewardCondition,
  facts: RewardFacts,
) {
  switch (condition.type) {
    case "achievement_unlocked":
      return facts.achievementKeys.has(condition.achievementKey);
    case "achievement_count":
      return facts.achievementKeys.size >= condition.minimumCount;
    case "achievement_in_city":
      return facts.achievementCities.has(condition.cityKey);
    case "passport_tier":
      return (
        (facts.passportTiers.get(
          conditionKey(condition.cityKey, condition.categoryKey),
        ) ?? 0) >= condition.minimumTier
      );
    case "venue_visits":
      return (
        facts.venueVisits.filter(
          (visit) =>
            (!condition.cityKey || visit.cityKey === condition.cityKey) &&
            (!condition.categoryKey ||
              visit.categoryKey === condition.categoryKey),
        ).length >= condition.minimumVisits
      );
    case "adventure_completed":
      return facts.completedAdventures.has(condition.adventureId);
    case "event_participation":
      return facts.participatedEvents.has(condition.eventId);
    case "campaign_requirement":
      return facts.campaignRequirements.has(
        `${condition.campaignId}:${condition.requirementKey}`,
      );
  }
}

export function ruleAvailable(rule: RewardRule, now = new Date()) {
  const time = now.getTime();
  return (
    rule.active &&
    (!rule.startsAt || Date.parse(rule.startsAt) <= time) &&
    (!rule.endsAt || Date.parse(rule.endsAt) > time)
  );
}

export function evaluateRewardRule(
  rule: RewardRule,
  facts: RewardFacts,
  now = new Date(),
): RewardResolution | null {
  if (!ruleAvailable(rule, now)) return null;
  const matches = rule.conditions.map((condition) =>
    conditionSatisfied(condition, facts),
  );
  const matched =
    rule.match === "all" ? matches.every(Boolean) : matches.some(Boolean);
  if (!matched) return null;

  const entitlementDrafts = rule.rewards.flatMap((reward) => {
    const itemId =
      reward.type === "cosmetic"
        ? reward.itemId
        : reward.type === "collection_item"
          ? reward.itemId
          : reward.type === "effect"
            ? reward.effectItemId
            : null;
    if (!itemId) return [];
    return [
      {
        itemId,
        obtainedVia: rule.sourceType as Entitlement["obtainedVia"],
        sourceType: rule.sourceType,
        sourceId: rule.sourceId ?? rule.id,
        expiresAt: null,
        quantity: "quantity" in reward ? (reward.quantity ?? 1) : 1,
        status: "active" as const,
        metadata: { rewardRuleId: rule.id, ...rule.metadata },
      },
    ];
  });

  return { ruleId: rule.id, rewards: rule.rewards, entitlementDrafts };
}

export function evaluateRewardRules(
  rules: RewardRule[],
  facts: RewardFacts,
  alreadyClaimed: Set<string>,
  now = new Date(),
) {
  return rules
    .filter((rule) => !alreadyClaimed.has(rule.id))
    .map((rule) => evaluateRewardRule(rule, facts, now))
    .filter((value): value is RewardResolution => Boolean(value));
}
