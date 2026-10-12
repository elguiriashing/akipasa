import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyAction, initialState, type State } from "../src/lib/pals/engine";
import {
  trailShortestPath,
  type ArcadeGame,
  type ArcadeRun,
} from "../src/lib/pals/arcade";

const adapters = vi.hoisted(() => ({
  access: vi.fn(),
  read: vi.fn(),
  analytics: vi.fn(),
}));
vi.mock("@/lib/pals/server", () => ({
  previewAccess: adapters.access,
  readState: adapters.read,
  recordPalsAnalytics: adapters.analytics,
  privateHeaders: {
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow",
  },
}));

import { GET, POST } from "../src/app/pals/api/route";

const account = "00000000-0000-4000-8000-000000000011";
const origin = "https://akipasa.com";
let saved: { state: State; version: number };
let ledger: Set<string>;
let commit: ReturnType<typeof vi.fn>;
let loseCommittedResponse = false;

function request(action: unknown, overrides: Record<string, unknown> = {}) {
  return new Request(`${origin}/pals/api`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      version: saved.version,
      action,
      ...overrides,
    }),
  });
}

function completedMoves(run: ArcadeRun): number[] {
  if (run.game === "trail") {
    const moves = trailShortestPath(run);
    if (!moves) throw new Error("The saved trail must be solvable");
    return moves;
  }
  return Array.from({ length: 6 }, (_, symbol) =>
    run.board.flatMap((value, index) => (value === symbol ? [index] : [])),
  ).flat();
}

async function openArcade(game: ArcadeGame) {
  expect((await POST(request({ type: "arcade-start", game }))).status).toBe(
    200,
  );
  const run = saved.state.arcade?.active;
  if (!run) throw new Error("A successful start must save its puzzle");
  return run;
}

beforeEach(() => {
  vi.clearAllMocks();
  const now = Date.now();
  saved = {
    state: applyAction(
      initialState(now),
      { type: "adopt", family: "moka", name: "Test Pal" },
      { now, id: () => crypto.randomUUID(), random: () => 0.2 },
    ),
    version: 3,
  };
  ledger = new Set();
  loseCommittedResponse = false;
  commit = vi.fn(async (_name, args) => {
    if (args.p_user_id !== account) throw new Error("Wrong account");
    if (ledger.has(args.p_command_id)) return { data: saved, error: null };
    if (args.p_expected_version !== saved.version)
      return { data: null, error: null };
    saved = { state: args.p_state, version: saved.version + 1 };
    ledger.add(args.p_command_id);
    if (loseCommittedResponse) {
      loseCommittedResponse = false;
      return {
        data: null,
        error: new Error("Response interrupted after commit"),
      };
    }
    return { data: saved, error: null };
  });
  const db = {
    from: (table: string) => {
      if (table !== "pals_commands") throw new Error("Unexpected table");
      let commandId: string | undefined;
      const query = {
        select: () => query,
        eq: (column: string, value: string) => {
          if (column === "user_id" && value !== account)
            throw new Error("Missing account scope");
          if (column === "command_id") commandId = value;
          return query;
        },
        maybeSingle: async () => ({
          data:
            commandId && ledger.has(commandId)
              ? { command_id: commandId }
              : null,
          error: null,
        }),
        gte: async () => ({ count: ledger.size, error: null }),
      };
      return query;
    },
    rpc: commit,
  };
  adapters.access.mockResolvedValue({
    user: { id: account },
    allowed: true,
    supabase: { rpc: vi.fn() },
  });
  adapters.read.mockImplementation(async (userId: string) => {
    expect(userId).toBe(account);
    return { ...saved, db };
  });
  adapters.analytics.mockResolvedValue(undefined);
});

describe("AkiPals private action API", () => {
  it("denies cross-origin writes before authentication or state reads", async () => {
    const response = await POST(
      new Request(`${origin}/pals/api`, {
        method: "POST",
        headers: {
          Origin: "https://other.example",
          "Content-Type": "application/json",
        },
        body: "{}",
      }),
    );
    expect(response.status).toBe(403);
    expect(adapters.access).not.toHaveBeenCalled();
    expect(adapters.read).not.toHaveBeenCalled();
  });

  it("keeps anonymous and uninvited account reads private", async () => {
    adapters.access.mockResolvedValueOnce({ user: null, allowed: false });
    const anonymous = await GET();
    expect(anonymous.status).toBe(401);
    expect(anonymous.headers.get("Cache-Control")).toContain("no-store");
    adapters.access.mockResolvedValueOnce({
      user: { id: account },
      allowed: false,
    });
    expect((await GET()).status).toBe(404);
    expect(adapters.read).not.toHaveBeenCalled();
  });

  it("denies a valid command after access is revoked", async () => {
    adapters.access.mockResolvedValue({
      user: { id: account },
      allowed: false,
    });
    expect(
      (await POST(request({ type: "care", activity: "snack" }))).status,
    ).toBe(404);
    expect(adapters.read).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });

  it("rejects invented rewards and user IDs rather than trusting client state", async () => {
    for (const action of [
      { type: "care", activity: "snack", xp: 100000 },
      { type: "journey-claim", period: "day", threads: 100000 },
      { type: "care", activity: "unknown" },
    ]) {
      expect((await POST(request(action))).status).toBe(400);
    }
    expect(
      (await POST(request({ type: "parcel" }, { userId: account }))).status,
    ).toBe(400);
    expect(commit).not.toHaveBeenCalled();
  });

  it("bounds request bodies before reaching any account operation", async () => {
    const response = await POST(
      new Request(`${origin}/pals/api`, {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: JSON.stringify({ padding: "a".repeat(5000) }),
      }),
    );
    expect(response.status).toBe(413);
    expect(adapters.access).not.toHaveBeenCalled();
  });

  it("commits care through the account-scoped versioned ledger", async () => {
    const before = structuredClone(saved);
    const response = await POST(request({ type: "care", activity: "snack" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(commit).toHaveBeenCalledOnce();
    expect(body.version).toBe(before.version + 1);
    expect(body.state.xp).toBe(before.state.xp + 5);
    expect(body.state.equipment).toEqual(before.state.equipment);
    expect(body.state.wardrobe).toEqual(before.state.wardrobe);
    expect(body.state.mapEnabled).toBe(before.state.mapEnabled);
    expect(body.derived.journey).toBeDefined();
  });

  it("replays a command ID without granting care XP twice", async () => {
    const id = crypto.randomUUID();
    const version = saved.version;
    const action = { type: "care", activity: "play" };
    const first = await POST(request(action, { id, version }));
    const snapshot = await first.json();
    const replay = await POST(request(action, { id, version }));
    const body = await replay.json();
    expect(replay.status).toBe(200);
    expect(body.state.xp).toBe(snapshot.state.xp);
    expect(body.version).toBe(snapshot.version);
    expect(commit).toHaveBeenCalledOnce();
  });

  it("recovers an ambiguous committed response with the same command ID", async () => {
    const id = crypto.randomUUID();
    const version = saved.version;
    const action = { type: "care", activity: "rest" };
    const initialXp = saved.state.xp;
    loseCommittedResponse = true;
    expect((await POST(request(action, { id, version }))).status).toBe(503);
    expect(saved.state.xp).toBe(initialXp + 5);
    const replay = await POST(request(action, { id, version }));
    expect(replay.status).toBe(200);
    const body = await replay.json();
    expect(body.state.xp).toBe(initialXp + 5);
    expect(body.version).toBe(version + 1);
    expect(commit).toHaveBeenCalledOnce();
  });

  it("returns the current save on version conflict without applying the action", async () => {
    const before = structuredClone(saved);
    const response = await POST(
      request(
        { type: "care", activity: "snack" },
        { version: saved.version - 1 },
      ),
    );
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.state).toEqual(before.state);
    expect(body.version).toBe(before.version);
    expect(commit).not.toHaveBeenCalled();
  });

  it("refuses an unearned journey claim through the real game rules", async () => {
    const before = structuredClone(saved);
    const response = await POST(
      request({ type: "journey-claim", period: "day" }),
    );
    expect(response.status).toBe(400);
    expect(saved).toEqual(before);
    expect(commit).not.toHaveBeenCalled();
  });

  it("keeps a missing save failure explicit instead of silently recreating it on POST", async () => {
    adapters.read.mockResolvedValue(null);
    const response = await POST(request({ type: "parcel" }));
    expect(response.status).toBe(409);
    expect(adapters.read).toHaveBeenCalledWith(account);
    expect(commit).not.toHaveBeenCalled();
  });

  it.each(["memory", "trail"] as const)(
    "validates and saves a complete %s puzzle, then makes further play reward-free",
    async (game) => {
      const before = structuredClone(saved.state);
      const run = await openArcade(game);
      const response = await POST(
        request({
          type: "arcade-finish",
          runId: run.id,
          moves: completedMoves(run),
        }),
      );
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.state.threads).toBe(before.threads + 20);
      expect(result.state.scrap).toBe(before.scrap + 8);
      expect(result.state.xp).toBe(before.xp + 10);
      expect(result.state.arcade.active).toBeNull();
      expect(result.derived.arcade.lastResult).toMatchObject({
        game,
        runId: run.id,
        score: 1000,
        rewarded: true,
      });
      expect(result.state.equipment).toEqual(before.equipment);
      expect(result.state.wardrobe).toEqual(before.wardrobe);

      const practice = await openArcade(game);
      const replay = await POST(
        request({
          type: "arcade-finish",
          runId: practice.id,
          moves: completedMoves(practice),
        }),
      );
      expect(replay.status).toBe(200);
      const replayResult = await replay.json();
      expect(replayResult.state.threads).toBe(result.state.threads);
      expect(replayResult.state.scrap).toBe(result.state.scrap);
      expect(replayResult.state.xp).toBe(result.state.xp);
      expect(replayResult.derived.arcade.lastResult.rewarded).toBe(false);
    },
  );

  it("rejects client scores, incomplete moves and replaced run IDs without changing the saved puzzle", async () => {
    const run = await openArcade("memory");
    const before = structuredClone(saved);
    commit.mockClear();
    const action = {
      type: "arcade-finish",
      runId: run.id,
      moves: completedMoves(run),
    };
    for (const forged of [
      { ...action, score: 999999 },
      { ...action, threads: 999999 },
      { ...action, moves: [0, 0] },
      { ...action, moves: [24, 23] },
      { ...action, moves: Array(129).fill(0) },
      { ...action, runId: crypto.randomUUID() },
    ]) {
      expect((await POST(request(forged))).status).toBe(400);
      expect(saved).toEqual(before);
    }
    expect(commit).not.toHaveBeenCalled();
  });

  it("recovers an interrupted arcade reward with the same UUID and refuses a second claim of the consumed run", async () => {
    const run = await openArcade("trail");
    const version = saved.version;
    const id = crypto.randomUUID();
    const before = structuredClone(saved.state);
    const action = {
      type: "arcade-finish",
      runId: run.id,
      moves: completedMoves(run),
    };
    commit.mockClear();
    loseCommittedResponse = true;
    expect((await POST(request(action, { id, version }))).status).toBe(503);
    expect(saved.state.threads).toBe(before.threads + 20);
    expect(saved.state.arcade?.active).toBeNull();

    const retry = await POST(request(action, { id, version }));
    expect(retry.status).toBe(200);
    const recovered = await retry.json();
    expect(recovered.state.threads).toBe(before.threads + 20);
    expect(recovered.state.scrap).toBe(before.scrap + 8);
    expect(recovered.state.xp).toBe(before.xp + 10);
    expect(recovered.version).toBe(version + 1);
    expect(commit).toHaveBeenCalledOnce();

    expect((await POST(request(action))).status).toBe(400);
    expect(saved.version).toBe(version + 1);
    expect(saved.state.threads).toBe(before.threads + 20);
    expect(commit).toHaveBeenCalledOnce();
  });
});
