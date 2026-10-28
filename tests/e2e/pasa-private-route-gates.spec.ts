import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

type RouteRecord = {
  scope: string;
  status: string;
};

const manifest = JSON.parse(
  readFileSync("docs/AKIPASA_UI_ROUTE_MATRIX_20261028.json", "utf8"),
) as { routes: Record<string, RouteRecord> };

const privateRoutes = Object.keys(manifest.routes)
  .filter((path) =>
    /^src\/app\/\[locale\]\/(account|admin|staff)(?:\/.*)?\/page\.tsx$/.test(
      path,
    ),
  )
  .map((path) =>
    path
      .replace(/^src\/app\/\[locale\]/, "")
      .replace(/\/page\.tsx$/, "")
      .replace(/\[id\]/g, "00000000-0000-4000-8000-000000000001"),
  )
  .sort();

test.describe("AkiPasa private route matrix", () => {
  for (const locale of ["en", "es"] as const) {
    test(`all ${locale} account, admin and staff pages enforce guest sign-in`, async ({
      request,
    }) => {
      test.setTimeout(180_000);
      expect(privateRoutes.length).toBeGreaterThan(30);
      for (const path of privateRoutes) {
        const route = `/${locale}${path}`;
        const response = await request.get(route, { maxRedirects: 0 });
        expect(
          [303, 307],
          `${route} returned ${response.status()} without an authenticated session`,
        ).toContain(response.status());
        const redirect = response.headers().location || "";
        expect(redirect, `${route} must return to the sign-in page`).toContain(
          `/${locale}/auth?next=`,
        );
      }
    });
  }
});
