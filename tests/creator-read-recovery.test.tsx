// @vitest-environment jsdom

import React, { type ComponentProps } from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  mode: "directory-error" as
    | "directory-error"
    | "directory-ready"
    | "directory-empty"
    | "profile-error"
    | "profile-missing"
    | "profile-ready",
  filters: [] as string[],
  studioFailure: "" as string,
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
  saveCreatorProfile: vi.fn(),
  requestCreatorVerification: vi.fn(),
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
      if (fixture.mode === "directory-empty") return { error: null, data: [] };
      const creator = {
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
      };
      return {
        error: null,
        data:
          fixture.mode === "directory-ready"
            ? [
                {
                  ...creator,
                  creator_categories: [
                    {
                      categories: {
                        slug: "local-artists",
                        name_en: "Local artists",
                        name_es: "Artistas locales",
                      },
                    },
                  ],
                },
              ]
            : creator,
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

vi.mock("@/lib/auth", () => ({
  requireUser: async () => ({
    user: { id: "10000000-0000-4000-8000-000000000001" },
    supabase: {
      from: (table: string) => {
        const resolve = () => {
          const failed = fixture.studioFailure === table;
          return {
            error: failed ? { message: "Private read failure" } : null,
            data: failed
              ? null
              : table === "creator_profiles"
                ? {
                    slug: "ana-local",
                    display_name: "Ana Local",
                    state: "published",
                    verification_state: "unverified",
                    bio_es:
                      "Una biografía suficientemente larga para las pruebas del perfil.",
                  }
                : [],
          };
        };
        const query = {
          select: () => query,
          eq: () => query,
          order: () => query,
          maybeSingle: async () => resolve(),
          then: (callback: (result: ReturnType<typeof resolve>) => unknown) =>
            Promise.resolve(resolve()).then(callback),
        };
        return query;
      },
      rpc: async () =>
        fixture.studioFailure === "eligibility"
          ? { data: null, error: { message: "Private eligibility failure" } }
          : {
              data: {
                eligible: true,
                published_events: 4,
                required_events: 3,
                participants: 12,
                required_participants: 10,
              },
              error: null,
            },
    },
  }),
}));
vi.mock("../src/app/[locale]/account/actions", () => ({
  uploadProfileMedia: vi.fn(),
}));

import CreatorStudioPage from "../src/app/[locale]/community/creator/page";
import { CreatorDirectoryPage } from "../src/components/community/CreatorDirectoryPage";
import { CommunityCreatorPage } from "../src/components/community/CreatorProfilePage";

beforeEach(() => {
  fixture.mode = "directory-error";
  fixture.filters = [];
  fixture.studioFailure = "";
  window.sessionStorage.clear();
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

it.each(["invalid", "unavailable", "draft"])(
  "restores the creator-review draft after a %s return",
  async (review) => {
    fixture.mode = "profile-ready";
    sessionStorage.setItem(
      "akipasa:creator-review:10000000-0000-4000-8000-000000000001",
      JSON.stringify({
        rating: "3",
        body: "The useful review text from the failed submission.",
      }),
    );
    render(
      await CommunityCreatorPage({
        params: Promise.resolve({ locale: "en", slug: "ana-local" }),
        searchParams: Promise.resolve({ review }),
      }),
    );

    expect(await screen.findByText(/restored the details/i)).toBeVisible();
    expect(screen.getByLabelText("Rating")).toHaveValue("3");
    expect(screen.getByLabelText("Your experience")).toHaveValue(
      "The useful review text from the failed submission.",
    );
  },
);

it("remembers a creator review before invoking its server action", async () => {
  fixture.mode = "profile-ready";
  render(
    await CommunityCreatorPage({
      params: Promise.resolve({ locale: "en", slug: "ana-local" }),
    }),
  );
  fireEvent.change(screen.getByLabelText("Rating"), {
    target: { value: "4" },
  });
  fireEvent.change(screen.getByLabelText("Your experience"), {
    target: { value: "A detailed review that must survive a failed request." },
  });
  fireEvent.submit(screen.getByLabelText("Your experience").closest("form")!);

  expect(
    JSON.parse(
      sessionStorage.getItem(
        "akipasa:creator-review:10000000-0000-4000-8000-000000000001",
      ) || "{}",
    ),
  ).toMatchObject({
    rating: "4",
    body: "A detailed review that must survive a failed request.",
  });
});

it.each(["en", "es"] as const)(
  "preserves %s search filters when choosing a creator category",
  async (locale) => {
    fixture.mode = "directory-ready";
    const { container } = render(
      await CreatorDirectoryPage({
        params: Promise.resolve({ locale }),
        searchParams: Promise.resolve({
          q: "Ana",
          locality: "Málaga",
          category: "local-artists",
        }),
      }),
    );
    const categories = screen.getByRole("navigation", {
      name: locale === "es" ? "Categorías de creadores" : "Creator categories",
    });
    const all = categories.querySelector("a")!;
    const allUrl = new URL(all.href);
    expect(allUrl.searchParams.get("q")).toBe("Ana");
    expect(allUrl.searchParams.get("locality")).toBe("Málaga");
    expect(allUrl.searchParams.has("category")).toBe(false);
    const active = categories.querySelector('[aria-current="page"]')!;
    expect(
      new URL(
        active.getAttribute("href")!,
        "https://example.test",
      ).searchParams.get("category"),
    ).toBe("local-artists");
    expect(
      container.querySelector('form input[type="hidden"][name="category"]'),
    ).toHaveValue("local-artists");
  },
);

it.each(["creator_profiles", "categories", "creator_categories"])(
  "withholds unsafe studio editors when %s cannot be read",
  async (table) => {
    fixture.studioFailure = table;
    render(
      await CreatorStudioPage({
        params: Promise.resolve({ locale: "en" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your complete profile could not be loaded",
    );
    expect(
      screen.queryByRole("button", { name: "Save profile" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Private read failure")).not.toBeInTheDocument();
  },
);

it.each(["en", "es"] as const)(
  "does not label a failed %s event history as empty",
  async (locale) => {
    fixture.studioFailure = "events";
    render(
      await CreatorStudioPage({
        params: Promise.resolve({ locale }),
        searchParams: Promise.resolve({}),
      }),
    );
    fireEvent.click(
      screen.getByRole("tab", { name: locale === "es" ? "Eventos" : "Events" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      locale === "es"
        ? "No se pudo cargar todo tu historial"
        : "Your complete event history could not be loaded",
    );
    expect(
      screen.queryByText(
        /You have not created an event yet|Aun no has creado ningun evento/,
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: locale === "es" ? "Guardar perfil" : "Save profile",
        hidden: true,
      }),
    ).toBeInTheDocument();
  },
);

it.each(["en", "es"] as const)(
  "withholds %s verification requests while eligibility is unknown",
  async (locale) => {
    fixture.studioFailure = "eligibility";
    render(
      await CreatorStudioPage({
        params: Promise.resolve({ locale }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      locale === "es"
        ? "No se pudo comprobar la verificación"
        : "Verification eligibility could not be checked",
    );
    expect(
      screen.queryByRole("button", {
        name: locale === "es" ? "Enviar solicitud" : "Submit request",
      }),
    ).not.toBeInTheDocument();
  },
);
