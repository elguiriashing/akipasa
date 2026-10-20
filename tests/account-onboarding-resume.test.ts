import { afterEach, expect, it, vi } from "vitest";
import {
  accountResumeNext,
  accountTaskResume,
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
