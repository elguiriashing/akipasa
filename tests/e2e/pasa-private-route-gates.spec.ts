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
        // Membership aliases are normalized by middleware before auth runs.
        // Verify the canonical destination still enforces sign-in rather than
        // assuming the first 307 is issued by requireUser.
        if (
          path === "/account/membership" ||
          path === "/account/memberships"
        ) {
          const destination = new URL(redirect, response.url());
          expect(
            destination.origin,
            `${route} must stay on the same origin`,
          ).toBe(new URL(response.url()).origin);
          expect(destination.pathname).toBe(
            `/${locale}/account/subscription`,
          );
          const canonical = await request.get(destination.toString(), {
            maxRedirects: 0,
          });
          expect([303, 307], `${route} canonical guest gate`).toContain(
            canonical.status(),
          );
          const signIn = new URL(
            canonical.headers().location || "",
            canonical.url(),
          );
          expect(signIn.origin).toBe(new URL(canonical.url()).origin);
          expect(signIn.pathname).toBe(`/${locale}/auth`);
          expect(signIn.searchParams.get("next")).toMatch(
            new RegExp(`^/${locale}/account/subscription(?:\\?|$)`),
          );
          continue;
        }
        const signIn = new URL(redirect, response.url());
        expect(signIn.origin, `${route} sign-in must remain same-origin`).toBe(
          new URL(response.url()).origin,
        );
        expect(signIn.pathname, `${route} must enforce sign-in`).toBe(
          `/${locale}/auth`,
        );
        expect(signIn.searchParams.get("next"), route).toBeTruthy();
      }
    });
  }
});
