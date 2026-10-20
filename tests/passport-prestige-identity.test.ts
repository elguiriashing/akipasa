// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
const { optionalUser, redirect } = vi.hoisted(() => ({
  optionalUser: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(url);
  }),
}));
vi.mock("@/lib/auth", () => ({ optionalUser }));
vi.mock("next/navigation", () => ({ redirect }));
import { requirePrestigePrivacyIdentity } from "../src/lib/passport-prestige-identity";
afterEach(() => vi.clearAllMocks());
describe("prestige privacy identity", () => {
  it("uses verified optional identity without terms or feature checks", async () => {
    const identity = { supabase: { rpc: vi.fn() }, user: { id: "member" } };
    optionalUser.mockResolvedValue(identity);
    expect(await requirePrestigePrivacyIdentity("en")).toEqual(identity);
    expect(redirect).not.toHaveBeenCalled();
  });
  it("retains only the canonical same-locale privacy destination on sign in", async () => {
    optionalUser.mockResolvedValue({ user: null });
    await expect(requirePrestigePrivacyIdentity("es")).rejects.toThrow(
      "/es/auth?next=%2Fes%2Fprivacy%2Fprestige",
    );
  });
});
