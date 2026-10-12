import type { Context, State } from "./engine";

const UTC_DAY = 86_400_000;
export const MAX_ARCADE_MOVES = 128;
export const arcadeReward = { threads: 20, scrap: 8, xp: 10 } as const;
export type ArcadeGame = "memory" | "trail";

type RunIdentity = { id: string; startedAt: number };
export type MemoryRun = RunIdentity & {
  game: "memory";
  board: number[];
};
export type TrailRun = RunIdentity & {
  game: "trail";
  size: 5;
  blocked: number[];
  stars: number[];
  start: number;
  goal: number;
  par: number;
};
export type ArcadeRun = MemoryRun | TrailRun;
export type ArcadeResult = {
  runId: string;
  game: ArcadeGame;
  score: number;
  moves: number;
  rewarded: boolean;
  personalBest: boolean;
  completedAt: number;
};
/** One active challenge and fixed-size summaries; move transcripts are never accumulated in saves. */
export type ArcadeProgress = {
  version: 1;
  day: number;
  active: ArcadeRun | null;
  earnedOn: Record<ArcadeGame, number>;
  bestScores: Record<ArcadeGame, number>;
  plays: Record<ArcadeGame, number>;
  lastResult: ArcadeResult | null;
};

export class ArcadeRuleError extends Error {}
function reject(message: string): never {
  throw new ArcadeRuleError(message);
}

const games = [
  {
    id: "memory" as const,
    name: "Memory Mix",
    description:
      "Six pairs of familiar little faces. Find who belongs together.",
    skill: "Memory & discovery",
  },
  {
    id: "trail" as const,
    name: "Trail Finder",
    description: "Find the three stars, then bring your Pal to the flag.",
    skill: "Routes & planning",
  },
];

function progressAt(state: State, now: number): ArcadeProgress {
  const requestedDay = Math.floor(now / UTC_DAY);
  if (!Number.isSafeInteger(requestedDay) || requestedDay < 0)
    reject("The arcade clock is unavailable. Please try again.");
  if (!state.arcade)
    return {
      version: 1,
      day: requestedDay,
      active: null,
      earnedOn: { memory: -1, trail: -1 },
      bestScores: { memory: 0, trail: 0 },
      plays: { memory: 0, trail: 0 },
      lastResult: null,
    };
  if (state.arcade.version !== 1)
    reject("This arcade save needs a newer version of AkiPals.");
  const progress = structuredClone(state.arcade);
  // Never reopen an earned period when a server clock moves backwards.
  progress.day = Math.max(requestedDay, progress.day);
  return progress;
}

function shuffle<T>(items: T[], ctx: Context): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const random = ctx.random();
    if (!Number.isFinite(random) || random < 0 || random >= 1)
      reject("A new puzzle could not be prepared. Please try again.");
    const target = Math.floor(random * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function neighbours(position: number, size: number) {
  const row = Math.floor(position / size);
  const col = position % size;
  return [
    ...(row > 0 ? [position - size] : []),
    ...(row < size - 1 ? [position + size] : []),
    ...(col > 0 ? [position - 1] : []),
    ...(col < size - 1 ? [position + 1] : []),
  ];
}

/** At most 25 cells × 8 star states; used only for a small server-owned board. */
export function trailShortestPath(
  run: Pick<TrailRun, "size" | "blocked" | "stars" | "start" | "goal">,
) {
  const queue = [{ position: run.start, stars: 0, route: [] as number[] }];
  const seen = new Set([`${run.start}:0`]);
  for (let cursor = 0; cursor < queue.length && cursor < 200; cursor++) {
    const current = queue[cursor];
    if (current.position === run.goal && current.stars === 7)
      return current.route;
    for (const next of neighbours(current.position, run.size)) {
      if (run.blocked.includes(next)) continue;
      const star = run.stars.indexOf(next);
      const mask = current.stars | (star >= 0 ? 1 << star : 0);
      const key = `${next}:${mask}`;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({
        position: next,
        stars: mask,
        route: [...current.route, next],
      });
    }
  }
  return null;
}

function trailChallenge(ctx: Context, identity: RunIdentity): TrailRun {
  const layouts = [
    [2, 5, 7, 9, 15, 16, 18],
    [1, 3, 6, 8, 11, 13, 16],
    [6, 8, 12, 16, 18],
  ];
  const layout = shuffle(layouts, ctx)[0];
  const symmetry = shuffle([0, 1, 2, 3, 4, 5, 6, 7], ctx)[0];
  const transform = (cell: number) => {
    let row = Math.floor(cell / 5);
    let col = cell % 5;
    if (symmetry >= 4) col = 4 - col;
    for (let rotation = 0; rotation < symmetry % 4; rotation++)
      [row, col] = [col, 4 - row];
    return row * 5 + col;
  };
  const candidates = Array.from({ length: 23 }, (_, index) => index + 1).filter(
    (cell) => !layout.includes(cell),
  );
  const run: TrailRun = {
    ...identity,
    game: "trail",
    size: 5,
    start: transform(0),
    goal: transform(24),
    blocked: layout.map(transform),
    stars: shuffle(candidates, ctx).slice(0, 3).map(transform),
    par: 0,
  };
  const route = trailShortestPath(run);
  if (!route || route.length > MAX_ARCADE_MOVES)
    reject("A new trail could not be prepared. Please try again.");
  run.par = route.length;
  return run;
}

export function startArcade(state: State, game: ArcadeGame, ctx: Context) {
  if (!games.some((entry) => entry.id === game))
    reject("Choose an arcade game.");
  const progress = progressAt(state, ctx.now);
  const identity = { id: ctx.id(), startedAt: ctx.now };
  progress.active =
    game === "memory"
      ? {
          ...identity,
          game,
          board: shuffle([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5], ctx),
        }
      : trailChallenge(ctx, identity);
  state.arcade = progress;
  return progress.active;
}

function replayMemory(run: MemoryRun, moves: number[]) {
  if (moves.length < 12 || moves.length % 2 !== 0)
    reject("Find all six pairs before saving this result.");
  const matched = new Set<number>();
  for (let turn = 0; turn < moves.length; turn += 2) {
    const first = moves[turn];
    const second = moves[turn + 1];
    if (
      first >= run.board.length ||
      second >= run.board.length ||
      first === second ||
      matched.has(first) ||
      matched.has(second) ||
      matched.size === run.board.length
    )
      reject("That memory move does not match this puzzle. Start a new game.");
    if (run.board[first] === run.board[second]) {
      matched.add(first);
      matched.add(second);
    }
  }
  if (matched.size !== run.board.length)
    reject("Find all six pairs before saving this result.");
  const turns = moves.length / 2;
  return { moves: turns, score: Math.max(100, 1000 - (turns - 6) * 25) };
}

function replayTrail(run: TrailRun, moves: number[]) {
  let position = run.start;
  const stars = new Set<number>();
  for (const cell of moves) {
    if (
      cell >= run.size * run.size ||
      run.blocked.includes(cell) ||
      !neighbours(position, run.size).includes(cell) ||
      (position === run.goal && stars.size === 3)
    )
      reject(
        "That route leaves the trail. Start a new game or check your steps.",
      );
    position = cell;
    if (run.stars.includes(cell)) stars.add(cell);
  }
  if (position !== run.goal || stars.size !== 3)
    reject("Collect all three stars and reach the flag before saving.");
  const shortest = trailShortestPath(run);
  if (!shortest) reject("This trail is unavailable. Start a new game.");
  return {
    moves: moves.length,
    score: Math.max(100, 1000 - (moves.length - shortest.length) * 20),
  };
}

/** Replays a bounded transcript; no client score, clock, win or reward is accepted. */
export function finishArcade(
  state: State,
  runId: string,
  moves: number[],
  ctx: Context,
) {
  if (
    !Array.isArray(moves) ||
    moves.length < 1 ||
    moves.length > MAX_ARCADE_MOVES ||
    moves.some((move) => !Number.isInteger(move) || move < 0 || move > 24)
  )
    reject("This game has too many or invalid moves. Start a new free puzzle.");
  const progress = progressAt(state, ctx.now);
  const run = progress.active;
  if (!run || run.id !== runId)
    reject(
      "That game has already ended or was replaced. Open your current puzzle.",
    );
  const result =
    run.game === "memory" ? replayMemory(run, moves) : replayTrail(run, moves);
  const rewarded = progress.day > progress.earnedOn[run.game];
  const personalBest = result.score > progress.bestScores[run.game];
  if (rewarded) {
    state.threads += arcadeReward.threads;
    state.scrap += arcadeReward.scrap;
    state.xp += arcadeReward.xp;
    progress.earnedOn[run.game] = progress.day;
  }
  progress.bestScores[run.game] = Math.max(
    progress.bestScores[run.game],
    result.score,
  );
  progress.plays[run.game] = Math.min(1_000_000, progress.plays[run.game] + 1);
  progress.active = null;
  progress.lastResult = {
    runId,
    game: run.game,
    ...result,
    rewarded,
    personalBest,
    completedAt: ctx.now,
  };
  state.arcade = progress;
  return progress.lastResult;
}

/** Read-only display; old schema-1 saves acquire arcade state only on their next arcade action. */
export function arcadeSummary(state: State, now: number) {
  const progress = progressAt(state, now);
  return {
    games: games.map((game) => ({
      ...game,
      dailyAvailable: progress.day > progress.earnedOn[game.id],
      reward: arcadeReward,
      bestScore: progress.bestScores[game.id],
      plays: progress.plays[game.id],
    })),
    active: progress.active,
    lastResult: progress.lastResult,
    nextDailyAt: (progress.day + 1) * UTC_DAY,
    maxMoves: MAX_ARCADE_MOVES,
  };
}
