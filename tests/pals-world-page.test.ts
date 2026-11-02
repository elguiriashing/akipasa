import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  user: true,
  allowed: true,
  redirect: vi.fn(),
  missing: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    state.redirect(href);
    throw new Error("redirect");
  },
  notFound: () => {
    state.missing();
    throw new Error("not-found");
  },
}));
vi.mock("@/lib/config", () => ({ config: { mapStyleUrl: "/style.json" } }));
vi.mock("@/lib/pals/server", () => ({
  previewAccess: async () => ({
    user: state.user ? { id: "owner" } : null,
    allowed: state.allowed,
  }),
}));
vi.mock("@/components/pals/WorldExplorer", () => ({
  WorldExplorer: () => null,
}));
import WorldPage from "../src/app/pals/world/page";
beforeEach(() => {
  vi.clearAllMocks();
  state.user = true;
  state.allowed = true;
});
it("preserves the exact existing English authentication return", async () => {
  state.user = false;
  await expect(WorldPage({})).rejects.toThrow("redirect");
  expect(state.redirect).toHaveBeenCalledWith("/en/auth?next=%2Fpals%2Fworld");
});
it("retains selected Spanish through authentication and private rendering", async () => {
  state.user = false;
  await expect(
    WorldPage({ searchParams: Promise.resolve({ lang: "es" }) }),
  ).rejects.toThrow("redirect");
  expect(state.redirect).toHaveBeenCalledWith(
    "/es/auth?next=%2Fpals%2Fworld%3Flang%3Des",
  );
  state.user = true;
  const page = await WorldPage({
    searchParams: Promise.resolve({ lang: "es" }),
  });
  expect(page.props.locale).toBe("es");
});
it("keeps unauthorized accounts concealed and unsupported languages English", async () => {
  state.allowed = false;
  await expect(
    WorldPage({ searchParams: Promise.resolve({ lang: "es" }) }),
  ).rejects.toThrow("not-found");
  state.allowed = true;
  const page = await WorldPage({
    searchParams: Promise.resolve({ lang: "bad" }),
  });
  expect(page.props.locale).toBe("en");
});
