import { describe, expect, it } from "vitest";
import {
  applyAction,
  DAY,
  initialState,
  RuleError,
  type Action,
  type State,
} from "../src/lib/pals/engine";
import {
  arcadeReward,
  arcadeSummary,
  MAX_ARCADE_MOVES,
  trailShortestPath,
  type ArcadeGame,
  type ArcadeRun,
} from "../src/lib/pals/arcade";
import { journeySummary } from "../src/lib/pals/journey";

const now = Date.UTC(2026, 9, 12, 12);
let seed = 3817;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}
function act(state: State, action: Action, time = now) {
  return applyAction(state, action, {
    now: time,
    random,
    id: () => crypto.randomUUID(),
  });
}
function adopted() {
  return act(initialState(now), {
    type: "adopt",
    family: "moka",
    name: "Puzzle Pal",
  });
}
function solution(run: ArcadeRun) {
  if (run.game === "trail") return trailShortestPath(run)!;
  return Array.from({ length: 6 }, (_, value) =>
    run.board.flatMap((face, index) => (face === value ? [index] : [])),
  ).flat();
}
function finish(state: State, time = now) {
  const run = state.arcade!.active!;
  return act(
    state,
    { type: "arcade-finish", runId: run.id, moves: solution(run) },
    time,
  );
}
function play(state: State, game: ArcadeGame, time = now) {
  return finish(act(state, { type: "arcade-start", game }, time), time);
}

describe("AkiPals generated arcade puzzles", () => {
  it("projects legacy saves without changing their equipment, ownership or story", () => {
    const original = act(adopted(), { type: "start", adventure: "gig" });
    const before = structuredClone(original);
    const view = arcadeSummary(original, now);
    expect(
      view.games.every(
        (game) =>
          game.dailyAvailable && game.bestScore === 0 && game.plays === 0,
      ),
    ).toBe(true);
    expect(view.active).toBeNull();
    expect(original.arcade).toBeUndefined();
    expect(original).toEqual(before);
    const started = act(original, { type: "arcade-start", game: "memory" });
    expect(started.schema).toBe(1);
    expect(started.arcade?.version).toBe(1);
    for (const key of [
      "equipment",
      "wardrobe",
      "equipped",
      "entitlements",
      "claimed",
      "claimedRewardRules",
      "run",
      "mapEnabled",
      "goal",
    ] as const)
      expect(started[key]).toEqual(before[key]);
    expect(original).toEqual(before);
  });

  it("requires adoption and rejects an unknown game without touching the save", () => {
    expect(() =>
      act(initialState(now), { type: "arcade-start", game: "memory" }),
    ).toThrow(RuleError);
    const state = adopted();
    const before = structuredClone(state);
    expect(() =>
      act(state, {
        type: "arcade-start",
        game: "free-money",
      } as unknown as Action),
    ).toThrow(RuleError);
    expect(state).toEqual(before);
  });

  it("deals exactly six shuffled pairs with a fresh server run ID", () => {
    const state = adopted();
    const first = act(state, { type: "arcade-start", game: "memory" });
    const second = act(first, { type: "arcade-start", game: "memory" });
    const run = first.arcade!.active!;
    expect(run.game).toBe("memory");
    if (run.game !== "memory") throw new Error("Wrong fixture");
    expect([...run.board].sort()).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
    expect(run.id).not.toBe(second.arcade?.active?.id);
    expect(first.threads).toBe(state.threads);
    expect(first.xp).toBe(state.xp);
    expect(() =>
      act(second, {
        type: "arcade-finish",
        runId: run.id,
        moves: solution(run),
      }),
    ).toThrow(RuleError);
  });

  it("generates solvable bounded trails with three reachable stars across random layouts", () => {
    const identities = new Set<string>();
    for (let index = 0; index < 120; index++) {
      const state = act(adopted(), { type: "arcade-start", game: "trail" });
      const run = state.arcade!.active!;
      if (run.game !== "trail") throw new Error("Wrong fixture");
      identities.add(run.id);
      expect(run.stars).toHaveLength(3);
      expect(new Set(run.stars).size).toBe(3);
      expect(
        run.stars.some(
          (star) =>
            run.blocked.includes(star) ||
            star === run.start ||
            star === run.goal,
        ),
      ).toBe(false);
      const route = trailShortestPath(run);
      expect(route).not.toBeNull();
      expect(route!.length).toBe(run.par);
      expect(route!.length).toBeLessThanOrEqual(MAX_ARCADE_MOVES);
      expect(finish(state).arcade?.lastResult?.score).toBe(1000);
    }
    expect(identities.size).toBe(120);
  });
});

describe("AkiPals arcade transcript validation", () => {
  it("replays memory guesses and derives a score from the actual submitted turns", () => {
    const state = act(adopted(), { type: "arcade-start", game: "memory" });
    const run = state.arcade!.active!;
    if (run.game !== "memory") throw new Error("Wrong fixture");
    const wrongPair = [0, run.board.findIndex((face) => face !== run.board[0])];
    const result = act(state, {
      type: "arcade-finish",
      runId: run.id,
      moves: [...wrongPair, ...solution(run)],
    });
    expect(result.arcade?.lastResult).toMatchObject({ moves: 7, score: 975 });
    expect(result.threads - state.threads).toBe(arcadeReward.threads);
    expect(result.arcade?.active).toBeNull();
    expect(state.arcade?.active?.id).toBe(run.id);
  });

  it("rejects missing pairs, same-card guesses, repeated matched cards and trailing moves", () => {
    const state = act(adopted(), { type: "arcade-start", game: "memory" });
    const before = structuredClone(state);
    const run = state.arcade!.active!;
    const solved = solution(run);
    for (const moves of [
      solved.slice(0, -2),
      [0, 0, ...solved],
      [solved[0], solved[1], ...solved],
      [...solved, 0, 1],
      [12, 13, ...solved],
    ]) {
      expect(() =>
        act(state, { type: "arcade-finish", runId: run.id, moves }),
      ).toThrow(RuleError);
      expect(state).toEqual(before);
    }
  });

  it("rejects teleporting, rocks, an incomplete trail and steps after the finish", () => {
    const state = act(adopted(), { type: "arcade-start", game: "trail" });
    const before = structuredClone(state);
    const run = state.arcade!.active!;
    if (run.game !== "trail") throw new Error("Wrong fixture");
    const solved = solution(run);
    for (const moves of [
      [run.goal],
      [run.blocked[0]],
      solved.slice(0, -1),
      [...solved, solved[solved.length - 2]],
    ]) {
      expect(() =>
        act(state, { type: "arcade-finish", runId: run.id, moves }),
      ).toThrow(RuleError);
      expect(state).toEqual(before);
    }
  });

  it("bounds and validates every submitted move independently of the HTTP schema", () => {
    const state = act(adopted(), { type: "arcade-start", game: "memory" });
    for (const moves of [
      [],
      Array(MAX_ARCADE_MOVES + 1).fill(0),
      [-1],
      [25],
      [1.5],
      [NaN],
      [Infinity],
      ["0"],
      null,
    ])
      expect(() =>
        act(state, {
          type: "arcade-finish",
          runId: state.arcade!.active!.id,
          moves,
        } as unknown as Action),
      ).toThrow(RuleError);
    expect(state.arcade?.lastResult).toBeNull();
  });

  it("rejects a stale or already-finished run without regranting rewards", () => {
    const started = act(adopted(), { type: "arcade-start", game: "memory" });
    const run = started.arcade!.active!;
    const finished = finish(started);
    const before = structuredClone(finished);
    expect(() =>
      act(finished, {
        type: "arcade-finish",
        runId: run.id,
        moves: solution(run),
      }),
    ).toThrow(RuleError);
    expect(finished).toEqual(before);
  });
});

describe("AkiPals capped arcade rewards and progression", () => {
  it("grants one modest daily reward per game while free practice still counts as play", () => {
    const original = adopted();
    let state = original;
    for (const game of ["memory", "trail"] as const) {
      state = play(state, game);
      expect(state.arcade?.lastResult?.rewarded).toBe(true);
      state = play(state, game);
      expect(state.arcade?.lastResult?.rewarded).toBe(false);
    }
    expect(state.threads - original.threads).toBe(40);
    expect(state.scrap - original.scrap).toBe(16);
    expect(state.xp - original.xp).toBe(20);
    expect(
      arcadeSummary(state, now).games.every(
        (game) => !game.dailyAvailable && game.plays === 2,
      ),
    ).toBe(true);
    expect(
      journeySummary(state, now).daily.tasks.find((task) => task.id === "play")
        ?.done,
    ).toBe(true);
    expect(journeySummary(state, now).weekly.completed).toBe(0);
  });

  it("counts only a validated finish as play, including a practice finish on another day", () => {
    const started = act(adopted(), { type: "arcade-start", game: "memory" });
    expect(
      journeySummary(started, now).daily.tasks.find(
        (task) => task.id === "play",
      )?.done,
    ).toBe(false);
    const completed = finish(started);
    const another = act(
      completed,
      { type: "arcade-start", game: "memory" },
      now + DAY,
    );
    expect(
      journeySummary(another, now + DAY).daily.tasks.find(
        (task) => task.id === "play",
      )?.done,
    ).toBe(false);
    const nextDay = finish(another, now + DAY);
    expect(nextDay.threads - another.threads).toBe(20);
    expect(nextDay.arcade?.lastResult?.rewarded).toBe(true);
  });

  it("does not reopen claimed days when the server clock moves backwards", () => {
    let state = play(adopted(), "memory", now + DAY);
    const balance = state.threads;
    state = play(state, "memory", now);
    expect(state.threads).toBe(balance);
    expect(arcadeSummary(state, now).games[0].dailyAvailable).toBe(false);
    state = play(state, "memory", now + DAY);
    expect(state.threads).toBe(balance);
    state = play(state, "memory", now + 2 * DAY);
    expect(state.threads).toBe(balance + 20);
  });

  it("keeps personal bests and fixed-size summaries without saving move history", () => {
    let state = play(adopted(), "memory");
    for (let index = 0; index < 100; index++) state = play(state, "memory");
    expect(state.arcade?.plays.memory).toBe(101);
    expect(state.arcade?.bestScores.memory).toBe(1000);
    expect(state.arcade?.lastResult?.personalBest).toBe(false);
    expect(state.arcade?.active).toBeNull();
    expect(JSON.stringify(state.arcade).length).toBeLessThan(1000);
    expect(new TextEncoder().encode(JSON.stringify(state)).length).toBeLessThan(
      131072,
    );
    expect(state.equipment).toHaveLength(4);
    expect(state.entitlements).toHaveLength(4);
  });
});
