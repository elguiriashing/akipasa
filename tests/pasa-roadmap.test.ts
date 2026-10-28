import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { launchPhases, localized, roadmapFeatures } from "../src/lib/pasa-roadmap";

describe("Costa del Sol-first public launch roadmap", () => {
  it("contains four ordered phases without fabricated launch dates", () => {
    expect(launchPhases.map((phase) => phase.key)).toEqual(["build", "coast", "refine", "expand"]);
    expect(launchPhases.map((phase) => phase.status)).toEqual(["current", "next", "planned", "planned"]);
    expect(launchPhases[1].title.en).toContain("Costa del Sol");
    expect(launchPhases[3].description.en).toContain("real interest");
    for (const phase of launchPhases) {
      expect(phase.schedule.en).not.toMatch(/\b20\d{2}[-/]\d{2}[-/]\d{2}\b/);
      expect(phase.schedule.es.length).toBeGreaterThan(4);
      expect(phase.description.en.length).toBeGreaterThan(20);
      expect(phase.description.es.length).toBeGreaterThan(20);
    }
  });

  it("distinguishes restricted AkiPals testing from future friends", () => {
    expect(roadmapFeatures.find((feature) => feature.name === "AkiPals")?.state).toBe("private");
    expect(roadmapFeatures.find((feature) => feature.name === "Friends + plans")?.state).toBe("planned");
    expect(localized(launchPhases[0].title, "es")).toBe("Construirlo bien");
  });

  it("exposes both locale pages, public short URL and a reusable launch notice", () => {
    const short = readFileSync("src/app/roadmap/page.tsx", "utf8");
    const page = readFileSync("src/app/[locale]/roadmap/page.tsx", "utf8");
    const shell = readFileSync("src/components/AppShell.tsx", "utf8");
    const ribbon = readFileSync("src/components/LaunchRibbon.tsx", "utf8");
    expect(short).toContain('permanentRedirect("/es/roadmap")');
    expect(page).toContain("/roadmap");
    expect(page).toContain("launchPhases.map");
    expect(shell).toContain("<LaunchRibbon locale={locale} />");
    expect(ribbon).toContain("href={`/${locale}/roadmap`}");
    expect(ribbon).not.toContain("<marquee");
  });

  it("adds a truthful roadmap link on empty discovery results", () => {
    const home = readFileSync("src/app/[locale]/page.tsx", "utf8");
    expect(home).toContain('No plans nearby yet');
    expect(home).toContain("See our rollout plan");
    expect(home).toContain("/roadmap");
  });
});
