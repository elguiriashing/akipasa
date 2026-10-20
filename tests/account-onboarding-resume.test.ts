import { afterEach, expect, it, vi } from "vitest";
import {
  accountResumeNext,
  accountTaskResume,
  accountTaskFromSearch,
  suiteAccountCompletionUrl,
} from "../src/lib/account-task-resume";
import { onboardingUrl } from "../src/lib/account-onboarding";
const state = vi.hoisted(() => ({ status: "complete", identity: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireIdentity: state.identity }));
vi.mock("@/lib/account-onboarding-server", () => ({
  readOnboardingStatus: async () => state.status,
}));
import { GET } from "../src/app/[locale]/account-resume/route";
afterEach(() => vi.clearAllMocks());
it.each(["en", "es"] as const)(
  "retains %s across all fixed product destinations",
  (locale) => {
    for (const [product, path, expected] of [
      [
        "pasa",
        "/account/bookings",
        `https://akipasa.com/${locale}/account/bookings`,
      ],
      [
        "duermo",
        "/bookings?tab=past",
        `https://akiduermo.com/bookings?lang=${locale}&tab=past`,
      ],
      [
        "coches",
        "/rentals/example",
        `https://akicoches.com/rentals/example?lang=${locale}`,
      ],
      [
        "hq",
        "/business?venueId=venue_1",
        `https://akihq.app/${locale}/business?venueId=venue_1`,
      ],
      [
        "business",
        "/?workspace=workspace_1",
        `https://akibusiness.com/?locale=${locale}&workspace=workspace_1`,
      ],
    ])
      expect(accountTaskResume(product, locale, path)?.url).toBe(expected);
  },
);
it.each(["en", "es"] as const)(
  "resumes the canonical %s Passport prestige task",
  (locale) => {
    const next = accountResumeNext(
      "pasa",
      locale,
      `/${locale}/passports/prestige`,
    );
    const completion = new URL(
      suiteAccountCompletionUrl(
        "pasa",
        locale,
        `/${locale}/passports/prestige`,
      ),
    );
    expect(completion.searchParams.get("next")).toBe(next);
    expect(
      accountTaskResume("pasa", locale, `/${locale}/passports/prestige`)?.url,
    ).toBe(`https://akipasa.com/${locale}/passports/prestige`);
  },
);
it.each([
  "https://evil.test",
  "//evil.test",
  "/\\evil.test",
  "/%2e%2e/auth",
  "/account/../auth",
  "/account\r\nLocation:evil",
  "/auth?next=https://evil.test",
  "/onboarding",
  "/account-resume",
])("rejects malicious or looping path %s", (path) => {
  expect(accountTaskResume("pasa", "en", path)?.url).toBe(
    "https://akipasa.com/en/account",
  );
});
it("never accepts a supplied origin, credential or nested redirect query", () => {
  expect(accountTaskResume("evil", "en", "/account")).toBeNull();
  const task = accountTaskResume(
    "business",
    "es",
    "/?workspace=ok&next=https://evil.test&token=secret&locale=en&view=one&view=two",
  );
  expect(task?.url).toBe("https://akibusiness.com/?locale=es&workspace=ok");
});
it("survives email and OAuth returning to the central completion URL", () => {
  const completion = suiteAccountCompletionUrl(
    "duermo",
    "en",
    "/bookings?tab=past",
  );
  const local = completion.replace("https://akipasa.com", "");
  expect(onboardingUrl("en", local)).toBe(local);
  const next = new URL(completion).searchParams.get("next")!;
  expect(next).toBe(accountResumeNext("duermo", "en", "/bookings?tab=past"));
  expect(
    new URL(onboardingUrl("en", next), "https://akipasa.com").searchParams.get(
      "next",
    ),
  ).toBe(next);
});
it.each(["pending", "underage"])(
  "denies direct resume for %s accounts",
  async (status) => {
    state.status = status;
    state.identity.mockResolvedValue({ supabase: {} });
    const response = await GET(
      new Request(
        "https://akipasa.com/en/account-resume?product=duermo&path=/bookings",
      ),
      { params: Promise.resolve({ locale: "en" }) },
    );
    expect(response.headers.get("location")).toContain(
      "https://akipasa.com/en/onboarding?next=",
    );
  },
);
it.each(["complete", "exempt"])(
  "resumes only after authoritative %s status",
  async (status) => {
    state.status = status;
    state.identity.mockResolvedValue({ supabase: {} });
    const response = await GET(
      new Request(
        "https://akipasa.com/es/account-resume?product=business&path=%2F%3Fworkspace%3Dtarget",
      ),
      { params: Promise.resolve({ locale: "es" }) },
    );
    expect(response.headers.get("location")).toBe(
      "https://akibusiness.com/?locale=es&workspace=target",
    );
    expect(state.identity).toHaveBeenCalled();
  },
);

it.each(["en", "es"] as const)(
  "retains the bounded %s vehicle, dates and booking page task",
  (locale) => {
    expect(
      accountTaskResume(
        "coches",
        locale,
        "/rentals/example?vehicle=vehicle_1&start=2026-11-01&end=2026-11-04",
      )?.url,
    ).toBe(
      `https://akicoches.com/rentals/example?lang=${locale}&vehicle=vehicle_1&start=2026-11-01&end=2026-11-04`,
    );
    expect(accountTaskResume("duermo", locale, "/bookings?page=3")?.url).toBe(
      `https://akiduermo.com/bookings?lang=${locale}&page=3`,
    );
    expect(
      accountTaskResume(
        "coches",
        locale,
        "/rentals/example?vehicle=one&vehicle=two&start=valid&end=https://evil.test&token=secret",
      )?.url,
    ).toBe(`https://akicoches.com/rentals/example?lang=${locale}&start=valid`);
  },
);

it.each(["en", "es"] as const)(
  "preserves validated %s referral tasks across all five fixed products",
  (locale) => {
    const code = "AKI12345";
    for (const [product, path, origin] of [
      ["pasa", "/referrals", "https://akipasa.com"],
      ["duermo", "/bookings", "https://akiduermo.com"],
      ["coches", "/account", "https://akicoches.com"],
      ["hq", "/business", "https://akihq.app"],
      ["business", "/", "https://akibusiness.com"],
    ] as const) {
      const task = accountTaskResume(
        product,
        locale,
        `${path}?ref=${code}&next=https://evil.invalid&token=secret`,
      )!;
      const target = new URL(task.url);
      expect(target.origin).toBe(origin);
      expect(target.searchParams.get("ref")).toBe(code);
      expect(
        product === "pasa" || product === "hq"
          ? target.pathname.startsWith(`/${locale}/`)
          : target.searchParams.get(
              product === "business" ? "locale" : "lang",
            ) === locale,
      ).toBe(true);
      expect(target.searchParams.has("next")).toBe(false);
      expect(target.searchParams.has("token")).toBe(false);
    }
  },
);
it.each([
  "ref=AKI12345&ref=AKI12345",
  "ref=AKI12345&ref=OTHER123",
  "ref=aki12345",
  "ref=SHORT",
  "ref=" + "A".repeat(25),
  "ref=https://evil.invalid",
  "ref=//evil.invalid",
])("rejects malformed or repeated public referral task %s", (query) => {
  for (const product of [
    "pasa",
    "duermo",
    "coches",
    "hq",
    "business",
  ] as const) {
    const path =
      product === "pasa"
        ? "/referrals"
        : product === "hq"
          ? "/business"
          : product === "business"
            ? "/"
            : "/account";
    const url = new URL(
      accountTaskResume(product, "en", `${path}?${query}`)!.url,
    );
    expect(url.searchParams.has("ref")).toBe(false);
    if (product === "pasa") expect(url.pathname).toBe("/en/account");
  }
});

it.each(["en", "es"] as const)(
  "keeps referral confirmation intent through pending completion in %s without attribution",
  async (locale) => {
    const code = "AKI12345",
      path = `/${locale}/referrals?ref=${code}`;
    state.identity.mockResolvedValue({
      supabase: {
        rpc: () => {
          throw Error("Task resume cannot write attribution");
        },
      },
    });
    const request = () =>
      new Request(
        `https://akipasa.com/${locale}/account-resume?${new URLSearchParams({ product: "pasa", path })}`,
      );
    for (const status of ["pending", "underage"]) {
      state.status = status;
      const response = await GET(request(), {
        params: Promise.resolve({ locale }),
      });
      const completion = new URL(response.headers.get("location")!);
      expect(completion.pathname).toBe(`/${locale}/onboarding`);
      const next = new URL(
        completion.searchParams.get("next")!,
        completion.origin,
      );
      expect(next.searchParams.get("path")).toBe(`/referrals?ref=${code}`);
    }
    for (const status of ["complete", "exempt"]) {
      state.status = status;
      const response = await GET(request(), {
        params: Promise.resolve({ locale }),
      });
      expect(response.headers.get("location")).toBe(
        `https://akipasa.com/${locale}/referrals?ref=${code}`,
      );
    }
  },
);

it.each(["en", "es"] as const)(
  "keeps the original public referral task through direct %s completion",
  (locale) => {
    for (const prefix of ["", `/${locale}`]) {
      const completion = new URL(
        onboardingUrl(
          locale,
          `${prefix}/referrals?ref=AKI12345&next=https://evil.invalid&token=secret`,
        ),
        "https://akipasa.com",
      );
      expect(completion.pathname).toBe(`/${locale}/onboarding`);
      expect(completion.searchParams.get("next")).toBe(
        `/${locale}/referrals?ref=AKI12345`,
      );
    }
    for (const value of [
      "ref=AKI12345&ref=OTHER123",
      "ref=https://evil.invalid",
      "ref=aki12345",
    ]) {
      const completion = new URL(
        onboardingUrl(locale, `/referrals?${value}`),
        "https://akipasa.com",
      );
      expect(completion.searchParams.get("next")).toBe(`/${locale}/account`);
    }
  },
);

it.each(["en", "es"] as const)(
  "round-trips the maximum-length %s referral code in the local completion envelope",
  (locale) => {
    const code = "A".repeat(24),
      requested = `/${locale}/referrals?ref=${code}`;
    const completion = new URL(
      suiteAccountCompletionUrl("pasa", locale, requested),
    );
    const next = new URL(
      completion.searchParams.get("next")!,
      completion.origin,
    );
    expect(completion.pathname).toBe(`/${locale}/onboarding`);
    expect(next.pathname).toBe(`/${locale}/account-resume`);
    expect(next.searchParams.get("product")).toBe("pasa");
    expect(
      accountTaskResume(
        next.searchParams.get("product"),
        locale,
        next.searchParams.get("path")!,
      )?.url,
    ).toBe(`https://akipasa.com/${locale}/referrals?ref=${code}`);
  },
);

it("filters actual server search records without picking a repeated referral or exporting arbitrary URLs", () => {
  expect(
    accountTaskFromSearch("duermo", "en", "/bookings", {
      ref: ["AKI12345", "OTHER123"],
      tab: "past",
      page: "2",
      next: "https://evil.invalid",
      token: "secret",
    }),
  ).toBe("/bookings?tab=past&page=2");
  expect(
    accountTaskFromSearch("business", "es", "/", {
      workspace: "workspace_1",
      ref: "AKI12345",
    }),
  ).toBe("/?ref=AKI12345&workspace=workspace_1");
});
