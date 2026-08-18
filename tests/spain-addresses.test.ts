import { afterEach, describe, expect, it, vi } from "vitest";
import { googleMapsDirectionsUrl } from "../src/lib/maps";
import { searchSpainAddresses } from "../src/lib/spain-addresses";

afterEach(() => vi.unstubAllGlobals());

describe("Spanish address search", () => {
  it("normalizes precise CartoCiudad results in Spain", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              id: "portal-11",
              type: "portal",
              address:
                "AVENIDA ANTONIO MACHADO 11, Arroyo de la Miel-Benalmadena Costa (Benalmádena)",
              postalCode: "29630",
              poblacion: "Arroyo de la Miel-Benalmadena Costa",
              muni: "Benalmádena",
              province: "Málaga",
              lat: 36.60069,
              lng: -4.51558,
              countryCode: "011",
            },
          ]),
          { headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const results = await searchSpainAddresses(
      "Avenida Antonio Machado 11 Benalmádena",
      "address",
    );
    expect(results).toEqual([
      expect.objectContaining({
        id: "portal-11",
        locality: "Benalmádena",
        province: "Málaga",
        postalCode: "29630",
        latitude: 36.60069,
        longitude: -4.51558,
      }),
    ]);
    expect(results[0].address).toContain("España");
  });

  it("only returns municipalities for locality searches", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              id: "29025",
              type: "Municipio",
              address: "Benalmádena, Málaga",
              muni: "Benalmádena",
              province: "Málaga",
              lat: 0,
              lng: 0,
              countryCode: "011",
            },
            {
              id: "street",
              type: "callejero",
              address: "CALLE MÁLAGA",
              muni: "Benalmádena",
              province: "Málaga",
              lat: 0,
              lng: 0,
              countryCode: "011",
            },
          ]),
          { headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const results = await searchSpainAddresses("Benalmádena", "locality");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      locality: "Benalmádena",
      kind: "locality",
      latitude: null,
      longitude: null,
    });
  });

  it("opens Google Maps directions with the human-readable address", () => {
    const url = new URL(
      googleMapsDirectionsUrl({
        address: "Avenida Antonio Machado 11, Benalmádena, Málaga, España",
        latitude: 36.60069,
        longitude: -4.51558,
      }),
    );
    expect(url.origin).toBe("https://www.google.com");
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("destination")).toContain("Benalmádena");
  });
});
