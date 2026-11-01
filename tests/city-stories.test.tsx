// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  CityStories,
  rankStoryCities,
} from "../src/components/community/CityStories";
const city = (slug: string, count = 0, latitude = 36) => ({
  id: slug,
  slug,
  nameEn: slug,
  nameEs: slug,
  latitude,
  longitude: -4,
  approvedStories24h: count,
});
const cities = [
  city("Malaga", 3),
  city("Marbella", 2, 37),
  city("Sevilla", 1, 38),
  city("Madrid", 10, 40),
];
const fetcher = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", fetcher);
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  fetcher.mockImplementation(async (url: string) => ({
    ok: true,
    json: async () =>
      url.includes("/cities?area=")
        ? { available: true, cities }
        : { available: true, stories: [] },
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it("ranks nearest3 then real active3 and deduplicates without invented activity", () => {
  expect(
    rankStoryCities(cities, { latitude: 36, longitude: -4 }).map((c) => c.slug),
  ).toEqual(["Malaga", "Marbella", "Sevilla", "Madrid"]);
  expect(rankStoryCities([city("Empty")], null)).toEqual([]);
});
it("never requests geolocation on mount; empty nearby city opens a truthful viewer and restores focus", async () => {
  const geo = vi.fn((success: PositionCallback) =>
    success({ coords: { latitude: 36, longitude: -4 } } as GeolocationPosition),
  );
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: geo },
  });
  render(<CityStories locale="en" />);
  await screen.findByRole("button", { name: /Malaga/ });
  expect(geo).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Use my location" }));
  expect(geo).toHaveBeenCalledOnce();
  const open = screen.getByRole("button", { name: /Malaga/ });
  open.focus();
  fireEvent.click(open);
  expect(
    await screen.findByRole("heading", {
      name: "The next moment could be yours",
    }),
  ).toBeVisible();
  expect(screen.getByRole("link", { name: "Check in" })).toHaveAttribute(
    "href",
    "/en/check-in",
  );
  fireEvent(
    screen.getByRole("dialog"),
    new Event("cancel", { bubbles: false, cancelable: true }),
  );
  await waitFor(() => expect(open).toHaveFocus());
  expect(
    fetcher.mock.calls.every(
      ([url]) =>
        !String(url).includes("latitude") && !String(url).includes("longitude"),
    ),
  ).toBe(true);
});
it("uses actual proxy stories, keyboard progress, pause and close", async () => {
  fetcher.mockImplementation(async (url: string) => ({
    ok: true,
    json: async () =>
      url.includes("/cities?area=")
        ? { available: true, cities }
        : {
            available: true,
            stories: [0, 1].map((i) => ({
              id: String(i),
              citySlug: "Madrid",
              venueName: "Real venue " + i,
              caption: "Moment " + i,
              kind: "venue",
              createdAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 60000).toISOString(),
              mediaUrl: `/api/community/stories/${i}/media`,
            })),
          },
  }));
  render(<CityStories locale="en" />);
  fireEvent.click(await screen.findByRole("button", { name: /Madrid/ }));
  await screen.findByText("Moment 0");
  const dialog = screen.getByRole("dialog");
  fireEvent.keyDown(dialog, { key: "ArrowRight" });
  expect(screen.getByText("Moment 1")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Pause" }));
  fireEvent.keyDown(dialog, { key: "ArrowLeft" });
  expect(screen.getByText("Moment 1")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Resume" }));
  fireEvent.keyDown(dialog, { key: "ArrowLeft" });
  expect(screen.getByText("Moment 0")).toBeVisible();
  const image = screen.getByRole("img", { name: "Moment 0" });
  fireEvent.touchStart(image.parentElement!, {
    changedTouches: [{ clientX: 200 }],
  });
  fireEvent.touchEnd(image.parentElement!, {
    changedTouches: [{ clientX: 100 }],
  });
  expect(screen.getByText("Moment 1")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Close stories" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
it("distinguishes unavailable from empty and exposes retry in Spanish", async () => {
  fetcher.mockResolvedValue({ ok: false });
  render(<CityStories locale="es" />);
  expect(
    await screen.findByText("Las historias no están disponibles ahora."),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
});

it("withholds expired, wrong-city and non-proxy media stories", async () => {
  fetcher.mockImplementation(async (url: string) => ({
    ok: true,
    json: async () =>
      url.includes("/cities?area=")
        ? { available: true, cities }
        : {
            available: true,
            stories: [
              {
                id: "expired",
                citySlug: "Madrid",
                expiresAt: "2000-01-01",
                mediaUrl: "/api/community/stories/expired/media",
              },
              {
                id: "foreign",
                citySlug: "Malaga",
                expiresAt: "2100-01-01",
                mediaUrl: "/api/community/stories/foreign/media",
              },
              {
                id: "external",
                citySlug: "Madrid",
                expiresAt: "2100-01-01",
                mediaUrl: "https://example.invalid/private.jpg",
              },
              {
                id: "../../account",
                citySlug: "Madrid",
                expiresAt: "2100-01-01",
                mediaUrl: "/api/community/stories/../../account/media",
              },
            ],
          },
  }));
  render(<CityStories locale="en" />);
  fireEvent.click(await screen.findByRole("button", { name: /Madrid/ }));
  expect(
    await screen.findByRole("heading", {
      name: "The next moment could be yours",
    }),
  ).toBeVisible();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});

for (const status of [200, 401, 429, 503]) {
  it(`reports only an explicit required reason and handles ${status} honestly without dismissing`, async () => {
    fetcher.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST")
        return {
          ok: status === 200,
          status,
          json: async () => ({ reported: status === 200 }),
        };
      return {
        ok: true,
        json: async () =>
          url.includes("/cities?area=")
            ? { available: true, cities }
            : {
                available: true,
                stories: [
                  {
                    id: "reportable",
                    citySlug: "Madrid",
                    venueName: "Venue",
                    caption: "Current story",
                    expiresAt: "2100-01-01",
                    mediaUrl: "/api/community/stories/reportable/media",
                  },
                ],
              },
      };
    });
    render(<CityStories locale="en" />);
    fireEvent.click(await screen.findByRole("button", { name: /Madrid/ }));
    await screen.findByText("Current story");
    fireEvent.click(screen.getByRole("button", { name: "Report story" }));
    expect(screen.getByRole("button", { name: "Send report" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Report reason"), {
      target: { value: "privacy" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send report" }));
    await waitFor(() =>
      expect(
        fetcher.mock.calls.some(([, init]) => init?.method === "POST"),
      ).toBe(true),
    );
    expect(fetcher).toHaveBeenCalledWith(
      "/api/community/stories/reportable/report",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ reason: "privacy" }),
        credentials: "same-origin",
      }),
    );
    if (status === 200)
      expect(
        await screen.findByText("Report received. Our team will review it."),
      ).toBeVisible();
    else {
      expect(await screen.findByRole("alert")).toBeVisible();
      expect(
        screen.queryByText("Report received. Our team will review it."),
      ).not.toBeInTheDocument();
    }
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByText("Current story")).toBeVisible();
    if (status === 401)
      expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
        "href",
        "/en/auth?next=%2Fen%2Fcommunity",
      );
  });
}
it("shows empty real cities before location permission or story supply", async () => {
  fetcher.mockResolvedValue({
    ok: true,
    json: async () => ({ available: true, cities: [city("Empty")] }),
  });
  render(<CityStories locale="en" />);
  expect(await screen.findByRole("button", { name: /Empty/ })).toBeVisible();
});

it("renders and opens real nullable English city names using Spanish then slug fallback", async () => {
  fetcher.mockImplementation(async (url: string) => ({
    ok: true,
    json: async () =>
      url.includes("/cities?area=")
        ? {
            available: true,
            cities: [
              { ...city("malaga"), nameEn: null, nameEs: "Málaga" },
              { ...city("fallback"), nameEn: null, nameEs: "" },
            ],
          }
        : { available: true, stories: [] },
  }));
  render(<CityStories locale="en" />);
  fireEvent.click(await screen.findByRole("button", { name: /Málaga/ }));
  expect(await screen.findByRole("heading", { name: "Málaga" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Close stories" }));
  fireEvent.click(screen.getByRole("button", { name: /fallback/ }));
  expect(
    await screen.findByRole("heading", { name: "fallback" }),
  ).toBeVisible();
});

it("shares one compact horizontal row with leading controls and singular real counts", async () => {
  fetcher.mockResolvedValue({
    ok: true,
    json: async () => ({ available: true, cities: [city("malaga", 1)] }),
  });
  render(
    <CityStories
      locale="en"
      leadingContent={<button>Fixture add story</button>}
    />,
  );
  const cityButton = await screen.findByRole("button", {
    name: /malaga.*1 story/,
  });
  expect(cityButton.parentElement).toContainElement(
    screen.getByRole("button", { name: "Fixture add story" }),
  );
  expect(screen.getByRole("heading", { name: "City stories" })).toBeVisible();
  expect(screen.getByText("Costa del Sol · 24 h")).toBeVisible();
});
it("ignores an aborted city's delayed JSON after a different city viewer opens", async () => {
  let resolveOld: (value: unknown) => void = () => {};
  fetcher.mockImplementation(async (url: string) => ({
    ok: true,
    json: () =>
      url.includes("/cities?area=")
        ? Promise.resolve({ available: true, cities })
        : url.includes("city=Madrid")
          ? new Promise((resolve) => {
              resolveOld = resolve;
            })
          : Promise.resolve({ available: true, stories: [] }),
  }));
  render(<CityStories locale="en" />);
  fireEvent.click(await screen.findByRole("button", { name: /Madrid/ }));
  await waitFor(() =>
    expect(
      fetcher.mock.calls.some(([url]) => String(url).includes("city=Madrid")),
    ).toBe(true),
  );
  fireEvent.click(screen.getByRole("button", { name: "Close stories" }));
  fireEvent.click(screen.getByRole("button", { name: /Malaga/ }));
  await screen.findByRole("heading", {
    name: "The next moment could be yours",
  });
  await act(async () =>
    resolveOld({
      available: true,
      stories: [
        {
          id: "late",
          citySlug: "Madrid",
          caption: "Stale old city",
          venueName: "Old",
          expiresAt: "2100-01-01",
          mediaUrl: "/api/community/stories/late/media",
        },
      ],
    }),
  );
  expect(screen.queryByText("Stale old city")).not.toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "The next moment could be yours" }),
  ).toBeVisible();
});

it("requests only the selected coarse area and refetches safely when it changes", async () => {
  let finishOld!: (value: unknown) => void;
  let oldSignal!: AbortSignal;
  fetcher.mockImplementation(async (url: string, options: RequestInit) => {
    if (url.includes("area=Fuengirola")) {
      oldSignal = options.signal as AbortSignal;
      return {
        ok: true,
        json: () =>
          new Promise((resolve) => {
            finishOld = resolve;
          }),
      };
    }
    return {
      ok: true,
      json: async () => ({ available: true, cities: [city("Marbella", 0)] }),
    };
  });
  const view = render(<CityStories locale="es" areaLabel="Fuengirola" />);
  await waitFor(() => expect(finishOld).toBeTypeOf("function"));
  view.rerender(<CityStories locale="es" areaLabel="Marbella" />);
  expect(oldSignal.aborted).toBe(true);
  expect(await screen.findByRole("button", { name: /Marbella/ })).toBeVisible();
  await act(async () =>
    finishOld({ available: true, cities: [city("Abades", 0)] }),
  );
  expect(
    screen.queryByRole("button", { name: /Abades/ }),
  ).not.toBeInTheDocument();
  expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
    "/api/community/stories/cities?area=Fuengirola",
    "/api/community/stories/cities?area=Marbella",
  ]);
});
it("uses licensed city-name photos for canonical coastal alias slugs without fake story counts", async () => {
  fetcher.mockResolvedValue({
    ok: true,
    json: async () => ({
      available: true,
      cities: [
        { ...city("malaga-29", 0, 36.72), nameEs: "Málaga", nameEn: "Malaga" },
        {
          ...city("marbella-29", 0, 36.51),
          nameEs: "Marbella",
          nameEn: "Marbella",
        },
        {
          ...city("fuengirola-29", 0, 36.54),
          nameEs: "Fuengirola",
          nameEn: "Fuengirola",
        },
      ],
    }),
  });
  render(<CityStories locale="es" areaLabel="Fuengirola" />);
  const malaga = await screen.findByRole("button", { name: /Málaga/ });
  expect(malaga.querySelector("img")).toHaveAttribute(
    "src",
    expect.stringContaining("/images/cities/malaga.webp"),
  );
  expect(
    screen.getByRole("button", { name: /Marbella/ }).querySelector("img"),
  ).toHaveAttribute(
    "src",
    expect.stringContaining("/images/cities/marbella.webp"),
  );
  expect(screen.getAllByText("Sin historias todavía")).toHaveLength(3);
});
