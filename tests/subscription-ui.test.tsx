// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
vi.mock("@/lib/auth", () => ({
  requireUser: async () => ({
    user: { id: "test" },
    supabase: {
      from: () => {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => ({ data: null }),
          then: (resolve: (value: { data: unknown[] }) => unknown) =>
            Promise.resolve(resolve({ data: [] })),
        };
        return query;
      },
    },
  }),
}));
vi.mock("../src/app/[locale]/account/subscription/akisuite-actions", () => ({
  startAkiSuiteCheckout: vi.fn(),
  prepareAkiSuiteWorkspace: vi.fn(),
}));
vi.mock("../src/app/[locale]/account/subscription/actions", () => ({
  openBillingPortal: vi.fn(),
  startSubscriptionCheckout: vi.fn(),
}));
import SubscriptionPage from "../src/app/[locale]/account/subscription/page";
afterEach(cleanup);
it("shows free management and the canonical operating packages without retired new purchases", async () => {
  render(
    await SubscriptionPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({ from: "akihq" }),
    }),
  );
  expect(screen.queryByRole("tab")).toBeNull();
  expect(screen.getByRole("heading", { name: "Free management" })).toBeTruthy();
  expect(
    within(
      screen
        .getByRole("heading", { name: "Free management" })
        .closest("article")!,
    )
      .getByRole("link", { name: "Open free AkiHQ" })
      .getAttribute("href"),
  ).toBe("https://akihq.app/en/business");
  for (const [name, count] of [
    ["Básico", 4],
    ["Standard", 8],
    ["Pro", 12],
  ] as const) {
    const card = screen.getByRole("heading", { name }).closest("article")!;
    expect(card.textContent).toContain(`${count} of 12 active tools`);
    expect(
      within(card)
        .getByRole("link", { name: "Manage operating tools" })
        .getAttribute("href"),
    ).toBe("/en/account/subscription/operations");
    expect(card.querySelector("form")).toBeNull();
  }
  for (const name of ["Aki Enterprise", "AkiHQ Standard", "AkiHQ Pro"])
    expect(screen.queryByRole("heading", { name })).toBeNull();
  expect(screen.queryByRole("radio", { name: /Yearly/ })).toBeNull();
  const sector = screen.getByRole("combobox", { name: "Business type" });
  expect(
    within(sector)
      .getAllByRole("option")
      .map((option) => option.textContent),
  ).toEqual(["Hospitality", "Accommodation", "Services", "Retail"]);
});
