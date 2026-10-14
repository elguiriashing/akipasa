import { describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ host: "akipasa.com" }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: state.host }),
}));
import manifest from "../src/app/manifest";
import { stayHostRoute } from "../src/lib/akiduermo-routing";

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
          app.icons?.some((icon) => icon.src === "/brand/conduzco-icon.svg"),
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
