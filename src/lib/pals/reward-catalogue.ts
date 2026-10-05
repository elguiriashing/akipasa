import { cityCollections, type EarnedAchievement } from "./engine";
import type { RewardFacts, RewardRule } from "./rewards";

export function rewardFactsFromAchievements(
  achievements: EarnedAchievement[],
): RewardFacts {
  const unlocked = achievements.filter(
    (achievement) => Boolean(achievement.unlocked_at) && !achievement.archived,
  );
  return {
    achievementKeys: new Set(unlocked.map((achievement) => achievement.key)),
    achievementCities: new Set(
      unlocked.flatMap((achievement) => (achievement.city_key ? [achievement.city_key] : [])),
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
  ...cityCollections.map<RewardRule>((city) => ({
    id: `achievement-city-${city.key}`,
    title: `${city.name} keepsake`,
    active: true,
    match: "all",
    conditions: [{ type: "achievement_in_city", cityKey: city.key }],
    rewards: [{ type: "cosmetic", itemId: `city-${city.key}` }],
    sourceType: "city",
    sourceId: city.key,
    metadata: { legacyClaimKey: `city-${city.key}` },
  })),
];
