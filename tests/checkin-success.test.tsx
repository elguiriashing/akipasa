// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { client, result, filters } = vi.hoisted(() => {
  const result = {
    data: null as null | Record<string, unknown>,
    error: null as null | object,
  };
  const filters: Array<[string, unknown]> = [];
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn((key: string, value: unknown) => {
      filters.push([key, value]);
      return query;
    }),
    maybeSingle: vi.fn(async () => result),
  };
  const client = { from: vi.fn(() => query) };
  return { client, result, filters };
});
vi.mock("../src/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => client),
}));
import { createSupabaseServerClient } from "../src/lib/supabase/server";
import { CheckInSuccess } from "../src/components/CheckInSuccess";
const id = "00000000-0000-4000-8000-000000000001";
const props = { locale: "en" as const, checkInId: id, profileId: "owner" };
beforeEach(() => {
  result.data = null;
  result.error = null;
  filters.length = 0;
  vi.clearAllMocks();
});
afterEach(cleanup);
describe("server-authoritative check-in celebration", () => {
  it("does not query or celebrate a forged or missing receipt", async () => {
    expect(
      await CheckInSuccess({ ...props, checkInId: "accepted" }),
    ).toBeNull();
    expect(await CheckInSuccess({ ...props, checkInId: undefined })).toBeNull();
    expect(client.from).not.toHaveBeenCalled();
  });
  it.each([
    null,
    { id, state: "duplicate" },
    { id: "other", state: "accepted" },
  ])(
    "withholds success for an unavailable or unaccepted visit %j",
    async (data) => {
      result.data = data;
      expect(await CheckInSuccess(props)).toBeNull();
      expect(filters).toEqual([
        ["id", id],
        ["profile_id", "owner"],
        ["state", "accepted"],
      ]);
    },
  );
  it("fails closed on a read error even when stale accepted data is present", async () => {
    result.data = { id, state: "accepted", distance_meters: 3 };
    result.error = { message: "unavailable" };
    expect(await CheckInSuccess(props)).toBeNull();
  });
  it.each(["en", "es"] as const)(
    "celebrates only an owned accepted row in %s and displays actual server distance",
    async (locale) => {
      result.data = { id, state: "accepted", distance_meters: 28 };
      render(await CheckInSuccess({ ...props, locale }));
      expect(screen.getByRole("status")).toHaveTextContent(
        locale === "en"
          ? "Location confirmed by the server"
          : "Ubicación confirmada por el servidor",
      );
      expect(screen.getByRole("status")).toHaveTextContent("28 m");
      expect(screen.getByRole("heading", { level: 2 })).toBeVisible();
    },
  );
  it.each([null, -1, NaN, Infinity, "28"])(
    "never invents a distance from malformed server data %j",
    async (distance_meters) => {
      result.data = { id, state: "accepted", distance_meters };
      render(await CheckInSuccess(props));
      expect(screen.getByRole("status")).not.toHaveTextContent(
        "Verified distance",
      );
      expect(screen.getByRole("status")).not.toHaveTextContent(
        "Location confirmed",
      );
      expect(screen.getByRole("status")).toHaveTextContent(
        "Distance details are unavailable for this receipt",
      );
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
        "You’re checked in!",
      );
      expect(screen.getByRole("status")).not.toHaveTextContent("radius");
    },
  );
  it("keeps the Spanish accepted celebration neutral when distance was not retained", async () => {
    result.data = { id, state: "accepted", distance_meters: null };
    render(await CheckInSuccess({ ...props, locale: "es" }));
    expect(screen.getByRole("status")).not.toHaveTextContent(
      "Ubicación confirmada",
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Los detalles de distancia no están disponibles",
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "¡Ya estás dentro!",
    );
  });
  it("keeps Passport available without success claims when client creation rejects", async () => {
    vi.mocked(createSupabaseServerClient).mockRejectedValueOnce(
      new Error("session transport unavailable"),
    );
    await expect(CheckInSuccess(props)).resolves.toBeNull();
    expect(client.from).not.toHaveBeenCalled();
  });
  it("keeps Passport available without success claims when the receipt query rejects", async () => {
    client
      .from()
      .maybeSingle.mockRejectedValueOnce(
        new Error("receipt transport unavailable"),
      );
    await expect(CheckInSuccess(props)).resolves.toBeNull();
    expect(filters).toEqual([
      ["id", id],
      ["profile_id", "owner"],
      ["state", "accepted"],
    ]);
  });
});
