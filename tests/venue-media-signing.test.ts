import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { signVenueMedia } from "../src/lib/venue-media-signing";

function provider(data: unknown) {
  const createSignedUrls = vi.fn().mockResolvedValue({ data });
  const from = vi.fn().mockReturnValue({ createSignedUrls });
  return {
    client: { storage: { from } } as unknown as SupabaseClient,
    createSignedUrls,
    from,
  };
}

const row = (id: string, storage_path = id) => ({
  id,
  storage_path,
  alt_es: id,
  alt_en: null,
});

describe("batched venue media signing", () => {
  it("signs 60 images in one request and preserves media order and bilingual labels", async () => {
    const rows = Array.from({ length: 60 }, (_, index) => ({
      ...row(String(index)),
      alt_en: `English ${index}`,
    }));
    const mock = provider(
      rows
        .map((item) => ({
          path: item.storage_path,
          signedUrl: `https://storage.invalid/${item.id}`,
          error: null,
        }))
        .reverse(),
    );
    const result = await signVenueMedia(mock.client, rows);
    expect(mock.from).toHaveBeenCalledWith("event-media");
    expect(mock.createSignedUrls).toHaveBeenCalledExactlyOnceWith(
      rows.map((item) => item.storage_path),
      3600,
    );
    expect(result.map((item) => item.id)).toEqual(rows.map((item) => item.id));
    expect(result[0].alt).toEqual({ es: "0", en: "English 0" });
  });
  it("omits inaccessible objects without swapping another object's image, and deduplicates shared paths", async () => {
    const mock = provider([
      {
        path: "shared",
        signedUrl: "https://storage.invalid/shared",
        error: null,
      },
      { path: "private", signedUrl: null, error: "Denied" },
    ]);
    const result = await signVenueMedia(mock.client, [
      row("first", "shared"),
      row("denied", "private"),
      row("missing"),
      row("last", "shared"),
    ]);
    expect(result.map((item) => item.id)).toEqual(["first", "last"]);
    expect(mock.createSignedUrls).toHaveBeenCalledExactlyOnceWith(
      ["shared", "private", "missing"],
      3600,
    );
  });
  it("makes no Storage request for an empty gallery and preserves unavailable-gallery behavior", async () => {
    const mock = provider(null);
    expect(await signVenueMedia(mock.client, [])).toEqual([]);
    expect(mock.createSignedUrls).not.toHaveBeenCalled();
    expect(await signVenueMedia(mock.client, [row("one")])).toEqual([]);
  });
});
