// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: (destination: string) => {
    throw new Error(`redirect:${destination}`);
  },
  notFound: () => {
    throw new Error("not-found");
  },
}));
import LegacyCreatorPage from "../src/app/[locale]/creators/[slug]/page";

it.each(["en", "es"])(
  "keeps the %s public alias same-origin and encodes a decoded slug once",
  async (locale) => {
    await expect(
      LegacyCreatorPage({
        params: Promise.resolve({ locale, slug: "artist%20%26%20company" }),
      }),
    ).rejects.toThrow(
      `redirect:/${locale}/community/creators/artist%20%26%20company`,
    );
  },
);
it.each(["", ".", "..", "%2Foutside", "%5Coutside", "%ZZ"])(
  "rejects unsafe or malformed alias %s",
  async (slug) => {
    await expect(
      LegacyCreatorPage({ params: Promise.resolve({ locale: "en", slug }) }),
    ).rejects.toThrow("not-found");
  },
);
it("does not expose the public styling wrapper to the protected creator studio", () => {
  const css = readFileSync(
    resolve("src/components/community/public-creators-release.css"),
    "utf8",
  );
  // Every style rule, including nested media rules, must name the public wrapper.
  const selectors = [...css.matchAll(/([^{}]+)\{/g)]
    .map((match) => match[1].replace(/\/\*[\s\S]*?\*\//g, "").trim())
    .filter((selector) => !selector.startsWith("@"));
  expect(selectors.length).toBeGreaterThan(35);
  for (const selector of selectors) {
    for (const branch of selector.split(/,(?![^()]*\))/))
      expect(branch).toContain(".public-creators-release");
  }
  const studio = readFileSync(
    resolve("src/app/[locale]/community/creator/page.tsx"),
    "utf8",
  );
  expect(studio).not.toContain("public-creators-release");
});
