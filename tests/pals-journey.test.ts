import { describe, expect, it } from "vitest";
import {
  adventures,
  applyAction,
  DAY,
  initialState,
  stats,
  type Action,
  type State,
} from "../src/lib/pals/engine";
import { journeySummary, recordJourneyActivity } from "../src/lib/pals/journey";

const now = Date.UTC(2026, 9, 12, 12);
let nextId = 0;

function act(state: State, action: Action, time = now) {
  return applyAction(state, action, {
    now: time,
    id: () => `journey-${++nextId}`,
    random: () => 0.2,
  });
}

function adopted() {
  return act(initialState(now), {
    type: "adopt",
    family: "moka",
    name: "Little legend",
  });
}

function finishStory(state: State, id = "gig", time = now) {
  let next = state.run ? act(state, { type: "leave" }, time) : state;
  next = act(next, { type: "start", adventure: id }, time);
  for (const step of adventures.find((story) => story.id === id)!.steps)
    next = act(
      next,
      {
        type: "choice",
        index: step.options.findIndex((option) => option.need === 3),
      },
      time,
    );
  return next;
}

function completeDay(state = adopted(), time = now) {
  let next = act(state, { type: "care", activity: "snack" }, time);
  next = act(
    next,
    { type: "family", family: next.family === "moka" ? "brasa" : "moka" },
    time,
  );
  return finishStory(next, "gig", time);
}

describe("AkiPals friendship and care", () => {
  it("requires an adopted Pal and rejects invented activities or reward periods", () => {
    expect(() =>
      act(initialState(now), { type: "care", activity: "snack" }),
    ).toThrow();
    expect(() =>
      act(initialState(now), { type: "journey-claim", period: "day" }),
    ).toThrow();
    const state = adopted();
    const before = structuredClone(state);
    expect(() =>
      act(state, {
        type: "care",
        activity: "infinite-xp",
      } as unknown as Action),
    ).toThrow();
    expect(() =>
      act(state, {
        type: "journey-claim",
        period: "forever",
      } as unknown as Action),
    ).toThrow();
    expect(state).toEqual(before);
  });

  it("rewards each care moment once per UTC day and allows repeats for fun", () => {
    const original = adopted();
    let state = original;
    for (const activity of ["snack", "play", "rest"] as const) {
      state = act(state, { type: "care", activity });
      state = act(state, { type: "care", activity });
    }
    expect(state.xp).toBe(original.xp + 15);
    expect(state.threads).toBe(original.threads);
    expect(state.scrap).toBe(original.scrap);
    expect(state.equipment).toEqual(original.equipment);
    expect(state.wardrobe).toEqual(original.wardrobe);
    expect(stats(state)).toEqual(stats(original));
    expect(state.mapEnabled).toBe(false);
    expect(journeySummary(state, now).care.every((entry) => entry.done)).toBe(
      true,
    );
    expect(state.report.text).toContain("Just for fun");
    state = act(state, { type: "care", activity: "snack" }, now + DAY);
    expect(state.xp).toBe(original.xp + 20);
    expect(
      journeySummary(state, now + DAY).care.filter((entry) => entry.done),
    ).toHaveLength(1);
  });

  it("uses existing XP for permanent ranks without shrinking after an absence", () => {
    const state = adopted();
    state.xp = 149;
    expect(journeySummary(state, now).bond).toMatchObject({
      level: 2,
      title: "Getting closer",
      remaining: 1,
      nextAt: 150,
    });
    const next = act(state, { type: "care", activity: "rest" });
    const bond = journeySummary(next, now).bond;
    expect(bond.level).toBe(3);
    expect(bond.xp).toBe(154);
    expect(journeySummary(next, now + 400 * DAY).bond).toEqual(bond);
    state.xp = 100_000;
    expect(journeySummary(state, now).bond).toMatchObject({
      level: 10,
      percent: 100,
      nextAt: null,
      remaining: 0,
    });
  });
});

describe("AkiPals daily activity rewards", () => {
  it("grants an exact optional bonus only after all three real activities", () => {
    const incomplete = act(adopted(), { type: "care", activity: "snack" });
    expect(journeySummary(incomplete, now).daily.completed).toBe(2);
    expect(() =>
      act(incomplete, { type: "journey-claim", period: "day" }),
    ).toThrow();
    const complete = finishStory(incomplete);
    expect(journeySummary(complete, now).daily).toMatchObject({
      completed: 3,
      total: 3,
      ready: true,
      claimed: false,
      availableBonuses: 1,
    });
    const claimed = act(complete, { type: "journey-claim", period: "day" });
    expect(claimed.threads - complete.threads).toBe(25);
    expect(claimed.scrap - complete.scrap).toBe(10);
    expect(claimed.xp - complete.xp).toBe(15);
    expect(journeySummary(claimed, now).daily.ready).toBe(false);
    expect(() =>
      act(claimed, { type: "journey-claim", period: "day" }),
    ).toThrow();
    expect(complete.journey?.daily.claimed).toBe(false);
  });

  it("does not count no-op styling, opening a story or unfinished choices", () => {
    let state = adopted();
    const later = now + DAY;
    state = act(state, { type: "equip", itemId: state.equipment[0].id }, later);
    state = act(state, { type: "family", family: "moka" }, later);
    state = act(
      state,
      {
        type: "appearance",
        itemId: state.equipment[0].id,
        appearance: state.equipment[0].appearance,
      },
      later,
    );
    state = act(state, { type: "start", adventure: "gig" }, later);
    state = act(state, { type: "choice", index: 0 }, later);
    expect(journeySummary(state, later).daily.completed).toBe(0);
    state = act(
      state,
      { type: "module", itemId: state.equipment[0].id, index: 0, stat: "wits" },
      later,
    );
    expect(
      journeySummary(state, later).daily.tasks.find(
        (task) => task.id === "style",
      )?.done,
    ).toBe(true);
    expect(
      journeySummary(state, later).daily.tasks.find(
        (task) => task.id === "play",
      )?.done,
    ).toBe(false);
  });

  it("banks completed rewards across midnight and collects old and new bonuses together", () => {
    const complete = completeDay();
    const original = structuredClone(complete);
    const tomorrow = now + DAY;
    const view = journeySummary(complete, tomorrow);
    expect(view.daily).toMatchObject({ completed: 0, banked: 1, ready: true });
    expect(complete).toEqual(original);
    const twice = completeDay(complete, tomorrow);
    expect(journeySummary(twice, tomorrow).daily.availableBonuses).toBe(2);
    const claimed = act(
      twice,
      { type: "journey-claim", period: "day" },
      tomorrow,
    );
    expect(claimed.threads - twice.threads).toBe(50);
    expect(claimed.scrap - twice.scrap).toBe(20);
    expect(claimed.xp - twice.xp).toBe(30);
    expect(journeySummary(claimed, tomorrow).daily).toMatchObject({
      banked: 0,
      availableBonuses: 0,
      claimed: true,
    });
  });

  it("keeps one earned bonus after a long absence without awarding missed days", () => {
    const complete = completeDay();
    const later = now + 365 * DAY;
    expect(journeySummary(complete, later).daily.availableBonuses).toBe(1);
    const claim = act(
      complete,
      { type: "journey-claim", period: "day" },
      later,
    );
    expect(claim.threads - complete.threads).toBe(25);
    expect(journeySummary(claim, later).daily.completed).toBe(0);
    expect(journeySummary(claim, later + DAY).daily.availableBonuses).toBe(0);
    expect(journeySummary(adopted(), later).daily.availableBonuses).toBe(0);
  });

  it("does not reopen a claimed reward when the server clock moves backwards", () => {
    let state = completeDay(adopted(), now + DAY);
    state = act(state, { type: "journey-claim", period: "day" }, now + DAY);
    expect(journeySummary(state, now).daily.ready).toBe(false);
    expect(() =>
      act(state, { type: "journey-claim", period: "day" }, now),
    ).toThrow();
    const xp = state.xp;
    state = act(state, { type: "care", activity: "snack" }, now);
    expect(state.xp).toBe(xp);
  });
});

describe("AkiPals weekly stories and arcade integration", () => {
  it("requires three distinct stories and does not count repeat runs twice", () => {
    let state = adopted();
    for (let index = 0; index < 3; index++) state = finishStory(state, "gig");
    expect(journeySummary(state, now).weekly.completed).toBe(1);
    expect(() =>
      act(state, { type: "journey-claim", period: "week" }),
    ).toThrow();
    for (const story of adventures
      .filter((entry) => entry.id !== "gig")
      .slice(0, 2))
      state = finishStory(state, story.id);
    expect(journeySummary(state, now).weekly.ready).toBe(true);
    const claimed = act(state, { type: "journey-claim", period: "week" });
    expect(claimed.threads - state.threads).toBe(70);
    expect(claimed.scrap - state.scrap).toBe(30);
    expect(claimed.xp - state.xp).toBe(40);
    expect(() =>
      act(claimed, { type: "journey-claim", period: "week" }),
    ).toThrow();
  });

  it("rolls over at Monday 00:00 UTC and preserves an earned weekly reward", () => {
    let state = adopted();
    for (const story of adventures.slice(0, 3))
      state = finishStory(state, story.id);
    const monday = Date.UTC(2026, 9, 19);
    expect(journeySummary(state, monday - 1).weekly.completed).toBe(3);
    expect(journeySummary(state, monday).weekly).toMatchObject({
      completed: 0,
      banked: 1,
      ready: true,
    });
    expect(journeySummary(state, now).nextWeeklyAt).toBe(monday);
    const claimed = act(
      state,
      { type: "journey-claim", period: "week" },
      monday,
    );
    expect(
      journeySummary(claimed, monday + 7 * DAY).weekly.availableBonuses,
    ).toBe(0);
  });

  it("lets a server-validated arcade completion satisfy daily play without inventing weekly stories", () => {
    const state = adopted();
    const balances = {
      threads: state.threads,
      scrap: state.scrap,
      xp: state.xp,
    };
    recordJourneyActivity(state, { type: "play" }, now);
    expect(
      journeySummary(state, now).daily.tasks.find((task) => task.id === "play")
        ?.done,
    ).toBe(true);
    expect(journeySummary(state, now).weekly.completed).toBe(0);
    expect({
      threads: state.threads,
      scrap: state.scrap,
      xp: state.xp,
    }).toEqual(balances);
  });

  it("projects legacy saved XP and valid recent story receipts without changing the save", () => {
    const state = adopted();
    delete state.journey;
    state.xp = 225;
    const day = Math.floor(now / DAY);
    state.rewards = [
      `${day}:gig`,
      `${day}:cafe`,
      `${day}:gig`,
      `${day - 1}:old-week-story`,
      `${day + 1}:future-story`,
      `${day}:arcade:fake`,
      "not-a-receipt",
    ];
    const before = structuredClone(state);
    const view = journeySummary(state, now);
    expect(view.bond.xp).toBe(225);
    expect(view.weekly.adventures).toEqual(["gig", "cafe"]);
    expect(view.daily.tasks.find((task) => task.id === "play")?.done).toBe(
      true,
    );
    expect(state).toEqual(before);
    const upgraded = act(state, { type: "care", activity: "rest" });
    expect(upgraded.schema).toBe(1);
    expect(upgraded.journey?.version).toBe(1);
    expect(upgraded.equipment).toEqual(before.equipment);
    expect(upgraded.entitlements).toEqual(before.entitlements);
    expect(upgraded.claimed).toEqual(before.claimed);
    expect(upgraded.xp).toBe(230);
  });
});
