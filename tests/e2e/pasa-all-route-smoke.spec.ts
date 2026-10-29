import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { expect, test, type APIRequestContext } from "@playwright/test";

type Entry = {
  scope: "consumer" | "operational" | "cross-product" | "other-product";
  status: "pending" | "in-progress" | "accepted" | "excluded";
};
const matrix = JSON.parse(
  readFileSync("docs/AKIPASA_UI_ROUTE_MATRIX_20261028.json", "utf8"),
) as { routes: Record<string, Entry> };

const inScope = Object.entries(matrix.routes)
  .filter(([, entry]) => entry.scope !== "other-product")
  .map(([sourcePath, entry]) => ({ sourcePath, scope: entry.scope }))
  .sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));

function concretePath(path: string, locale: "en" | "es") {
  const pathname = path
    .replace(/^src\/app\/\[locale\]/, `/${locale}`)
    .replace(/^src\/app\//, "/")
    .replace(/\/page\.tsx$/, "")
    .replace(
      /\[(?:id|slug|token|publicId)\]/g,
      "00000000-0000-4000-8000-000000000001",
    );
  return pathname || "/";
}

type Result = {
  sourcePath: string;
  route: string;
  scope: string;
  status: number;
  location: string | null;
};

async function sweep(
  locale: "en" | "es",
  routes: typeof inScope,
  request: APIRequestContext,
): Promise<Result[]> {
  const receipts: Result[] = [];
  // Bound fixture-server pressure while checking the entire route inventory.
  for (let start = 0; start < routes.length; start += 3) {
    const batch = routes.slice(start, start + 3);
    const results = await Promise.all(
      batch.map(async ({ sourcePath, scope }) => {
        const route = concretePath(sourcePath, locale);
        const response = await request.get(route, {
          maxRedirects: 0,
          timeout: 20_000,
        });
        return {
          sourcePath,
          route,
          scope,
          status: response.status(),
          location: response.headers().location || null,
        };
      }),
    );
    receipts.push(...results);
  }
  return receipts;
}

test.describe("AkiPasa entire route inventory smoke", () => {
  test("matrix still inventories the complete AkiPasa surface", () => {
    expect(Object.keys(matrix.routes)).toHaveLength(103);
    expect(inScope).toHaveLength(90);
  });

  for (const locale of ["en", "es"] as const) {
    test(`all ${locale} localized routes respond without server failure`, async ({
      request,
    }) => {
      test.setTimeout(360_000);
      const routes = inScope.filter(({ sourcePath }) =>
        sourcePath.startsWith("src/app/[locale]/"),
      );
      expect(routes.length).toBeGreaterThan(80);
      const results = await sweep(locale, routes, request);
      expect(results).toHaveLength(routes.length);
      for (const result of results) {
        expect(
          result.status,
          `${result.route} (${result.sourcePath}) returned HTTP ${result.status}`,
        ).toBeLessThan(500);
        expect(result.status).toBeGreaterThanOrEqual(200);
      }
      mkdirSync("test-results", { recursive: true });
      writeFileSync(
        `test-results/pasa-route-smoke-${locale}.json`,
        JSON.stringify(
          {
            sourceCommit: process.env.GITHUB_SHA || "local",
            acceptance: "automated-route-response-only",
            locale,
            routes: results,
          },
          null,
          2,
        ),
      );
    });
  }

  test("all shared public entrypoints respond without server failure", async ({
    request,
  }) => {
    test.setTimeout(120_000);
    const routes = inScope.filter(
      ({ sourcePath }) => !sourcePath.startsWith("src/app/[locale]/"),
    );
    expect(routes).toHaveLength(4);
    const results = await sweep("es", routes, request);
    expect(results).toHaveLength(routes.length);
    for (const result of results) {
      expect(result.status, result.route).toBeLessThan(500);
      expect(result.status, result.route).toBeGreaterThanOrEqual(200);
    }
    mkdirSync("test-results", { recursive: true });
    writeFileSync(
      "test-results/pasa-route-smoke-entrypoints.json",
      JSON.stringify(
        {
          sourceCommit: process.env.GITHUB_SHA || "local",
          acceptance: "automated-route-response-only",
          routes: results,
        },
        null,
        2,
      ),
    );
  });
});
