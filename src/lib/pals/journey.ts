import type { State } from "./engine";

const UTC_DAY = 86_400_000;

export const careActivities = [
  {
    id: "snack",
    label: "Share a snack",
    description: "A little treat and a lot of crumbs.",
  },
  {
    id: "play",
    label: "Have a play",
    description: "Make time for a little silliness.",
  },
  {
    id: "rest",
    label: "Take a breather",
    description: "Good company. Absolutely no rush.",
  },
] as const;

export type CareActivity = (typeof careActivities)[number]["id"];
export type JourneyPeriod = "day" | "week";
export type JourneyTask = "care" | "style" | "play";
export type JourneyProgress = {
  version: 1;
  daily: {
    day: number;
    care: CareActivity[];
    tasks: JourneyTask[];
    claimed: boolean;
  };
  weekly: { week: number; adventures: string[]; claimed: boolean };
  /** Completed rewards wait indefinitely; unfinished days never create a debt. */
  banked: Record<JourneyPeriod, number>;
};

export type JourneyActivity =
  | { type: "care"; activity: CareActivity }
  | { type: "style" }
  /** Call only after the server has validated a completed story or arcade run. */
  | { type: "play"; adventureId?: string };

export const journeyRewards = {
  day: { threads: 25, scrap: 10, xp: 15 },
  week: { threads: 70, scrap: 30, xp: 40 },
} as const;

const dailyTasks = [
  {
    id: "care",
    label: "A moment together",
    description: "Share a snack, have a play or take a breather.",
    targetTab: "home",
  },
  {
    id: "style",
    label: "Make it yours",
    description: "Change your look, family or equipment setup.",
    targetTab: "wardrobe",
  },
  {
    id: "play",
    label: "Make a little memory",
    description: "Finish a story or an arcade game. Practice counts too.",
    targetTab: "adventures",
  },
] as const;

const bondRanks = [
  { xp: 0, title: "New pals" },
  { xp: 60, title: "Getting closer" },
  { xp: 150, title: "Adventure buddies" },
  { xp: 300, title: "Good company" },
  { xp: 550, title: "Partners in plans" },
  { xp: 900, title: "Side by side" },
  { xp: 1400, title: "Little legends" },
  { xp: 2100, title: "Inseparable" },
  { xp: 3000, title: "Dream team" },
  { xp: 4200, title: "Friends for life" },
] as const;

function weekStart(day: number) {
  // The Unix epoch was a Thursday. A week starts on Monday at 00:00 UTC.
  return day - ((((day + 3) % 7) + 7) % 7);
}

function freshJourney(day: number): JourneyProgress {
  return {
    version: 1,
    daily: { day, care: [], tasks: [], claimed: false },
    weekly: { week: weekStart(day), adventures: [], claimed: false },
    banked: { day: 0, week: 0 },
  };
}

function dailyComplete(progress: JourneyProgress) {
  return dailyTasks.every((task) => progress.daily.tasks.includes(task.id));
}

function weeklyComplete(progress: JourneyProgress) {
  return progress.weekly.adventures.length >= 3;
}

/** Read-only projection, including legacy saves and elapsed UTC periods. */
function progressAt(state: State, now: number): JourneyProgress {
  const requestedDay = Math.floor(now / UTC_DAY);
  if (!state.journey) {
    const progress = freshJourney(requestedDay);
    // Existing recent story receipts remain valid progress after the upgrade.
    for (const receipt of state.rewards) {
      const match = /^(\d+):([a-z][a-z0-9-]{0,79})$/.exec(receipt);
      if (!match) continue;
      const day = Number(match[1]);
      const adventure = match[2];
      if (day === requestedDay && !progress.daily.tasks.includes("play"))
        progress.daily.tasks.push("play");
      if (
        day >= progress.weekly.week &&
        day <= requestedDay &&
        !progress.weekly.adventures.includes(adventure)
      )
        progress.weekly.adventures.push(adventure);
    }
    return progress;
  }
  const progress = structuredClone(state.journey);
  // A backwards clock must never reopen a rewarded day or week.
  const day = Math.max(requestedDay, progress.daily.day);
  const week = Math.max(weekStart(day), progress.weekly.week);
  if (day > progress.daily.day) {
    if (dailyComplete(progress) && !progress.daily.claimed)
      progress.banked.day += 1;
    progress.daily = { day, care: [], tasks: [], claimed: false };
  }
  if (week > progress.weekly.week) {
    if (weeklyComplete(progress) && !progress.weekly.claimed)
      progress.banked.week += 1;
    progress.weekly = { week, adventures: [], claimed: false };
  }
  return progress;
}

function availableBonuses(progress: JourneyProgress, period: JourneyPeriod) {
  const completed =
    period === "day" ? dailyComplete(progress) : weeklyComplete(progress);
  const claimed =
    period === "day" ? progress.daily.claimed : progress.weekly.claimed;
  return progress.banked[period] + Number(completed && !claimed);
}

/** Every value is derived from the saved account and server time, never a score supplied by the browser. */
export function journeySummary(state: State, now: number) {
  const progress = progressAt(state, now);
  const xp = Math.max(0, state.xp);
  let rankIndex = 0;
  for (let index = 1; index < bondRanks.length; index++)
    if (xp >= bondRanks[index].xp) rankIndex = index;
  const rank = bondRanks[rankIndex];
  const nextRank = bondRanks[rankIndex + 1];
  const dailyAvailable = availableBonuses(progress, "day");
  const weeklyAvailable = availableBonuses(progress, "week");
  return {
    bond: {
      xp,
      level: rankIndex + 1,
      title: rank.title,
      nextTitle: nextRank?.title ?? null,
      nextAt: nextRank?.xp ?? null,
      remaining: nextRank ? nextRank.xp - xp : 0,
      percent: nextRank
        ? Math.floor(((xp - rank.xp) / (nextRank.xp - rank.xp)) * 100)
        : 100,
    },
    care: careActivities.map((activity) => ({
      ...activity,
      done: progress.daily.care.includes(activity.id),
      xp: 5,
    })),
    daily: {
      key: progress.daily.day,
      tasks: dailyTasks.map((task) => ({
        ...task,
        done: progress.daily.tasks.includes(task.id),
      })),
      completed: dailyTasks.filter((task) =>
        progress.daily.tasks.includes(task.id),
      ).length,
      total: dailyTasks.length,
      ready: dailyAvailable > 0,
      claimed: progress.daily.claimed,
      banked: progress.banked.day,
      availableBonuses: dailyAvailable,
      reward: journeyRewards.day,
    },
    weekly: {
      key: progress.weekly.week,
      adventures: [...progress.weekly.adventures],
      completed: Math.min(3, progress.weekly.adventures.length),
      total: 3,
      ready: weeklyAvailable > 0,
      claimed: progress.weekly.claimed,
      banked: progress.banked.week,
      availableBonuses: weeklyAvailable,
      reward: journeyRewards.week,
    },
    nextDailyAt: (progress.daily.day + 1) * UTC_DAY,
    nextWeeklyAt: (progress.weekly.week + 7) * UTC_DAY,
  };
}

/** Mutates only the engine's cloned candidate; pals_commit remains the atomic persistence boundary. */
export function recordJourneyActivity(
  state: State,
  activity: JourneyActivity,
  now: number,
) {
  const progress = progressAt(state, now);
  let xp = 0;
  if (activity.type === "care") {
    if (!progress.daily.care.includes(activity.activity)) {
      progress.daily.care.push(activity.activity);
      state.xp += 5;
      xp = 5;
    }
  }
  if (!progress.daily.tasks.includes(activity.type))
    progress.daily.tasks.push(activity.type);
  if (
    activity.type === "play" &&
    activity.adventureId &&
    !progress.weekly.adventures.includes(activity.adventureId)
  )
    progress.weekly.adventures.push(activity.adventureId);
  state.journey = progress;
  return { xp };
}

export function claimJourneyReward(
  state: State,
  period: JourneyPeriod,
  now: number,
) {
  const progress = progressAt(state, now);
  const count = availableBonuses(progress, period);
  if (count < 1) return null;
  const reward = journeyRewards[period];
  const granted = {
    count,
    threads: reward.threads * count,
    scrap: reward.scrap * count,
    xp: reward.xp * count,
  };
  state.threads += granted.threads;
  state.scrap += granted.scrap;
  state.xp += granted.xp;
  progress.banked[period] = 0;
  if (period === "day" && dailyComplete(progress))
    progress.daily.claimed = true;
  if (period === "week" && weeklyComplete(progress))
    progress.weekly.claimed = true;
  state.journey = progress;
  return granted;
}
