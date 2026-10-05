import type { RewardFacts, RewardRule } from "./rewards";

export type AchievementRewardFact = {
  key: string;
  city_key: string | null;
  unlocked_at: string | null;
  archived?: boolean;
};

const rewardCities = [
  ["fuengirola", "Fuengirola"],
  ["malaga", "Málaga"],
  ["marbella", "Marbella"],
  ["granada", "Granada"],
  ["sevilla", "Sevilla"],
  ["madrid", "Madrid"],
] as const;

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function rewardFactsFromAchievements(
  achievements: AchievementRewardFact[],
): RewardFacts {
  const unlocked = achievements.filter(
    (achievement) => Boolean(achievement.unlocked_at) && !achievement.archived,
  );
  return {
    achievementKeys: new Set(unlocked.map((achievement) => achievement.key)),
    achievementCities: new Set(
      unlocked.flatMap((achievement) =>
        achievement.city_key ? [normalizeKey(achievement.city_key)] : [],
      ),
    ),
    passportTiers: new Map(),
    venueVisits: [],
    completedAdventures: new Set(),
    participatedEvents: new Set(),
    campaignRequirements: new Set(),
  };
}

export const legacyAchievementRewardRules: RewardRule[] = [
  {
    id: "achievement-count-1",
    title: "First discovery keepsake",
    active: true,
    match: "all",
    conditions: [{ type: "achievement_count", minimumCount: 1 }],
    rewards: [{ type: "cosmetic", itemId: "city-cup" }],
    sourceType: "achievement",
    sourceId: "achievement-count-1",
    metadata: { legacyClaimKey: "city-cup" },
  },
  {
    id: "achievement-count-5",
    title: "Explorer keepsake",
    active: true,
    match: "all",
    conditions: [{ type: "achievement_count", minimumCount: 5 }],
    rewards: [{ type: "cosmetic", itemId: "explorer-medal" }],
    sourceType: "achievement",
    sourceId: "achievement-count-5",
    metadata: { legacyClaimKey: "explorer-medal" },
  },
  {
    id: "achievement-count-10",
    title: "Master keepsake",
    active: true,
    match: "all",
    conditions: [{ type: "achievement_count", minimumCount: 10 }],
    rewards: [{ type: "cosmetic", itemId: "master-crown" }],
    sourceType: "achievement",
    sourceId: "achievement-count-10",
    metadata: { legacyClaimKey: "master-crown" },
  },
  ...rewardCities.map<RewardRule>(([key, name]) => ({
    id: `achievement-city-${key}`,
    title: `${name} keepsake`,
    active: true,
    match: "all",
    conditions: [{ type: "achievement_in_city", cityKey: key }],
    rewards: [{ type: "cosmetic", itemId: `city-${key}` }],
    sourceType: "city",
    sourceId: key,
    metadata: { legacyClaimKey: `city-${key}` },
  })),
];
