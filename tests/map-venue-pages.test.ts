import { describe, expect, it, vi } from "vitest";
import {
  mapVenuePages,
  loadSpainMapVenues,
  type MapVenue,
} from "../src/lib/map-venue-pages";

const bounds = new URLSearchParams({
  west: "-19",
  east: "5",
  south: "27",
  north: "45",
});
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("complete map coverage", () => {
  it("loads all 100,001 venues across 51 batches, preserving bounds without duplicates", async () => {
    const total = 100_001;
    const request = vi.fn(async (input: RequestInfo | URL) => {
      const query = new URL(String(input), "https://example.com").searchParams;
      for (const [key, value] of bounds) expect(query.get(key)).toBe(value);
      const start = Number(query.get("after")?.slice(-12) ?? 0);
      const end = Math.min(start + 2000, total);
      return Response.json({
        rows: Array.from({ length: end - start }, (_, i) => ({
          id: id(start + i + 1),
        })),
        hasMore: end < total,
        nextCursor: end < total ? id(end) : null,
      });
    });
    const rows: MapVenue[] = [];
    for await (const batch of mapVenuePages(
      bounds,
      new AbortController().signal,
      request,
    ))
      rows.push(...batch);
    expect(rows).toHaveLength(total);
    expect(new Set(rows.map((row) => row.id)).size).toBe(total);
    expect(request).toHaveBeenCalledTimes(51);
  });

  it("does not request another batch after the map unmounts", async () => {
    const controller = new AbortController();
    const request = vi.fn(async () =>
      Response.json({
        rows: [{ id: id(1) }],
        hasMore: true,
        nextCursor: id(1),
      }),
    );
    const pages = mapVenuePages(bounds, controller.signal, request);
    await pages.next();
    controller.abort();
    await expect(pages.next()).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("reports an incomplete load when a later request fails", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          rows: [{ id: id(1) }],
          hasMore: true,
          nextCursor: id(1),
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 503 }));
    const pages = mapVenuePages(bounds, new AbortController().signal, request);
    expect((await pages.next()).value).toHaveLength(1);
    await expect(pages.next()).rejects.toThrow("Map unavailable");
  });

  it("rejects a missing continuation cursor rather than silently truncating", async () => {
    const request = vi.fn(async () =>
      Response.json({ rows: [], hasMore: true }),
    );
    const pages = mapVenuePages(bounds, new AbortController().signal, request);
    await expect(pages.next()).rejects.toThrow("did not advance");
  });
});

it("publishes a complete Spain dataset only after all batches finish", async () => {
  let finishSecond!: (response: Response) => void;
  const second = new Promise<Response>((resolve) => {
    finishSecond = resolve;
  });
  const request = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        rows: [{ id: id(1) }],
        hasMore: true,
        nextCursor: id(1),
      }),
    )
    .mockReturnValueOnce(second);
  const progress = vi.fn();
  const publish = vi.fn();
  const loaded = loadSpainMapVenues(
    new AbortController().signal,
    progress,
    request,
  ).then(publish);
  await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  expect(progress).toHaveBeenCalledWith(1);
  expect(publish).not.toHaveBeenCalled();
  const query = new URL(String(request.mock.calls[0][0]), "https://example.com")
    .searchParams;
  expect(Object.fromEntries(query)).toEqual(Object.fromEntries(bounds));
  finishSecond(
    Response.json({ rows: [{ id: id(2) }], hasMore: false, nextCursor: null }),
  );
  await loaded;
  expect(publish).toHaveBeenCalledTimes(1);
  expect(publish).toHaveBeenCalledWith([{ id: id(1) }, { id: id(2) }]);
});
