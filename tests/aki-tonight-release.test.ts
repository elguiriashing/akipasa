import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tonightEnabled } from "../src/lib/aki-tonight-release";

const sources = vi.hoisted(() => ({
  events: vi.fn(async () => ({ items: [] })),
  venues: vi.fn(async () => ({ rows: [], total: 0, page: 1 })),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not-found");
  },
}));
vi.mock("@/lib/personalisation/server", () => ({
  recommendDiscovery: sources.events,
}));
vi.mock("@/lib/unclaimed-venues", () => ({
  nearbyVenuePage: sources.venues,
}));
vi.mock("@/components/EventCard", () => ({ EventCard: () => null }));
vi.mock("@/components/ShareButton", () => ({ ShareButton: () => null }));

import TonightPage, {
  generateMetadata,
} from "../src/app/[locale]/tonight/page";
import { PlansFirstHero } from "../src/components/PlansFirstHero";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("AkiTonight server-owned release boundary", () => {
  it("requires the exact explicit activation value", () => {
    for (const value of ["", "false", "TRUE", "1", " true "]) {
      expect(tonightEnabled(value)).toBe(false);
    }
    expect(tonightEnabled("true")).toBe(true);
    vi.stubEnv("AKIPASA_TONIGHT_ENABLED", undefined);
    expect(tonightEnabled()).toBe(false);
  });

  it.each(["en", "es"])(
    "%s: denies rendering and metadata before discovery while disabled",
    async (locale) => {
      vi.stubEnv("AKIPASA_TONIGHT_ENABLED", "false");
      const params = Promise.resolve({ locale });
      await expect(
        TonightPage({
          params,
          searchParams: Promise.resolve({ enabled: "true" }),
        }),
      ).rejects.toThrow("not-found");
      await expect(generateMetadata({ params })).rejects.toThrow("not-found");
      expect(sources.events).not.toHaveBeenCalled();
      expect(sources.venues).not.toHaveBeenCalled();
    },
  );

  it.each(["en", "es"] as const)(
    "%s: only exposes the hero entry with the server gate enabled",
    (locale) => {
      const renderHero = () =>
        renderToStaticMarkup(
          createElement(PlansFirstHero, {
            locale,
            location: {
              locality: "fuengirola",
              name: "Fuengirola",
              latitude: 36.54,
              longitude: -4.62,
              radius: 15,
            },
          }),
        );
      vi.stubEnv("AKIPASA_TONIGHT_ENABLED", "false");
      expect(renderHero()).not.toContain(`href="/${locale}/tonight"`);
      vi.stubEnv("AKIPASA_TONIGHT_ENABLED", "true");
      expect(renderHero()).toContain(`href="/${locale}/tonight"`);
    },
  );

  it.each(["en", "es"])(
    "%s: enabled route keeps noindex and honest empty schedule copy",
    async (locale) => {
      vi.stubEnv("AKIPASA_TONIGHT_ENABLED", "true");
      const params = Promise.resolve({ locale });
      const metadata = await generateMetadata({ params });
      expect(metadata.robots).toEqual({ index: false, follow: true });
      const page = await TonightPage({
        params,
        searchParams: Promise.resolve({}),
      });
      const html = renderToStaticMarkup(page);
      expect(html).toContain(
        locale === "es"
          ? "Todavía no hay eventos publicados"
          : "No published event listings",
      );
      expect(sources.events).toHaveBeenCalledOnce();
      expect(sources.venues).toHaveBeenCalledOnce();
    },
  );

  it.each(["en", "es"])(
    "%s: outages stay unavailable instead of claiming zero published supply",
    async (locale) => {
      vi.stubEnv("AKIPASA_TONIGHT_ENABLED", "true");
      const log = vi.spyOn(console, "error").mockImplementation(() => {});
      sources.events.mockRejectedValueOnce(new Error("private-event-failure"));
      sources.venues.mockRejectedValueOnce(new Error("private-venue-failure"));
      try {
        const html = renderToStaticMarkup(
          await TonightPage({
            params: Promise.resolve({ locale }),
            searchParams: Promise.resolve({}),
          }),
        );
        expect(html.match(/role="alert"/g)).toHaveLength(2);
        expect(html).not.toContain("private-event-failure");
        expect(html).not.toContain("private-venue-failure");
        expect(html).toContain(
          locale === "es"
            ? "No hemos podido comprobar todos los resultados."
            : "Some results couldn&#x27;t be checked.",
        );
        expect(html).not.toContain("No published event listings");
      } finally {
        log.mockRestore();
      }
    },
  );
});
