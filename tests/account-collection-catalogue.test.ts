import { describe, expect, it, vi } from "vitest";
import {
  currentEventCollectionItems,
  currentVenueCollectionItems,
} from "../src/lib/account-collection-catalogue";

function clientFor(
  tableRows: Record<string, { data: unknown[] | null; error: unknown }>,
) {
  const reads: Array<{ table: string; ids: string[] }> = [];
  return {
    reads,
    client: {
      from: (table: string) => {
        const reply = tableRows[table] || { data: [], error: null };
        const query = {
          select: () => query,
          in: (_field: string, ids: string[]) => {
            reads.push({ table, ids });
            return Promise.resolve(reply);
          },
        };
        return query;
      },
    },
  };
}

describe("current account collection catalogue labels", () => {
  it.each(["en", "es"] as const)(
    "uses the current %s event title and slug while retaining missing records",
    async (locale) => {
      const { client, reads } = clientFor({
        events: {
          error: null,
          data: [
            {
              id: "10000000-0000-4000-8000-000000000001",
              slug: "current-slug",
              title_es: "Título actual",
              title_en: "Current title",
            },
          ],
        },
      });
      const items = await currentEventCollectionItems(
        client as never,
        [
          {
            event_key: "10000000-0000-4000-8000-000000000001",
            title: "Stored title",
            href: "/es/events/stored-slug",
          },
          {
            event_key: "20000000-0000-4000-8000-000000000002",
            title: "Private stored title",
            href: "/es/events/private-stored-slug",
          },
        ],
        locale,
      );

      expect(items[0]).toMatchObject({
        displayLabel: locale === "es" ? "Título actual" : "Current title",
        displayHref: `/${locale}/events/current-slug`,
      });
      expect(items[1]).toMatchObject({
        displayLabel: "Private stored title",
        displayHref: "/es/events/private-stored-slug",
      });
      expect(reads).toEqual([
        {
          table: "events",
          ids: [
            "10000000-0000-4000-8000-000000000001",
            "20000000-0000-4000-8000-000000000002",
          ],
        },
      ]);
    },
  );

  it("falls back to stored event labels when the catalogue refresh fails", async () => {
    const { client } = clientFor({
      events: { data: null, error: { message: "unavailable" } },
    });
    const [item] = await currentEventCollectionItems(
      client as never,
      [
        {
          event_key: "10000000-0000-4000-8000-000000000001",
          title: "Stored title",
          href: "/es/events/stored-slug",
        },
      ],
      "en",
    );
    expect(item).toMatchObject({
      displayLabel: "Stored title",
      displayHref: "/es/events/stored-slug",
    });
  });

  it("uses the current venue name and slug", async () => {
    const { client } = clientFor({
      venues: {
        error: null,
        data: [
          {
            id: "30000000-0000-4000-8000-000000000003",
            slug: "cafe-actual",
            name: "Café actual",
          },
        ],
      },
    });
    const [item] = await currentVenueCollectionItems(
      client as never,
      [
        {
          venue_key: "30000000-0000-4000-8000-000000000003",
          name: "Stored venue",
          href: "/en/venues/stored-venue",
        },
      ],
      "es",
    );
    expect(item).toMatchObject({
      displayLabel: "Café actual",
      displayHref: "/es/venues/cafe-actual",
    });
  });

  it("does not query UUID catalogue columns for legacy non-UUID keys", async () => {
    const from = vi.fn();
    const [item] = await currentEventCollectionItems(
      { from } as never,
      [
        {
          event_key: "legacy-event-key",
          title: "Legacy title",
          href: "/en/events/legacy-title",
        },
      ],
      "en",
    );
    expect(from).not.toHaveBeenCalled();
    expect(item.displayLabel).toBe("Legacy title");
  });
});
