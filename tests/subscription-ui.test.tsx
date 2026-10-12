// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
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
it("shows the entire catalogue and submits only the selected plan and interval", async () => {
  render(
    await SubscriptionPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({ from: "akihq" }),
    }),
  );
  expect(screen.queryByRole("tab")).toBeNull();
  expect(screen.getByRole("heading", { name: "Aki Enterprise" })).toBeTruthy();
  const card = screen
    .getByRole("heading", { name: "AkiHQ Pro" })
    .closest("article")!;
  const form = within(card)
    .getByRole("button", { name: "Coming soon" })
    .closest("form")!;
  expect(Object.fromEntries(new FormData(form))).toEqual({
    locale: "en",
    plan: "akihq_pro",
    interval: "month",
  });
  fireEvent.click(screen.getByRole("radio", { name: /Yearly/ }));
  expect(Object.fromEntries(new FormData(form))).toEqual({
    locale: "en",
    plan: "akihq_pro",
    interval: "year",
  });
  expect(within(card).getByText("€576.00")).toBeTruthy();
  expect(screen.queryByRole("combobox")).toBeNull();
});
