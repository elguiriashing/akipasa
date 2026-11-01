// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({ requireUser: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUser: auth.requireUser }));
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
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/components/community/CityStories", () => ({
  CityStories: ({ leadingContent }: { leadingContent: React.ReactNode }) => (
    <section aria-label="Enabled city stories">{leadingContent}</section>
  ),
}));
vi.mock("@/components/community/CheckinStories", () => ({
  CheckinStories: ({
    publishingEnabled = true,
  }: {
    publishingEnabled?: boolean;
  }) => (
    <button>
      {publishingEnabled ? "Publish photo fixture" : "Manage own photo fixture"}
    </button>
  ),
}));
vi.mock("@/components/SpainAddressAutocomplete", () => ({
  SpainAddressAutocomplete: () => null,
}));
vi.mock("@/components/community/ContributionDraftForm", () => ({
  ContributionDraftForm: () => null,
}));
vi.mock("@/components/community/CreatorDirectoryPage", () => ({
  communityCreatorItems: () => [],
}));
vi.mock("@/app/[locale]/community/actions", () => ({
  submitCommunityEvent: vi.fn(),
  submitReport: vi.fn(),
}));
import CommunityPage from "../src/app/[locale]/community/page";
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
for (const locale of ["en", "es"] as const)
  for (const schemaReady of [false, true])
    for (const enabled of [false, true]) {
      it(`${locale} rollout schema=${schemaReady}/UI=${enabled} exposes only ready features and retains withdrawal`, async () => {
        vi.stubEnv(
          "AKIPASA_COMMUNITY_STORIES_SCHEMA_READY",
          String(schemaReady),
        );
        vi.stubEnv("AKIPASA_COMMUNITY_STORIES_ENABLED", String(enabled));
        auth.requireUser.mockImplementation(() => {
          throw Error("Public page must not request private identity");
        });
        render(
          await CommunityPage({
            params: Promise.resolve({ locale }),
            searchParams: Promise.resolve({
              schemaReady: "true",
              storiesEnabled: "true",
            }),
          }),
        );
        expect(auth.requireUser).not.toHaveBeenCalled();
        const show = schemaReady && enabled;
        if (show) {
          expect(
            screen.getByRole("region", { name: "Enabled city stories" }),
          ).toBeVisible();
          expect(
            screen.getByRole("button", { name: "Publish photo fixture" }),
          ).toBeVisible();
          expect(
            screen.queryByRole("button", { name: "Manage own photo fixture" }),
          ).not.toBeInTheDocument();
        } else {
          expect(
            screen.queryByRole("region", { name: "Enabled city stories" }),
          ).not.toBeInTheDocument();
          expect(
            screen.queryByRole("button", { name: "Publish photo fixture" }),
          ).not.toBeInTheDocument();
          if (schemaReady)
            expect(
              screen.getByRole("button", { name: "Manage own photo fixture" }),
            ).toBeVisible();
          else
            expect(
              screen.queryByRole("button", {
                name: "Manage own photo fixture",
              }),
            ).not.toBeInTheDocument();
        }
        expect(
          screen.getByRole("link", {
            name: locale === "es" ? "Proponer un plan" : "Suggest a plan",
          }),
        ).toHaveAttribute("href", `/${locale}/community?view=suggest`);
        expect(
          screen.getByRole("link", {
            name: locale === "es" ? "Cerca de ti" : "Nearby",
          }),
        ).toHaveAttribute("href", show ? "#city-stories" : `/${locale}/map`);
      });
    }
