import { describe, expect, it, vi } from "vitest";
import { releaseSourceCommit } from "../src/lib/release-source";

const commit = "66a9e1ae62ad98c972bac7c5d77f5d705d24befa";
const request = new Request(
  "https://business.akipasa.com/api/bookings/release",
);

describe("release artifact identity", () => {
  it("reads only the asset binding using a fixed path on the current host", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(Response.json({ sourceCommit: commit }));
    expect(await releaseSourceCommit({ fetch }, request)).toBe(commit);
    expect(fetch.mock.calls[0][0].url).toBe(
      "https://business.akipasa.com/release-source.json",
    );
  });

  it("does not invent source evidence for legacy, missing or failed artifacts", async () => {
    expect(await releaseSourceCommit(undefined, request)).toBeNull();
    for (const response of [
      new Response("Not found", { status: 404 }),
      new Response("invalid JSON"),
      Response.json({ sourceCommit: "66a9e1a" }),
      Response.json({ sourceCommit: null }),
      Response.json({}),
    ]) {
      expect(
        await releaseSourceCommit({ fetch: async () => response }, request),
      ).toBeNull();
    }
    expect(
      await releaseSourceCommit(
        {
          fetch: async () => {
            throw new Error("asset unavailable");
          },
        },
        request,
      ),
    ).toBeNull();
  });
});
