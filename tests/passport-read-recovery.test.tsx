// @vitest-environment jsdom
import React, { type ReactNode } from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const state = vi.hoisted(() => ({ failed: "", from: vi.fn() }));

vi.mock("@/lib/auth", () => ({
  optionalUser: async () => ({
    user: { id: "explorer" },
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
    totalXp,
    totalStamps,
    progress,
    routes,
    stamps,
    badges,
  }: {
    totalXp: number | null;
    totalStamps: number | null;
    progress: ReactNode;
    routes: ReactNode;
    stamps: ReactNode;
    badges: ReactNode;
  }) => (
    <main
      data-testid="passport-book"
      data-xp={totalXp === null ? "unknown" : totalXp}
      data-stamps={totalStamps === null ? "unknown" : totalStamps}
    >
      {progress}
      {routes}
      {stamps}
      {badges}
    </main>
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
};

beforeEach(() => {
  state.failed = "";
  rows.xp_ledger = [{ delta: 40 }];
  rows.loyalty_ledger = [{ program_id: "program-1", delta: 2 }];
  state.from.mockImplementation((table: string) => {
    const result = {
      data: rows[table] || [],
      error: state.failed === table ? { message: "private failure" } : null,
    };
    const query = {
      select: () => query,
      eq: () => query,
      in: () => query,
      lte: () => query,
      gte: () => query,
      order: () => query,
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve(result).then(resolve),
    };
    return query;
  });
});
afterEach(cleanup);

async function renderPage(locale: "en" | "es" = "en") {
  render(
    await PassportsPage({
      params: Promise.resolve({ locale }),
      searchParams: Promise.resolve({}),
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
