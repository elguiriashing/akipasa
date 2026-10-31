import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  communityStoriesExportReady,
  readCommunityStoryExports,
} from "../src/lib/community-stories-export";

const id = (n: number) =>
  `98000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ownStory = (n: number) => ({
  id: id(n),
  checkInId: id(30001),
  venueId: id(30002),
  cityId: id(30003),
  caption: "Own retained caption",
  kind: "venue",
  publicOptIn: true,
  status: "rejected",
  createdAt: "2026-10-29T12:00:00+00:00",
  expiresAt: "2026-10-30T12:00:00+00:00",
  deletedAt: "2026-10-29T13:00:00+00:00",
});
const done = (section: string, items: unknown[] = []) => ({
  section,
  items,
  nextCursor: null,
  truncated: false,
});
function client(
  run: (payload: {
    section: string;
    after: string | null;
    limit: number;
  }) => unknown,
) {
  const rpc = vi.fn(
    async (
      name: string,
      input: {
        p_action: string;
        p_payload: { section: string; after: string | null; limit: number };
      },
    ) => {
      expect(name).toBe("community_stories_api");
      expect(input.p_action).toBe("export");
      return { data: await run(input.p_payload), error: null };
    },
  );
  const from = vi.fn(() => {
    throw new Error("Broad/direct table reads forbidden");
  });
  return { supabase: { rpc, from } as unknown as SupabaseClient, rpc, from };
}
afterEach(() => vi.unstubAllEnvs());

describe("Caller-only retained Stories portability", () => {
  it.each([undefined, "false", "TRUE", "true "])(
    "keeps absent/unready schema %s out of prior-release export",
    (flag) => {
      if (flag === undefined)
        vi.stubEnv("AKIPASA_COMMUNITY_STORIES_SCHEMA_READY", undefined);
      else vi.stubEnv("AKIPASA_COMMUNITY_STORIES_SCHEMA_READY", flag);
      expect(communityStoriesExportReady()).toBe(false);
    },
  );
  it("keeps privacy export enabled after optional collection stops", () => {
    vi.stubEnv("AKIPASA_COMMUNITY_STORIES_SCHEMA_READY", "true");
    vi.stubEnv("AKIPASA_COMMUNITY_STORIES_ENABLED", "false");
    expect(communityStoriesExportReady()).toBe(true);
  });
  it("exports retained deleted/expired own data and opaque media references only", async () => {
    const c = client(({ section }) =>
      done(
        section,
        section === "stories"
          ? [ownStory(1)]
          : section === "reports"
            ? [
                {
                  id: id(2),
                  reason: "privacy",
                  createdAt: "2026-10-31T12:00:00Z",
                },
              ]
            : [
                {
                  id: id(3),
                  status: "pending",
                  createdAt: "2026-10-31T12:00:00Z",
                },
              ],
      ),
    );
    const result = await readCommunityStoryExports(c.supabase);
    expect(result.map((entry) => [entry.table, entry.failed])).toEqual([
      ["community_stories", false],
      ["community_story_reports", false],
      ["community_story_media_cleanup", false],
    ]);
    expect(result[0].data[0]).toEqual({
      ...ownStory(1),
      mediaRef: `community-story:${id(1)}`,
    });
    expect(JSON.stringify(result)).not.toMatch(
      /https?:|storage\/|owner_id|profile_id|moderated_by|moderationReason/,
    );
    expect(c.rpc).toHaveBeenCalledTimes(3);
    expect(c.from).not.toHaveBeenCalled();
    for (const [, input] of c.rpc.mock.calls)
      expect(input.p_payload).toMatchObject({ after: null, limit: 100 });
  });
  it("follows exact100-row stable UUID pages without truncating the completed export", async () => {
    const c = client(({ section, after }) =>
      section !== "stories"
        ? done(section)
        : after === null
          ? {
              section,
              items: Array.from({ length: 100 }, (_, n) => ownStory(n + 1)),
              nextCursor: id(100),
              truncated: true,
            }
          : done(section, [ownStory(101), ownStory(102)]),
    );
    const result = await readCommunityStoryExports(c.supabase);
    expect(result[0].failed).toBe(false);
    expect(result[0].data).toHaveLength(102);
    expect(c.rpc.mock.calls[1][1].p_payload.after).toBe(id(100));
    expect(result.every((entry) => !entry.failed)).toBe(true);
  });
  it.each(["owner_id", "moderationReason", "mediaUrl", "profile_id"])(
    "fails closed rather than exposing unexpected private field %s",
    async (field) => {
      const c = client(({ section }) =>
        done(
          section,
          section === "stories"
            ? [{ ...ownStory(1), [field]: "Private third-party data" }]
            : [],
        ),
      );
      const result = await readCommunityStoryExports(c.supabase);
      expect(result[0]).toEqual({
        table: "community_stories",
        data: [],
        failed: true,
      });
      expect(JSON.stringify(result)).not.toContain("Private third-party data");
    },
  );
  it.each([
    { section: "reports", items: [], nextCursor: null, truncated: false },
    null,
    { section: "stories", items: [], nextCursor: id(1), truncated: false },
    { section: "stories", items: [], nextCursor: null, truncated: true },
    {
      section: "stories",
      items: [ownStory(1)],
      nextCursor: id(1),
      truncated: true,
    },
    {
      section: "stories",
      items: [ownStory(2), ownStory(1)],
      nextCursor: null,
      truncated: false,
    },
    {
      section: "stories",
      items: [ownStory(1), ownStory(1)],
      nextCursor: null,
      truncated: false,
    },
  ])("refuses malformed, unsorted or contradictory page %#", async (page) => {
    const c = client(({ section }) =>
      section === "stories" ? page : done(section),
    );
    const result = await readCommunityStoryExports(c.supabase);
    expect(result[0]).toEqual({
      table: "community_stories",
      data: [],
      failed: true,
    });
  });
  it("never returns a successful partial export after a later RPC failure", async () => {
    const c = client(({ section, after }) => {
      if (section !== "stories") return done(section);
      if (after) throw new Error("Temporary private transport detail");
      return {
        section,
        items: Array.from({ length: 100 }, (_, n) => ownStory(n + 1)),
        nextCursor: id(100),
        truncated: true,
      };
    });
    const result = await readCommunityStoryExports(c.supabase);
    expect(result[0]).toEqual({
      table: "community_stories",
      data: [],
      failed: true,
    });
    expect(JSON.stringify(result)).not.toContain(
      "Temporary private transport detail",
    );
  });
  it("rejects a repeated/backwards continuation even after a valid initial page", async () => {
    const c = client(({ section, after }) =>
      section !== "stories"
        ? done(section)
        : after
          ? done(section, [ownStory(99)])
          : {
              section,
              items: Array.from({ length: 100 }, (_, n) => ownStory(n + 1)),
              nextCursor: id(100),
              truncated: true,
            },
    );
    expect((await readCommunityStoryExports(c.supabase))[0]).toEqual({
      table: "community_stories",
      data: [],
      failed: true,
    });
  });
  it("bounds an endless valid-looking feed and marks every uncompleted section failed", async () => {
    let next = 0;
    const c = client(({ section }) => {
      const items = Array.from({ length: 100 }, () => ownStory(++next));
      return { section, items, nextCursor: items.at(-1)!.id, truncated: true };
    });
    const result = await readCommunityStoryExports(c.supabase);
    expect(c.rpc).toHaveBeenCalledTimes(100);
    expect(
      result.every((entry) => entry.failed && entry.data.length === 0),
    ).toBe(true);
  });
  it("marks an expected but missing RPC unavailable rather than empty", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: null, error: { code: "PGRST202" } });
    const result = await readCommunityStoryExports({
      rpc,
    } as unknown as SupabaseClient);
    expect(
      result.every((entry) => entry.failed && entry.data.length === 0),
    ).toBe(true);
  });
});
