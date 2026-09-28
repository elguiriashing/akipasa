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
vi.mock("../src/app/[locale]/account/subscription/actions", () => ({
  openBillingPortal: vi.fn(),
  startSubscriptionCheckout: vi.fn(),
}));
import SubscriptionPage from "../src/app/[locale]/account/subscription/page";
afterEach(cleanup);
it("honors the incoming plan and submits only its selected interval and category", async () => {
  render(
    await SubscriptionPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({ plan: "business_pro", category: "food" }),
    }),
  );
  expect(
    screen.getByRole("tab", { name: "Pro" }).getAttribute("aria-selected"),
  ).toBe("true");
  const panel = screen.getByRole("tabpanel");
  const form = within(panel)
    .getByRole("button", { name: "Continue" })
    .closest("form")!;
  expect(new FormData(form).get("interval")).toBe("month");
  fireEvent.click(within(panel).getByRole("radio", { name: /Annual/ }));
  expect(Object.fromEntries(new FormData(form))).toEqual({
    locale: "en",
    plan: "business_pro",
    interval: "year",
    businessCategory: "food",
  });
  fireEvent.click(screen.getByRole("tab", { name: "Personal" }));
  expect(
    within(screen.getByRole("tabpanel")).queryByRole("combobox"),
  ).toBeNull();
  fireEvent.click(screen.getByRole("tab", { name: "Pro" }));
  expect(new FormData(form).get("interval")).toBe("year");
});
