import { expect, test } from "@playwright/test";

// These are anonymous HTTP handoffs, not authenticated destination acceptance.
for (const locale of ["en", "es"] as const) {
  test(`${locale} compatibility URLs preserve canonical destinations and guest returns`, async ({
    request,
  }) => {
    const slug = "artist & company";
    const creator = await request.get(
      `/${locale}/creators/${encodeURIComponent(slug)}?next=https%3A%2F%2Fevil.invalid`,
      { maxRedirects: 0 },
    );
    expect(creator.status()).toBe(307);
    const canonicalCreator = new URL(
      creator.headers().location!,
      creator.url(),
    );
    expect(canonicalCreator.origin).toBe(new URL(creator.url()).origin);
    expect(canonicalCreator.pathname).toBe(
      `/${locale}/community/creators/${encodeURIComponent(slug)}`,
    );
    expect(canonicalCreator.search).toBe("");

    for (const [query, expectedPath, expectedQueue] of [
      ["view=support&queue=claims", `/${locale}/staff/support`, null],
      ["view=audit", `/${locale}/admin/audit`, null],
      [
        "queue=claims%26show%3Dprivate",
        `/${locale}/staff/moderation`,
        "claims&show=private",
      ],
    ] as const) {
      const moderation = await request.get(`/${locale}/moderation?${query}`, {
        maxRedirects: 0,
      });
      expect(moderation.status()).toBe(307);
      const destination = new URL(
        moderation.headers().location!,
        moderation.url(),
      );
      expect(destination.origin).toBe(new URL(moderation.url()).origin);
      expect(destination.pathname).toBe(expectedPath);
      expect(destination.searchParams.get("queue")).toBe(expectedQueue);
      expect(destination.searchParams.has("show")).toBe(false);
    }

    const staffAudit = await request.get(`/${locale}/staff/audit`, {
      maxRedirects: 0,
    });
    expect(staffAudit.status()).toBe(307);
    const auth = new URL(staffAudit.headers().location!, staffAudit.url());
    expect(auth.origin).toBe(new URL(staffAudit.url()).origin);
    expect(auth.pathname).toBe(`/${locale}/auth`);
    expect(auth.searchParams.get("next")).toBe(`/${locale}/staff/audit`);
  });
}
