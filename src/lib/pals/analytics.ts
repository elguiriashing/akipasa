export const palsAnalyticsEvents = [
  "collection_viewed",
  "item_viewed",
  "item_unlocked",
  "item_equipped",
  "item_unequipped",
  "shop_item_purchased",
  "reward_claimed",
  "adventure_reward_earned",
  "campaign_reward_earned",
] as const;

export type PalsAnalyticsEventName = (typeof palsAnalyticsEvents)[number];

export type PalsAnalyticsEvent = {
  name: PalsAnalyticsEventName;
  occurredAt: string;
  itemId?: string;
  collectionId?: string;
  campaignId?: string;
  adventureId?: string;
  rewardRuleId?: string;
  currency?: "threads" | "scrap";
  amount?: number;
  context?: Record<string, string | number | boolean | null>;
};

const forbiddenKeys = new Set([
  "latitude",
  "longitude",
  "email",
  "name",
  "display_name",
  "address",
  "ip",
]);

export function sanitizePalsAnalyticsEvent(event: PalsAnalyticsEvent) {
  if (!palsAnalyticsEvents.includes(event.name))
    throw new Error("Unknown AkiPals analytics event");
  const context = Object.fromEntries(
    Object.entries(event.context ?? {}).filter(
      ([key, value]) =>
        !forbiddenKeys.has(key.toLowerCase()) &&
        (["string", "number", "boolean"].includes(typeof value) ||
          value === null),
    ),
  );
  return { ...event, context };
}
