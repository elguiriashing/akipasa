import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pasaSurfaceFamily } from "../src/lib/pasa-surface-families";

type Entry = { scope: string; status: string };
const matrix = JSON.parse(
  readFileSync("docs/AKIPASA_UI_ROUTE_MATRIX_20261028.json", "utf8"),
) as { routes: Record<string, Entry> };

function toUrl(path: string, locale: "en" | "es") {
  return path
    .replace(/^src\/app\/\[locale\]/, `/${locale}`)
    .replace(/\/page\.tsx$/, "")
    .replace(/\[(?:slug|id|token|publicId)\]/g, "sample-entry");
}

describe("one AkiPasa surface system for the full route matrix", () => {
  it.each(["en", "es"] as const)(
    "classifies every in-scope locale page in %s without a fallback",
    (locale) => {
      const paths = Object.entries(matrix.routes)
        .filter(([path, data]) => data.scope !== "other-product" && path.startsWith("src/app/[locale]/"))
        .map(([path]) => path);
      expect(paths.length).toBeGreaterThan(80);
      const unknown = paths.filter((path) => pasaSurfaceFamily(toUrl(path, locale)) === "generic");
      expect(unknown).toEqual([]);
    },
  );

  it("keeps real booking, admin, private and collectible routes distinct", () => {
    expect(pasaSurfaceFamily("/en/events/concert/book")).toBe("booking");
    expect(pasaSurfaceFamily("/es/venues/restaurante")).toBe("detail");
    expect(pasaSurfaceFamily("/es/check-in/sample-token")).toBe("checkin");
    expect(pasaSurfaceFamily("/en/admin/users")).toBe("operations");
    expect(pasaSurfaceFamily("/en/account/profile")).toBe("account");
    expect(pasaSurfaceFamily("/es/community/creators")).toBe("creators");
    expect(pasaSurfaceFamily("/en/akipals")).toBe("pals");
    expect(pasaSurfaceFamily("/es/passports")).toBe("passport");
    expect(pasaSurfaceFamily("/en/privacy")).toBe("legal");
    expect(pasaSurfaceFamily("/en/roadmap")).toBe("roadmap");
  });

  it("uses only one route-aware parent and shared stylesheet", () => {
    const shell = readFileSync("src/components/AppShell.tsx", "utf8");
    const css = readFileSync("src/components/PasaSharedSurfaces.css", "utf8");
    expect(shell).toContain('data-pasa-surface={pasaSurfaceFamily(pathname)}');
    expect(shell).toContain('import "./PasaSharedSurfaces.css"');
    expect(css).toContain('data-pasa-surface="booking"');
    expect(css).toContain('data-pasa-surface="operations"');
    expect(css).toContain('data-pasa-surface="creators"');
    expect(shell.match(/<PasaBottomDock locale=\{locale\}/g)?.length).toBe(1);
  });
});
