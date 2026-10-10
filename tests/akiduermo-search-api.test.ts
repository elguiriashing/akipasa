import { beforeEach, expect, it, vi } from "vitest";
import { staySearchTerms } from "../src/lib/stay-filters";

const { db, availability } = vi.hoisted(() => ({
  db: { from: vi.fn(), rpc: vi.fn() },
  availability: vi.fn(),
}));
const ownerDb = vi.hoisted(() => ({
  auth: { getUser: vi.fn() },
  from: vi.fn(),
}));
vi.mock("../src/lib/supabase/public", () => ({
  createSupabasePublicClient: () => db,
}));
vi.mock("../src/lib/feature-flags", () => ({
  loadFeatureFlags: async () => ({ venue_relevance: true }),
}));
vi.mock("../src/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ownerDb,
}));
import { GET } from "../src/app/api/stays/route";

const stay = (id: string) => ({
  id,
  slug: id,
  name: id,
  address: "Fuengirola",
  accommodation_type: "apartment",
  website_url: null,
  cities: { name_es: "Fuengirola" },
});

beforeEach(() => {
  vi.clearAllMocks();
  const query: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ["select", "eq", "textSearch", "order"])
    query[method] = vi.fn(() => query);
  query.range = vi.fn(async () => ({
    data: [stay("a"), stay("b")],
    error: null,
    count: 2,
  }));
  db.from.mockReturnValue(query);
  db.rpc.mockImplementation(async (_name: string, args: { p_venue: string }) =>
    availability(args.p_venue),
  );
  ownerDb.auth.getUser.mockResolvedValue({ data: { user: null } });
});

it("uses the indexed accent-normalized catalogue terms for place and property searches", () => {
  expect(staySearchTerms("Fuengirola")).toBe("fuengirola:*");
  expect(staySearchTerms("AkiDuermo HQ")).toBe("akiduermo:* & hq:*");
  expect(staySearchTerms("Málaga")).toBe("malaga:*");
});

it("filters listed properties through the real room availability RPC", async () => {
  availability.mockImplementation(async (id: string) => ({
    data: id === "a" ? [{ room_type_id: "room", available: 1 }] : [],
    error: null,
  }));
  const response = await GET(
    new Request(
      "https://akiduermo.akipasa.com/api/stays?q=Fuengirola&checkIn=2026-10-10&checkOut=2026-10-14&guests=2",
    ),
  );
  expect(response.status).toBe(200);
  expect(db.from.mock.results[0].value.textSearch).toHaveBeenCalledWith(
    "search_document",
    "fuengirola:*",
    { config: "simple" },
  );
  expect(await response.json()).toMatchObject({
    rows: [{ id: "a" }],
    total: 2,
    availabilityChecked: true,
  });
  expect(db.rpc).toHaveBeenCalledWith("accommodation_available_rooms", {
    p_venue: "a",
    p_in: "2026-10-10",
    p_out: "2026-10-14",
    p_guests: 2,
  });
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});

it("fails closed if availability cannot be checked", async () => {
  availability.mockResolvedValue({
    data: null,
    error: { message: "unavailable" },
  });
  const response = await GET(
    new Request(
      "https://akiduermo.akipasa.com/api/stays?checkIn=2026-10-10&checkOut=2026-10-14&guests=2",
    ),
  );
  expect(response.status).toBe(503);
});

it("includes a hidden stay only for its signed-in manager's private preview", async () => {
  ownerDb.auth.getUser.mockResolvedValue({ data: { user: { id: "owner" } } });
  const membershipQuery: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ["select", "eq", "in"])
    membershipQuery[method] = vi.fn(() => membershipQuery);
  membershipQuery.limit = vi.fn(async () => ({
    data: [
      {
        role: "owner",
        venues: {
          ...stay("hq"),
          status: "published",
          discovery_vertical: "accommodation",
          discovery_enabled: false,
          name: "AkiDuermo HQ",
          address: "Calle Capitán 8, Fuengirola",
        },
      },
    ],
  }));
  ownerDb.from.mockReturnValue(membershipQuery);
  availability.mockImplementation(async (id: string) => ({
    data: id === "hq" ? [{ room_type_id: "room", available: 1 }] : [],
    error: null,
  }));
  const response = await GET(
    new Request(
      "https://akiduermo.akipasa.com/api/stays?q=Fuengirola&checkIn=2026-10-10&checkOut=2026-10-14&guests=2",
      { headers: { cookie: "sb-project-auth-token=session" } },
    ),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    rows: [{ id: "hq", ownerPreview: true }],
  });
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});
