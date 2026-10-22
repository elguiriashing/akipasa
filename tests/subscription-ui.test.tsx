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
        const q = {
          select: () => q,
          eq: () => q,
          maybeSingle: async () => ({ data: null }),
          then: (resolve: (value: { data: unknown[] }) => unknown) =>
            Promise.resolve(resolve({ data: [] })),
        };
        return q;
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
it("shows personal memberships separately from free management and software", async () => {
  const { container } = render(
    await SubscriptionPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({ from: "akihq" }),
    }),
  );
  expect(screen.getByRole("tablist", { name: "Membership type" })).toBeTruthy();
  expect(container.querySelectorAll("[data-offer]")).toHaveLength(2);
  expect(container.querySelector("#personal-free")).not.toBeNull();
  fireEvent.click(screen.getByRole("tab", { name: "Business" }));
  const hq = screen.getByRole("heading", { name: "AkiHQ" }).closest("article")!;
  expect(
    within(hq)
      .getByRole("link", { name: /^Open free AkiHQ/ })
      .getAttribute("href"),
  ).toBe("https://akihq.app/en/business");
  expect(
    container.querySelector("#akibusiness_premium")?.textContent,
  ).toContain("Business Premium");
  expect(container.querySelector('a[href*="akibusiness.com"]')).not.toBeNull();
  expect(container.querySelectorAll("[data-offer]")).toHaveLength(2);
  for (const old of ["Aki Enterprise", "AkiHQ Standard", "AkiHQ Pro"]) {
    expect(screen.queryByRole("heading", { name: old })).toBeNull();
  }
  expect(container.querySelector("form[action*=checkout]")).toBeNull();
});
