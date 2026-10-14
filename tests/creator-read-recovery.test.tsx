// @vitest-environment jsdom

import React, { type ComponentProps } from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  mode: "directory-error" as
    | "directory-error"
    | "profile-error"
    | "profile-missing"
    | "profile-ready",
  filters: [] as string[],
}));

vi.mock("next/cache", () => ({
  unstable_cache: (callback: unknown) => callback,
}));
vi.mock("next/link", () => ({
  default: (props: ComponentProps<"a">) => <a {...props} />,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not-found");
  },
  usePathname: () => "/en/community/creators",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("../src/app/[locale]/community/creator-actions", () => ({
  submitCreatorReview: vi.fn(),
}));
vi.mock("@/lib/supabase/public", () => ({
  createSupabasePublicClient: () => {
    const result = () => {
      if (fixture.mode === "directory-error")
        return { data: null, error: { message: "Private catalogue failure" } };
      if (fixture.mode === "profile-error")
        return { data: null, error: { message: "Private profile failure" } };
      if (fixture.mode === "profile-missing")
        return { data: null, error: null };
      return {
        error: null,
        data: {
          profile_id: "10000000-0000-4000-8000-000000000001",
          slug: "ana-local",
          display_name: "Ana Local",
          headline_es: "Artista local",
          headline_en: "Local artist",
          bio_es: "Biografía pública de Ana.",
          bio_en: "Ana's public biography.",
          locality: "Málaga",
          province: "Málaga",
          avatar_url: null,
          cover_url: null,
          website_url: null,
          instagram_url: null,
          youtube_url: null,
          verification_state: "unverified",
          updated_at: "2026-10-14T00:00:00.000Z",
          creator_categories: [],
          creator_reviews: [],
          events: [],
        },
      };
    };
    return {
      from: () => {
        const query = {
          select: () => query,
          eq: () => query,
          order: () => query,
          or: (value: string) => {
            fixture.filters.push(value);
            return query;
          },
          ilike: () => query,
          maybeSingle: async () => result(),
          then: (resolve: (value: ReturnType<typeof result>) => unknown) =>
            Promise.resolve(result()).then(resolve),
        };
        return query;
      },
      storage: {
        from: () => ({
          createSignedUrls: async () => ({ data: [], error: null }),
        }),
      },
    };
  },
}));

import { CreatorDirectoryPage } from "../src/components/community/CreatorDirectoryPage";
import { CommunityCreatorPage } from "../src/components/community/CreatorProfilePage";

beforeEach(() => {
  fixture.mode = "directory-error";
  fixture.filters = [];
});
afterEach(cleanup);

it.each(["en", "es"] as const)(
  "keeps a failed %s creator directory distinct from no matches and preserves safe filters",
  async (locale) => {
    render(
      await CreatorDirectoryPage({
        params: Promise.resolve({ locale }),
        searchParams: Promise.resolve({
          q: "  María, 100%_  ",
          locality: " Málaga ",
          category: "local-artists",
        }),
      }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      locale === "es"
        ? "No se pudo cargar el directorio"
        : "creator directory could not be loaded",
    );
    expect(
      screen.queryByText(/No matches yet|No encontramos coincidencias/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Private catalogue failure"),
    ).not.toBeInTheDocument();
    const href = screen
      .getByRole("link", { name: locale === "es" ? "Reintentar" : "Retry" })
      .getAttribute("href")!;
    const retry = new URL(href, "https://example.test");
    expect(retry.pathname).toBe(`/${locale}/community/creators`);
    expect(retry.searchParams.get("q")).toBe("María, 100%_");
    expect(retry.searchParams.get("locality")).toBe("Málaga");
    expect(retry.searchParams.get("category")).toBe("local-artists");
    expect(fixture.filters[0]).toContain('display_name.ilike."%');
  },
);

it.each(["en", "es"] as const)(
  "shows a retryable %s creator-profile outage instead of a missing profile",
  async (locale) => {
    fixture.mode = "profile-error";
    render(
      await CommunityCreatorPage({
        params: Promise.resolve({ locale, slug: "ana-local" }),
      }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      locale === "es" ? "No se pudo cargar" : "could not be loaded",
    );
    expect(
      screen.queryByText("Private profile failure"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: locale === "es" ? "Reintentar" : "Retry",
      }),
    ).toHaveAttribute("href", `/${locale}/community/creators/ana-local`);
  },
);

it("retains a real not-found result when the creator read succeeds", async () => {
  fixture.mode = "profile-missing";
  await expect(
    CommunityCreatorPage({
      params: Promise.resolve({ locale: "en", slug: "missing" }),
    }),
  ).rejects.toThrow("not-found");
});

it.each([
  ["submitted", "status", "Review submitted for moderation."],
  ["unavailable", "alert", "The review could not be submitted."],
] as const)("renders creator review outcome %s", async (review, role, copy) => {
  fixture.mode = "profile-ready";
  render(
    await CommunityCreatorPage({
      params: Promise.resolve({ locale: "en", slug: "ana-local" }),
      searchParams: Promise.resolve({ review }),
    }),
  );

  expect(screen.getByRole(role)).toHaveTextContent(copy);
});
