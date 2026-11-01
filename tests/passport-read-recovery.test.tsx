// @vitest-environment jsdom
import React, { type ReactNode } from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

const state = vi.hoisted(() => ({
  failed: "",
  signedIn: true,
  from: vi.fn(),
  filters: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  optionalUser: async () => ({
    user: state.signedIn ? { id: "explorer" } : null,
    supabase: { from: state.from },
  }),
}));
vi.mock("@/lib/passport-repository", () => ({
  myPassportCollection: async () => undefined,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw Error("not-found");
  },
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("@/components/PassportBook", () => ({
  PassportBook: ({
    initialView,
    initialCity,
    totalXp,
    totalStamps,
    notices,
    progress,
    routes,
    stamps,
    badges,
  }: {
    initialView: string;
    initialCity?: string;
    totalXp: number | null;
    totalStamps: number | null;
    notices: ReactNode;
    progress: ReactNode;
    routes: ReactNode;
    stamps: ReactNode;
    badges: ReactNode;
  }) => (
    <main
      data-testid="passport-book"
      data-view={initialView}
      data-city={initialCity}
      data-xp={totalXp === null ? "unknown" : totalXp}
      data-stamps={totalStamps === null ? "unknown" : totalStamps}
    >
      <aside data-testid="absolute-notices">{notices}</aside>
      <div data-testid="scrollable-progress">{progress}</div>
      {routes}
      {stamps}
      {badges}
    </main>
  ),
}));
vi.mock("@/components/CheckInSuccess", () => ({
  CheckInSuccess: () => (
    <section data-testid="verified-receipt">Verified receipt fixture</section>
  ),
}));
vi.mock("@/components/AchievementCelebration", () => ({
  AchievementCelebration: () => null,
}));
vi.mock("@/components/BadgeProgress", () => ({
  BadgeProgress: () => <div>Badge progress loaded</div>,
}));
vi.mock("../src/app/[locale]/passports/actions", () => ({
  claimPassportReward: vi.fn(),
  claimStampReward: vi.fn(),
  enrollPassport: vi.fn(),
}));

import PassportsPage from "../src/app/[locale]/passports/page";

const rows: Record<string, unknown[]> = {
  passports: [
    {
      id: "passport-1",
      slug: "local-route",
      title_es: "Ruta local",
      title_en: "Local route",
      description_es: "Descripción",
      description_en: "Description",
      reward_es: "Premio",
      reward_en: "Reward",
      access_tier: "free",
      completion_window_days: 7,
      passport_steps: [],
      passport_rewards: [],
    },
  ],
  loyalty_programs: [
    {
      id: "program-1",
      title_es: "Café",
      title_en: "Coffee",
      reward_es: "Premio",
      reward_en: "Reward",
      stamps_required: 5,
      venues: { name: "Venue" },
      loyalty_program_rewards: [],
    },
  ],
  loyalty_ledger: [{ program_id: "program-1", delta: 2 }],
  xp_ledger: [{ delta: 40 }],
  passport_progress: [],
  passport_enrollments: [],
  reward_claims: [],
  check_ins: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  state.failed = "";
  state.signedIn = true;
  rows.xp_ledger = [{ delta: 40 }];
  rows.loyalty_ledger = [{ program_id: "program-1", delta: 2 }];
  rows.check_ins = [];
  state.from.mockImplementation((table: string) => {
    const result = {
      data: state.failed === table ? null : rows[table] || [],
      error: state.failed === table ? { message: "private failure" } : null,
    };
    const filter = (method: string, args: unknown[]) => {
      state.filters(table, method, ...args);
      return query;
    };
    const query = {
      select: (...args: unknown[]) => filter("select", args),
      eq: (...args: unknown[]) => filter("eq", args),
      in: (...args: unknown[]) => filter("in", args),
      not: (...args: unknown[]) => filter("not", args),
      lt: (...args: unknown[]) => filter("lt", args),
      lte: (...args: unknown[]) => filter("lte", args),
      gte: (...args: unknown[]) => filter("gte", args),
      order: (...args: unknown[]) => filter("order", args),
      limit: (...args: unknown[]) => filter("limit", args),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve(result).then(resolve),
    };
    return query;
  });
});
afterEach(cleanup);

async function renderPage(
  locale: "en" | "es" = "en",
  query: Record<string, string | undefined> = {},
) {
  render(
    await PassportsPage({
      params: Promise.resolve({ locale }),
      searchParams: Promise.resolve(query),
    }),
  );
}

it.each([
  ["xp_ledger", "xp", "Your XP total is unavailable right now."],
  ["loyalty_ledger", "stamps", "Your stamp balance is unavailable right now."],
] as const)(
  "keeps a failed %s total unknown and disables its dependent view",
  async (table, attribute, message) => {
    state.failed = table;
    await renderPage();

    expect(screen.getByTestId("passport-book")).toHaveAttribute(
      `data-${attribute}`,
      "unknown",
    );
    expect(screen.getByText(message)).toBeVisible();
    if (table === "xp_ledger") {
      expect(
        screen.queryByText("Badge progress loaded"),
      ).not.toBeInTheDocument();
    } else {
      expect(screen.getByText("Badge progress loaded")).toBeVisible();
    }
  },
);

it.each([
  ["passports", "Passports are unavailable right now."],
  ["loyalty_programs", "Stamp cards are unavailable right now."],
  ["passport_progress", "Your step progress is unavailable right now."],
  ["passport_enrollments", "Your started passports are unavailable right now."],
  ["reward_claims", "Your rewards are unavailable right now."],
] as const)(
  "shows a retry instead of false content when %s fails",
  async (table, message) => {
    state.failed = table;
    await renderPage();

    expect(screen.getAllByText(message).length).toBeGreaterThan(0);
    expect(screen.queryByText("private failure")).not.toBeInTheDocument();
    if (table === "passport_enrollments") {
      expect(
        screen.queryByRole("button", { name: "Start passport" }),
      ).not.toBeInTheDocument();
    }
  },
);

it("preserves confirmed zero values and available actions", async () => {
  rows.xp_ledger = [];
  rows.loyalty_ledger = [];
  await renderPage();

  expect(screen.getByTestId("passport-book")).toHaveAttribute("data-xp", "0");
  expect(screen.getByTestId("passport-book")).toHaveAttribute(
    "data-stamps",
    "0",
  );
  expect(screen.getByRole("button", { name: "Start passport" })).toBeEnabled();
  expect(screen.getByText("Badge progress loaded")).toBeVisible();
});

it("bounds weekly history to the caller and accepted venue credentials", async () => {
  await renderPage();

  expect(state.filters).toHaveBeenCalledWith(
    "check_ins",
    "eq",
    "profile_id",
    "explorer",
  );
  expect(state.filters).toHaveBeenCalledWith(
    "check_ins",
    "eq",
    "state",
    "accepted",
  );
  expect(state.filters).toHaveBeenCalledWith(
    "check_ins",
    "not",
    "credential_id",
    "is",
    null,
  );
  expect(state.filters).toHaveBeenCalledWith("check_ins", "limit", 100);
  for (const boundary of ["gte", "lt"]) {
    expect(state.filters).toHaveBeenCalledWith(
      "check_ins",
      boundary,
      "created_at",
      expect.any(String),
    );
  }
  expect(screen.getAllByRole("progressbar")).toHaveLength(2);
  expect(screen.getByTestId("passport-book")).toHaveAttribute("data-xp", "40");
});

it.each(["en", "es"] as const)(
  "does not turn unavailable weekly history into false zero progress in %s",
  async (locale) => {
    state.failed = "check_ins";
    await renderPage(locale);

    expect(screen.getByRole("alert")).toHaveTextContent(
      locale === "es"
        ? "Ahora mismo no podemos consultar tus check-ins."
        : "Your check-ins can't be loaded right now.",
    );
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText("private failure")).not.toBeInTheDocument();
    expect(screen.getByTestId("passport-book")).toHaveAttribute(
      "data-xp",
      "40",
    );
  },
);

it("never queries private weekly history while signed out", async () => {
  state.signedIn = false;
  await renderPage();

  expect(state.from).not.toHaveBeenCalledWith("check_ins");
  expect(
    screen.getByText("Sign in to see your visits from this week."),
  ).toBeVisible();
});

it.each(["en", "es"] as const)(
  "preserves all generated %s chapter URLs and feedback defaults",
  async (locale) => {
    for (const view of [
      "cover",
      "index",
      "progress",
      "passports",
      "stamps",
      "badges",
    ]) {
      await renderPage(locale, { view });
      expect(screen.getByTestId("passport-book")).toHaveAttribute(
        "data-view",
        view,
      );
      cleanup();
    }
    for (const [query, expected] of [
      [{}, "cover"],
      [{ view: "unsupported" }, "progress"],
      [{ checkin: "verified" }, "progress"],
      [{ reward: "ready" }, "progress"],
      [{ passport: "started" }, "progress"],
      [{ view: "index", reward: "ready" }, "index"],
    ] as const) {
      await renderPage(locale, query);
      expect(screen.getByTestId("passport-book")).toHaveAttribute(
        "data-view",
        expected,
      );
      cleanup();
    }
    await renderPage(locale, { city: "malaga", view: "cover" });
    expect(screen.getByTestId("passport-book")).toHaveAttribute(
      "data-city",
      "malaga",
    );
    expect(screen.getByTestId("passport-book")).toHaveAttribute(
      "data-view",
      "cover",
    );
  },
);

it.each(["en", "es"] as const)(
  "keeps %s accepted receipt and optional sharing in scrollable progress before weekly content",
  async (locale) => {
    vi.stubEnv("AKIPASA_COMMUNITY_STORIES_SCHEMA_READY", "true");
    vi.stubEnv("AKIPASA_COMMUNITY_STORIES_ENABLED", "true");
    try {
      await renderPage(locale, {
        checkin: "accepted",
        visit: "00000000-0000-4000-8000-000000000001",
      });
      const notices = screen.getByTestId("absolute-notices");
      const progress = screen.getByTestId("scrollable-progress");
      expect(
        within(notices).queryByTestId("verified-receipt"),
      ).not.toBeInTheDocument();
      expect(
        within(notices).queryByRole("link", {
          name: /Share a photo|Compartir una foto/,
        }),
      ).not.toBeInTheDocument();
      expect(notices).not.toHaveTextContent(
        /Check below|Consulta abajo|Check-in accepted|Check-in aceptado/,
      );
      const receipt = within(progress).getByTestId("verified-receipt");
      const share = within(progress).getByRole("link", {
        name:
          locale === "en"
            ? "Share a photo from my visit (optional)"
            : "Compartir una foto de mi visita (opcional)",
      });
      const weekly = within(progress).getByRole("heading", {
        name:
          locale === "en"
            ? "Your week of exploring"
            : "Tu semana de exploración",
      });
      expect(receipt.parentElement).toBe(share.parentElement);
      expect(
        receipt.compareDocumentPosition(share) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        share.compareDocumentPosition(weekly) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(screen.getByTestId("passport-book")).toHaveAttribute(
        "data-view",
        "progress",
      );
    } finally {
      vi.unstubAllEnvs();
    }
  },
);
