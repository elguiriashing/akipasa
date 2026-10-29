import { expect, test } from "@playwright/test";

// These routes have no visual surface. Inspect real HTTP redirects without
// following external hosts or invoking authentication, checkout or data writes.
test("root canonicalization retains repeated and encoded campaign values", async ({
  request,
}) => {
  const query =
    "utm_source=partner&utm_campaign=costa%20del%20sol&campaign=a&campaign=b";
  const response = await request.get(`/?${query}`, { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  const target = new URL(response.headers().location || "", response.url());
  expect(target.origin).toBe(new URL(response.url()).origin);
  expect(target.pathname).toBe("/es");
  expect(target.searchParams.get("utm_campaign")).toBe("costa del sol");
  expect(target.searchParams.getAll("campaign")).toEqual(["a", "b"]);
});

for (const locale of ["en", "es"] as const) {
  test(`${locale} accommodation alias fixes originating product and ignores destination injection`, async ({
    request,
  }) => {
    const response = await request.get(
      `/${locale}/duermo/memberships?from=akibusiness&next=https%3A%2F%2Fevil.invalid`,
      { maxRedirects: 0 },
    );
    expect(response.status()).toBe(307);
    const target = new URL(response.headers().location || "", response.url());
    expect(target.origin).toBe(new URL(response.url()).origin);
    expect(target.pathname).toBe(`/${locale}/membership`);
    expect([...target.searchParams.entries()]).toEqual([["from", "akiduermo"]]);
  });
}
