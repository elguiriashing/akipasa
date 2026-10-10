import { describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactNode } from "react";
const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: () => {
    throw new Error("not-found");
  },
}));
vi.mock("@/lib/feature-flags", () => ({ loadFeatureFlags: async () => ({}) }));
vi.mock("../src/app/[locale]/business/actions", () => ({
  confirmRedemption: vi.fn(),
  createOfficialEvent: vi.fn(),
  createVenue: vi.fn(),
  deleteManagedVenue: vi.fn(),
  requestPromotion: vi.fn(),
  reuseEvent: vi.fn(),
  saveLoyaltyProgram: vi.fn(),
  submitVenueClaim: vi.fn(),
}));
import BusinessPage from "../src/app/[locale]/business/page";
import { BusinessHome } from "../src/components/BusinessHome";
function homeProps(node: ReactNode): Record<string, unknown> | undefined {
  if (Array.isArray(node)) return node.map(homeProps).find(Boolean);
  if (!isValidElement<{ children?: ReactNode }>(node)) return;
  if (node.type === BusinessHome) return node.props;
  return homeProps(node.props.children);
}
describe("team member's real business page loader", () => {
  it.each([
    ["en", "consumer"],
    ["es", "consumer"],
    ["en", "administrator"],
    ["es", "administrator"],
  ])(
    "loads both assigned property types in %s for %s",
    async (locale, appRole) => {
      const members = [
        {
          role: "manager",
          venues: {
            id: "venue",
            name: "Team venue",
            slug: "team-venue",
            status: "published",
            verified: true,
            discovery_vertical: "activities",
          },
        },
        {
          role: "editor",
          venues: {
            id: "stay",
            name: "Team stay",
            slug: "team-stay",
            status: "pending",
            verified: false,
            discovery_vertical: "accommodation",
          },
        },
      ];
      const reads: Array<[string, string, unknown]> = [];
      const supabase = {
        from: (table: string) => {
          const query = {
            select: () => query,
            eq: (field: string, value: unknown) => {
              reads.push([table, field, value]);
              return query;
            },
            in: () => query,
            order: () => query,
            limit: () => query,
            maybeSingle: async () => ({
              data:
                table === "profiles"
                  ? { app_role: appRole }
                  : table === "venue_members"
                    ? { venue_id: "stay" }
                    : null,
              error: null,
            }),
            then: (resolve: (value: unknown) => unknown) =>
              Promise.resolve({
                data: table === "venue_members" ? members : [],
                error: null,
              }).then(resolve),
          };
          return query;
        },
      };
      mocks.requireUser.mockResolvedValue({
        supabase,
        user: { id: "team-user" },
      });
      mocks.redirect.mockImplementation((path: string) => {
        throw new Error(`redirect:${path}`);
      });
      const result = await BusinessPage({
        params: Promise.resolve({ locale }),
        searchParams: Promise.resolve({}),
      });
      expect(homeProps(result)?.places).toEqual([
        {
          id: "venue",
          name: "Team venue",
          slug: "team-venue",
          status: "published",
          role: "manager",
          product: "venue",
        },
        {
          id: "stay",
          name: "Team stay",
          slug: "team-stay",
          status: "pending",
          role: "editor",
          product: "stay",
        },
      ]);
      expect(reads).toContainEqual([
        "venue_members",
        "profile_id",
        "team-user",
      ]);
      expect(mocks.redirect).not.toHaveBeenCalled();
    },
  );
});
