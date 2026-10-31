import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  expect,
  test,
  type APIResponse,
  type TestInfo,
} from "@playwright/test";

type HTTPObservation = {
  path: string;
  status: number;
  location: string | null;
};
const observations = new WeakMap<TestInfo, HTTPObservation[]>();
function recordResponse(response: APIResponse, testInfo: TestInfo) {
  const url = new URL(response.url());
  const records = observations.get(testInfo) || [];
  records.push({
    path: url.pathname + url.search,
    status: response.status(),
    location: response.headers().location || null,
  });
  observations.set(testInfo, records);
}

test.afterEach(async ({ request }, testInfo) => {
  void request;
  const path = testInfo.outputPath("http-contract-result.json");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    JSON.stringify(
      {
        title: testInfo.title,
        status: testInfo.status,
        expectedStatus: testInfo.expectedStatus,
        sourceCommit: process.env.GITHUB_SHA || "local",
        evidenceType: "actual-guest-http-no-image",
        observed: observations.get(testInfo) || [],
        limitation:
          "Synthetic anonymous HTTP redirects only; no authenticated destination, role, image or device acceptance.",
      },
      null,
      2,
    ),
  );
  await testInfo.attach("HTTP contract result", {
    path,
    contentType: "application/json",
  });
});

// These are anonymous HTTP handoffs, not authenticated destination acceptance.
for (const locale of ["en", "es"] as const) {
  test(`${locale} creator compatibility URL preserves its canonical destination`, async ({
    request,
  }, testInfo) => {
    const slug = "artist & company";
    const creator = await request.get(
      `/${locale}/creators/${encodeURIComponent(slug)}?next=https%3A%2F%2Fevil.invalid`,
      { maxRedirects: 0 },
    );
    recordResponse(creator, testInfo);
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
  });

  test(`${locale} moderation compatibility URLs preserve queue boundaries`, async ({
    request,
  }, testInfo) => {
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
      recordResponse(moderation, testInfo);
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
  });

  for (const workspace of ["staff", "admin"] as const) {
    test(`${locale} ${workspace} audit guest return retains its task and replaces forged headers`, async ({
      request,
    }, testInfo) => {
      const path = `/${locale}/${workspace}/audit`;
      const query = "queue=claims%26show%3Dprivate&period=30&tag=a&tag=b";
      const otherLocale = locale === "en" ? "es" : "en";
      const requests: { target: string; headers: Record<string, string> }[] = [
        { target: path, headers: {} },
        {
          target: `${path}?${query}`,
          headers: {
            "x-akipasa-workspace-next": "https://evil.invalid/stolen-return",
          },
        },
        {
          target: `${path}?${query}`,
          headers: {
            "x-akipasa-workspace-next": `/${otherLocale}/${workspace}/users?show=private`,
          },
        },
      ];
      for (const { target, headers } of requests) {
        const response = await request.get(target, {
          maxRedirects: 0,
          headers,
        });
        recordResponse(response, testInfo);
        expect(response.status()).toBe(307);
        const auth = new URL(response.headers().location!, response.url());
        expect(auth.origin).toBe(new URL(response.url()).origin);
        expect(auth.pathname).toBe(`/${locale}/auth`);
        expect(auth.searchParams.get("next")).toBe(target);
        const next = new URL(auth.searchParams.get("next")!, response.url());
        expect(next.origin).toBe(new URL(response.url()).origin);
        expect(next.pathname).toBe(path);
        if (target.includes("?")) {
          expect(next.searchParams.get("queue")).toBe("claims&show=private");
          expect(next.searchParams.get("period")).toBe("30");
          expect(next.searchParams.getAll("tag")).toEqual(["a", "b"]);
          expect(next.searchParams.has("show")).toBe(false);
        }
      }
    });
  }
}
