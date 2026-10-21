import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, it, expect, vi } from "vitest";
import { currentAccountExportTables } from "../src/lib/account-export";
import {
  privateIdentityExportSections,
  privateIdentityExportsReady,
  readPrivateIdentityExports,
} from "../src/lib/identity-private-export";
afterEach(() => vi.unstubAllEnvs());
const key = (n: number) => String(n).padStart(20, "0");
function client(reply: (section: string, after: string | null) => unknown) {
  const rpc = vi.fn(
    async (
      _name: string,
      args: { p_section: string; p_after: string | null },
    ) => ({ data: reply(args.p_section, args.p_after), error: null }),
  );
  return { rpc, db: { rpc } as unknown as SupabaseClient };
}
const empty = (section: string) => ({
  section,
  total: 0,
  rows: [],
  next_cursor: null,
});
it("collects all1201caller rows across deterministic pages without sending an identity parameter", async () => {
  const { rpc, db } = client((section, after) => {
    if (section !== "suite_referral_audit") return empty(section);
    const offset = after ? Number(after) : 0;
    const end = Math.min(offset + 500, 1201);
    return {
      section,
      total: 1201,
      rows: Array.from({ length: end - offset }, (_, i) => ({
        key: key(offset + i + 1),
        data: { id: offset + i + 1, actor_is_you: true },
      })),
      next_cursor: end < 1201 ? key(end) : null,
    };
  });
  const result = await readPrivateIdentityExports(db);
  expect(result.every((x) => !x.failed)).toBe(true);
  expect(
    result.find((x) => x.table === "suite_referral_audit")?.data,
  ).toHaveLength(1201);
  expect(rpc).toHaveBeenCalledTimes(14);
  for (const call of rpc.mock.calls) {
    expect(call[0]).toBe("suite_private_identity_export_page");
    expect(Object.keys(call[1]).sort()).toEqual([
      "p_after",
      "p_limit",
      "p_section",
    ]);
  }
});
it("keeps privacy readiness separate from all acquisition/gameplay/cohort gates and avoids raw exports after upgrade", () => {
  vi.stubEnv("AKISUITE_REFERRALS_READY", "true");
  vi.stubEnv("AKIPASA_PRESTIGE_ENABLED", "false");
  vi.stubEnv("AKISUITE_PRIVATE_IDENTITY_EXPORTS_READY", "true");
  expect(privateIdentityExportsReady()).toBe(true);
  expect(
    currentAccountExportTables().some(([name]) =>
      name.startsWith("suite_referral_"),
    ),
  ).toBe(false);
  vi.stubEnv("AKISUITE_PRIVATE_IDENTITY_EXPORTS_READY", "false");
  expect(currentAccountExportTables()).toContainEqual([
    "suite_referral_representatives",
    "profile_id",
  ]);
});
it.each([
  "count-change",
  "missing-row",
  "duplicate-key",
  "out-of-order",
  "wrong-section",
  "bad-cursor",
  "over-limit",
])("fails closed for %s without successful partial history", async (kind) => {
  const { db } = client((section, after) => {
    if (section !== "suite_referral_audit") return empty(section);
    if (kind === "over-limit")
      return { section, total: 10001, rows: [], next_cursor: null };
    if (kind === "missing-row")
      return {
        section,
        total: 2,
        rows: [{ key: key(1), data: { id: 1 } }],
        next_cursor: null,
      };
    if (kind === "wrong-section") return empty("suite_referral_codes");
    if (kind === "bad-cursor")
      return {
        section,
        total: 501,
        rows: Array.from({ length: 500 }, (_, i) => ({
          key: key(i + 1),
          data: { id: i },
        })),
        next_cursor: "not-the-last-key",
      };
    if (kind === "duplicate-key" || kind === "out-of-order")
      return {
        section,
        total: 2,
        rows: [
          { key: key(2), data: { id: 2 } },
          { key: key(kind === "duplicate-key" ? 2 : 1), data: { id: 1 } },
        ],
        next_cursor: null,
      };
    return after
      ? { section, total: 500, rows: [], next_cursor: null }
      : {
          section,
          total: 501,
          rows: Array.from({ length: 500 }, (_, i) => ({
            key: key(i + 1),
            data: { id: i },
          })),
          next_cursor: key(500),
        };
  });
  const result = await readPrivateIdentityExports(db);
  expect(result.find((x) => x.table === "suite_referral_audit")).toEqual({
    table: "suite_referral_audit",
    data: [],
    failed: true,
  });
});
it("bounds the whole private-export read budget and never silently truncates", async () => {
  const { rpc, db } = client((section, after) => {
    const offset = after ? Number(after) : 0;
    return {
      section,
      total: 10000,
      rows: Array.from({ length: 500 }, (_, i) => ({
        key: key(offset + i + 1),
        data: { id: offset + i + 1 },
      })),
      next_cursor: offset + 500 < 10000 ? key(offset + 500) : null,
    };
  });
  const result = await readPrivateIdentityExports(db);
  expect(rpc).toHaveBeenCalledTimes(100);
  expect(result.filter((x) => x.failed).length).toBeGreaterThan(0);
  expect(
    result.find((x) => x.table === privateIdentityExportSections[5])?.data,
  ).toEqual([]);
});
it("treats provider/transport failures as unavailable rather than an empty successful export", async () => {
  const db = {
    rpc: vi.fn().mockRejectedValue(new Error("Transport")),
  } as unknown as SupabaseClient;
  const result = await readPrivateIdentityExports(db);
  expect(result.filter((x) => x.failed)).toHaveLength(12);
  expect(
    result.every(
      (x) =>
        x.data.length === 0 || x.table === "private_identity_export_projection",
    ),
  ).toBe(true);
});
