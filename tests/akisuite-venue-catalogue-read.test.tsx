import { isValidElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ access: vi.fn() }));
vi.mock("@/lib/entitlements", () => ({ requireBusinessAccess: mocks.access }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not-found");
  },
}));
vi.mock("../src/app/[locale]/business/venue/[id]/actions");
vi.mock("server-only", () => ({}));

import VenueWorkspace from "../src/app/[locale]/business/venue/[id]/page";
import { VenueCatalogueEditor } from "../src/components/VenueCatalogueEditor";
import { BusinessEventEditPanel } from "../src/components/BusinessEventEditPanel";

const id = "f728f63d-8d57-443c-8f9b-777e2e271001";

function descendants(
  node: ReactNode,
): Array<{ type: unknown; props: Record<string, unknown> }> {
  if (Array.isArray(node)) return node.flatMap(descendants);
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return [
    { type: node.type, props: node.props },
    ...descendants(node.props.children),
  ];
}

function backend(catalogueError: boolean) {
  return {
    rpc: vi.fn(async (name: string) => ({
      data: name === "is_venue_member",
      error: null,
    })),
    from(table: string) {
      const result = {
        data:
          table === "venues"
            ? {
                id,
                name: "Own venue",
                slug: "own-venue",
                status: "published",
                discovery_vertical: "activities",
                description_es: "Descripción",
                description_en: "Description",
                address: "Fixture address",
                accessibility: {},
              }
            : table === "venue_catalogues"
              ? null
              : table === "events"
                ? [
                    {
                      id: "event",
                      title_es: "Un evento",
                      title_en: "An event",
                      status: "draft",
                      event_occurrences: [],
                      catalogue_section_ids: ["retained-section"],
                    },
                  ]
                : [],
        error:
          table === "venue_catalogues" && catalogueError
            ? { message: "private database details" }
            : null,
        count: 0,
      };
      const query = {
        select: () => query,
        eq: () => query,
        in: () => query,
        order: () => query,
        range: () => query,
        limit: () => query,
        maybeSingle: async () => result,
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve(result).then(resolve),
      };
      return query;
    },
  };
}

describe("private venue catalogue read boundary", () => {
  it.each(["en", "es"])(
    "%s: withholds catalogue-dependent editors on read failure",
    async (locale) => {
      mocks.access.mockResolvedValue({
        supabase: backend(true),
        user: { id: "owner" },
      });
      const page = await VenueWorkspace({
        params: Promise.resolve({ locale, id }),
        searchParams: Promise.resolve({ section: "catalogue" }),
      });
      const sections = page.props.sections;
      const catalogue = descendants(sections.catalogue);
      const events = descendants(sections.events);
      expect(catalogue.some((node) => node.type === VenueCatalogueEditor)).toBe(
        false,
      );
      expect(events.some((node) => node.type === BusinessEventEditPanel)).toBe(
        false,
      );
      expect(catalogue.some((node) => node.props.role === "alert")).toBe(true);
      expect(
        catalogue.some(
          (node) =>
            node.props.href ===
            `/${locale}/business/venue/${id}?section=catalogue`,
        ),
      ).toBe(true);
      expect(
        events.some(
          (node) =>
            node.props.href ===
            `/${locale}/business/venue/${id}?section=events`,
        ),
      ).toBe(true);
      expect(page.props.counts.catalogueItems).toBeNull();
    },
  );

  it("retains an editable empty catalogue after a successful missing-row read", async () => {
    mocks.access.mockResolvedValue({
      supabase: backend(false),
      user: { id: "owner" },
    });
    const page = await VenueWorkspace({
      params: Promise.resolve({ locale: "en", id }),
      searchParams: Promise.resolve({}),
    });
    const editors = descendants(page.props.sections.catalogue).filter(
      (node) => node.type === VenueCatalogueEditor,
    );
    expect(editors).toHaveLength(1);
    expect(editors[0].props.revision).toBe(0);
    expect(page.props.counts.catalogueItems).toBe(0);
    expect(
      descendants(page.props.sections.events).some(
        (node) => node.type === BusinessEventEditPanel,
      ),
    ).toBe(true);
  });
});
