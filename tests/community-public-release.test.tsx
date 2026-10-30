// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const access = vi.hoisted(() => ({ requireUser: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUser: access.requireUser }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not-found");
  },
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("next/image", () => ({
  default: (
    props: React.ComponentProps<"img"> & {
      fill?: boolean;
      priority?: boolean;
      sizes?: string;
    },
  ) => {
    const htmlProps = Object.fromEntries(
      Object.entries(props).filter(
        ([key]) => !["fill", "priority"].includes(key),
      ),
    );
    return React.createElement("img", { ...htmlProps, alt: props.alt || "" });
  },
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
  vi.clearAllMocks();
});

for (const locale of ["en", "es"] as const) {
  it(`renders the ${locale} public landing without requesting identity or protected data`, async () => {
    access.requireUser.mockImplementation(() => {
      throw new Error("unexpected protected access");
    });
    render(
      await CommunityPage({
        params: Promise.resolve({ locale }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(access.requireUser).not.toHaveBeenCalled();
    expect(
      screen.getByRole("link", {
        name:
          locale === "es"
            ? "Consulta nuestro plan de lanzamiento"
            : "See our launch roadmap",
      }),
    ).toHaveAttribute("href", `/${locale}/roadmap`);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: locale === "es" ? "Comunidad" : "Community",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", {
        name: locale === "es" ? "Proponer un plan" : "Suggest a plan",
      }),
    ).toHaveAttribute("href", `/${locale}/community?view=suggest`);
    expect(
      screen.getByText(locale === "es" ? "En desarrollo" : "In development", {
        exact: true,
      }),
    ).toBeVisible();
    expect(
      screen.getByText(
        locale === "es"
          ? "Inspiración editorial · ilustración, no un local ni un evento anunciado"
          : "Editorial inspiration · illustration, not an advertised venue or event",
      ),
    ).toBeVisible();
  });
  for (const view of ["suggest", "report", "suggestions", "reports"]) {
    it(`keeps ${locale} ${view} behind the existing identity boundary`, async () => {
      access.requireUser.mockRejectedValue(new Error("identity-required"));
      await expect(
        CommunityPage({
          params: Promise.resolve({ locale }),
          searchParams: Promise.resolve({ view }),
        }),
      ).rejects.toThrow("identity-required");
      expect(access.requireUser).toHaveBeenCalledWith(
        locale,
        `/${locale}/community?view=${view}`,
      );
    });
  }
}

it("retains implicit report intent and encoded target search at the identity boundary", async () => {
  access.requireUser.mockRejectedValue(new Error("identity-required"));
  const target = "event:95000000-0000-4000-8000-000000000009";
  await expect(
    CommunityPage({
      params: Promise.resolve({ locale: "es" }),
      searchParams: Promise.resolve({ target, target_q: "Málaga & tapas" }),
    }),
  ).rejects.toThrow("identity-required");
  const [, destination] = access.requireUser.mock.calls[0];
  const next = new URL(destination, "https://fixture.invalid");
  expect(next.pathname).toBe("/es/community");
  expect(next.searchParams.get("view")).toBe("report");
  expect(next.searchParams.get("target")).toBe(target);
  expect(next.searchParams.get("target_q")).toBe("Málaga & tapas");
});

it("rejects unsupported locales before identity or public rendering", async () => {
  await expect(
    CommunityPage({
      params: Promise.resolve({ locale: "fr" }),
      searchParams: Promise.resolve({}),
    }),
  ).rejects.toThrow("not-found");
  expect(access.requireUser).not.toHaveBeenCalled();
});
