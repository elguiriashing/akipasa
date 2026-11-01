import { describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ host: "akipasa.com" }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: state.host }),
}));
import manifest from "../src/app/manifest";
import { stayHostRoute } from "../src/lib/akiduermo-routing";
import { GET as legacyIcon } from "../src/app/pwa-icon.svg/route";
import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import sharp from "sharp";

describe("independent AkiSuite installations", () => {
  it.each([
    ["akipasa.com", "AkiPasa", "/es", "/es"],
    ["business.akipasa.com", "AkiBusiness", "/akibusiness", "/es/business"],
    ["akiduermo.akipasa.com", "AkiDuermo", "/akiduermo", "/"],
    ["akiconduzco.akipasa.com", "AkiConduzco", "/akiconduzco", "/"],
  ])(
    "resolves %s without changing existing AkiPasa identity",
    async (host, name, id, start) => {
      state.host = host;
      const app = await manifest();
      expect(app).toMatchObject({
        name,
        short_name: name,
        id,
        start_url: start,
        scope: "/",
      });
      if (host === "akiconduzco.akipasa.com") {
        expect(
          app.icons?.filter((icon) => icon.type === "image/png"),
        ).toHaveLength(0);
        expect(
          app.icons?.some((icon) => icon.src === "/brand/v3/coches.svg"),
        ).toBe(true);
      } else {
        expect(
          app.icons?.filter((icon) => icon.type === "image/png"),
        ).toHaveLength(4);
        expect(
          app.icons
            ?.filter((icon) => icon.purpose === "maskable")
            .map((icon) => icon.sizes),
        ).toEqual(["192x192", "512x512"]);
      }
    },
  );
  it.each(["/manifest.webmanifest", "/sw.js", "/offline.html"])(
    "keeps stay install resource %s on its own origin",
    (path) => {
      expect(stayHostRoute(path).kind).toBe("public");
    },
  );
});

describe("current AkiPasa visual identity", () => {
  it("uses versioned movement icons without changing the installed app identity", async () => {
    state.host = "akipasa.com";
    const app = await manifest();
    expect(app.id).toBe("/es");
    expect(app.icons?.map((icon) => icon.src)).toEqual([
      "/brand/v3/pasa-2026.svg",
      "/brand/v3/pasa-2026-192.png",
      "/brand/v3/pasa-2026-maskable-192.png",
      "/brand/v3/pasa-2026-512.png",
      "/brand/v3/pasa-2026-maskable-512.png",
    ]);
  });

  it.each([
    ["akipasa.com", "pasa-2026"],
    ["business.akipasa.com", "business"],
    ["akiduermo.akipasa.com", "duermo"],
    ["akiconduzco.akipasa.com", "coches"],
  ])(
    "resolves the legacy SVG endpoint on %s to the canonical asset",
    (host, product) => {
      const response = legacyIcon(
        new NextRequest(`https://${host}/pwa-icon.svg`),
      );
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        `https://${host}/brand/v3/${product}.svg`,
      );
    },
  );

  it("refreshes legacy aliases and exports crisp raster sizes", async () => {
    const current = await readFile("public/brand/v3/pasa-2026.svg", "utf8");
    expect(current).toContain("M351,90");
    expect(current).toContain("M600,372");
    expect(current).not.toContain("M27 6");
    for (const path of [
      "public/brand/v3/pasa.svg",
      "public/favicon.svg",
      "public/pwa-icon.svg",
      "src/app/icon.svg",
    ])
      expect(await readFile(path, "utf8")).toBe(current);
    for (const size of [32, 180, 192, 512, 1024]) {
      const bytes = await readFile(`public/brand/v3/pasa-2026-${size}.png`);
      expect(await sharp(bytes).metadata()).toMatchObject({
        width: size,
        height: size,
      });
      expect(await readFile(`public/brand/v3/pasa-${size}.png`)).toEqual(bytes);
    }
  });

  it("keeps all maskable artwork within the circular safe zone", async () => {
    const { data, info } = await sharp(
      "public/brand/v3/pasa-2026-maskable-512.png",
    )
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let colouredPixels = 0;
    for (let y = 0; y < info.height; y++)
      for (let x = 0; x < info.width; x++) {
        const offset = (y * info.width + x) * 4;
        // Ignore the opaque cream backing and antialiasing at its boundary.
        if (
          Math.abs(data[offset] - 250) +
            Math.abs(data[offset + 1] - 247) +
            Math.abs(data[offset + 2] - 242) <
          30
        )
          continue;
        colouredPixels++;
        expect(Math.hypot(x - 255.5, y - 255.5)).toBeLessThan(204.8);
      }
    expect(colouredPixels).toBeGreaterThan(1000);
  });
});
