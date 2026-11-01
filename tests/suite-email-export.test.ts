import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { readSuiteEmailExport } from "../src/lib/suite-email-export";
const id = (n: number) =>
  `96000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const item = (n: number) => ({
  id: id(n),
  kind: "welcome_akipasa",
  recipient: "owner@example.invalid",
  locale: "en",
  status: "blocked",
  created_at: "2026-11-01T10:00:00+00:00",
  available_at: "2026-11-01T10:00:00+00:00",
  first_attempt_at: null,
  attempted_at: null,
  sent_at: null,
  attempts: 0,
  delivery_uncertain: false,
  payload: { product: "AkiPasa", displayName: "Own name" },
  projection_version: "personal-mail-v1",
  payload_excluded_field_count: 0,
});
const done = (items: unknown[] = []) => ({
  items,
  nextCursor: null,
  truncated: false,
});
function client(
  run: (input: { p_after: string | null; p_limit: number }) => unknown,
) {
  const rpc = vi.fn(
    async (
      name: string,
      input: { p_after: string | null; p_limit: number },
    ) => {
      expect(name).toBe("my_suite_email_export_page");
      return { data: await run(input), error: null };
    },
  );
  const from = vi.fn(() => {
    throw Error("Raw private table read forbidden");
  });
  return { rpc, from, db: { rpc, from } as unknown as SupabaseClient };
}
describe("caller-only transactional email portability", () => {
  it("exports empty retained mail without direct table or role escalation", async () => {
    const c = client(() => done());
    expect(await readSuiteEmailExport(c.db)).toEqual({
      table: "suite_email_outbox",
      data: [],
      failed: false,
    });
    expect(c.rpc).toHaveBeenCalledWith("my_suite_email_export_page", {
      p_after: null,
      p_limit: 100,
    });
    expect(c.from).not.toHaveBeenCalled();
  });
  it("uses stable UUID keyset and retains all statuses and personal scalar values", async () => {
    const c = client(({ p_after }) =>
      p_after === null
        ? {
            items: Array.from({ length: 100 }, (_, i) => item(i + 1)),
            nextCursor: id(100),
            truncated: true,
          }
        : done([{ ...item(101), status: "cancelled" }]),
    );
    const result = await readSuiteEmailExport(c.db);
    expect(result.failed).toBe(false);
    expect(result.data).toHaveLength(101);
    expect(c.rpc.mock.calls[1][1].p_after).toBe(id(100));
  });
  it.each([
    () => null,
    () => ({ items: [], nextCursor: null, truncated: true }),
    () => ({ items: [item(1)], nextCursor: id(1), truncated: false }),
    () => done([item(2), item(1)]),
    () => done([item(1), item(1)]),
    () => done([{ ...item(1), provider_message_id: "private-provider-id" }]),
    () =>
      done([
        {
          ...item(1),
          payload: { resetUrl: "https://private.invalid/capability" },
        },
      ]),
    () =>
      done([{ ...item(1), payload: { displayName: { secret: "nested" } } }]),
    () => done([{ ...item(1), kind: "unreviewed_future_kind" }]),
  ])("fails closed on malformed/unordered/private projection", async (run) => {
    const c = client(run);
    expect(await readSuiteEmailExport(c.db)).toEqual({
      table: "suite_email_outbox",
      data: [],
      failed: true,
    });
  });
  it("never returns earlier personal pages after transport or cursor failure", async () => {
    const c = client(({ p_after }) => {
      if (p_after) throw Error("network");
      return {
        items: Array.from({ length: 100 }, (_, i) => item(i + 1)),
        nextCursor: id(100),
        truncated: true,
      };
    });
    expect(await readSuiteEmailExport(c.db)).toEqual({
      table: "suite_email_outbox",
      data: [],
      failed: true,
    });
  });
  it("rejects backwards page boundaries", async () => {
    const c = client(({ p_after }) =>
      p_after
        ? done([item(99)])
        : {
            items: Array.from({ length: 100 }, (_, i) => item(i + 1)),
            nextCursor: id(100),
            truncated: true,
          },
    );
    expect((await readSuiteEmailExport(c.db)).failed).toBe(true);
  });
  it("fails closed on the100-page/10,000-row budget", async () => {
    const c = client(({ p_after }) => {
      const start = p_after ? Number(p_after.slice(-12)) : 0;
      return {
        items: Array.from({ length: 100 }, (_, i) => item(start + i + 1)),
        nextCursor: id(start + 100),
        truncated: true,
      };
    });
    const result = await readSuiteEmailExport(c.db);
    expect(result.failed).toBe(true);
    expect(result.data).toEqual([]);
    expect(c.rpc).toHaveBeenCalledTimes(100);
  });
  it("preserves full own rental notes but refuses third-party contacts in operator copies", async () => {
    const own = {
      ...item(1),
      kind: "rental_booking_update",
      payload: {
        audience: "customer",
        customerEmail: "own@example.invalid",
        note: "Own long note ".repeat(100),
      },
    };
    expect(
      (await readSuiteEmailExport(client(() => done([own])).db)).data[0]
        .payload,
    ).toEqual(own.payload);
    const other = { ...own, payload: { ...own.payload, audience: "operator" } };
    expect(
      (await readSuiteEmailExport(client(() => done([other])).db)).failed,
    ).toBe(true);
  });
  it("fails honestly when the required RPC is missing", async () => {
    const db = {
      rpc: vi.fn(async () => ({ data: null, error: { code: "PGRST202" } })),
    } as unknown as SupabaseClient;
    expect((await readSuiteEmailExport(db)).failed).toBe(true);
  });
});
