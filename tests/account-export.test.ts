import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AuthSessionMissingError,
  createClient,
  type User,
} from "@supabase/supabase-js";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import {
  accountExportTables,
  currentAccountExportTables,
  exportableAuthentication,
} from "../src/lib/account-export";

const mocks = vi.hoisted(() => ({ serverClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.serverClient,
}));
vi.mock(
  "@/lib/account-export",
  async () => import("../src/lib/account-export"),
);
import { GET } from "../src/app/[locale]/account/export/route";

const owner = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const preference = "00000000-0000-4000-8000-000000000003";
type Row = Record<string, unknown>;
type ReadRequest = {
  table: string;
  filters: [string, string][];
  order: string[];
  offset: number;
  limit: number;
  exactCount: boolean;
};

// The actual installed Supabase REST client builds and parses these requests.
// This in-memory adapter never forwards traffic or authenticates a real account.
function fixture(
  options: {
    rows?: Record<string, Row[]>;
    cap?: number;
    signedIn?: boolean;
    fail?: { table: string; offset?: number; throw?: boolean };
    count?: (request: ReadRequest, total: number) => number | null;
    bookingEmails?: Row[];
    bookingError?: boolean;
  } = {},
) {
  const requests: ReadRequest[] = [];
  const allowed = new Set<string>([
    ...currentAccountExportTables().map(([table]) => table),
    "user_preference_signals",
    "recommendation_requests",
    "experiment_assignments",
    "recommendation_items",
  ]);
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input
          : input.url,
    );
    const table = url.pathname.split("/").at(-1)!;
    if (table === "my_booking_email_export") {
      return Response.json(
        options.bookingError
          ? { message: "Permission denied" }
          : options.bookingEmails || [],
        { status: options.bookingError ? 403 : 200 },
      );
    }
    if (!allowed.has(table) || (init?.method || "GET") !== "GET") {
      return Response.json(
        { message: "Unsupported fixture request" },
        { status: 405 },
      );
    }
    const filters = [...url.searchParams].filter(
      ([key]) => !["select", "order", "offset", "limit"].includes(key),
    );
    const request: ReadRequest = {
      table,
      filters,
      order: (url.searchParams.get("order") || "").split(",").filter(Boolean),
      offset: Number(url.searchParams.get("offset") || 0),
      limit: Number(url.searchParams.get("limit")),
      exactCount:
        new Headers(init?.headers).get("Prefer")?.includes("count=exact") ||
        false,
    };
    requests.push(request);
    if (
      options.fail?.table === table &&
      (options.fail.offset === undefined ||
        options.fail.offset === request.offset)
    ) {
      if (options.fail.throw) throw new Error("Fixture transport failure");
      return Response.json(
        { code: "42501", message: "Permission denied" },
        { status: 403 },
      );
    }
    let rows = [...(options.rows?.[table] || [])];
    for (const [column, filter] of filters) {
      if (filter.startsWith("eq."))
        rows = rows.filter((row) => row[column] === filter.slice(3));
      else if (filter.startsWith("in.(")) {
        const ids = filter.slice(4, -1).split(",");
        rows = rows.filter((row) => ids.includes(String(row[column])));
      } else throw new Error("Unexpected fixture filter");
    }
    rows.sort((left, right) => {
      for (const item of request.order) {
        const [column, direction] = item.split(".");
        if (direction !== "asc") throw new Error("Unexpected export order");
        const delta = String(left[column] || "").localeCompare(
          String(right[column] || ""),
        );
        if (delta) return delta;
      }
      return 0;
    });
    const count = options.count
      ? options.count(request, rows.length)
      : rows.length;
    const page = rows.slice(
      request.offset,
      request.offset + Math.min(request.limit, options.cap ?? 1_000),
    );
    return Response.json(page, {
      headers:
        count === null
          ? {}
          : {
              "Content-Range": `${request.offset}-${request.offset + page.length - 1}/${count}`,
            },
    });
  });
  const client = createClient(
    "http://127.0.0.1:43123",
    "synthetic-fixture-key",
    {
      global: { fetch },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
  const user: User = {
    id: owner,
    email: "qa@example.invalid",
    created_at: "2026-10-14T00:00:00Z",
    aud: "authenticated",
    app_metadata: {},
    user_metadata: { preferred_locale: "en" },
    identities: [],
  };
  vi.spyOn(client.auth, "getUser").mockResolvedValue(
    options.signedIn === false
      ? { data: { user: null }, error: new AuthSessionMissingError() }
      : { data: { user }, error: null },
  );
  mocks.serverClient.mockResolvedValue(client);
  return { requests, fetch };
}

describe("account data export contract", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("exports new payer billing only after its schema is ready", () => {
    vi.stubEnv("AKISUITE_SUBSCRIPTIONS_READY", "false");
    expect(
      currentAccountExportTables().some(
        ([table]) => table === "akisuite_billing_subscriptions",
      ),
    ).toBe(false);
    vi.stubEnv("AKISUITE_SUBSCRIPTIONS_READY", "true");
    expect(currentAccountExportTables()).toContainEqual([
      "akisuite_billing_subscriptions",
      "profile_id",
    ]);
  });
  it("covers consumer, business, community, analytics and privacy records", () => {
    const tables = new Set<string>(accountExportTables.map(([table]) => table));
    for (const required of [
      "profiles",
      "pals_preview_access",
      "pals_states",
      "pals_entitlements",
      "claim_decision_emails",
      "saved_events",
      "recent_event_views",
      "check_ins",
      "xp_ledger",
      "passport_progress",
      "event_submissions",
      "reports",
      "business_applications",
      "billing_customers",
      "billing_subscriptions",
      "staff_billing_grants",
      "venue_members",
      "venue_media",
      "promotion_requests",
      "analytics_events",
      "advertising_profiles",
      "account_deletion_requests",
    ]) {
      expect(tables.has(required), required).toBe(true);
    }
  });

  it("does not widen export access to service-only Pals or administrator AI data", () => {
    const tables = accountExportTables.map(([table]) => table);
    expect(tables).not.toContain("pals_commands");
    expect(tables).not.toContain("pals_analytics_events");
    expect(tables).not.toContain("ai_chat_messages");
  });

  it("exports provider names without authentication secrets", () => {
    expect(
      exportableAuthentication({
        created_at: "2026-07-23T00:00:00Z",
        identities: [
          { provider: "email" },
          { provider: "google" },
          { provider: "google" },
        ],
        user_metadata: { preferred_locale: "en" },
      }),
    ).toEqual({
      created_at: "2026-07-23T00:00:00Z",
      last_sign_in_at: null,
      providers: ["email", "google"],
      profile_metadata: { preferred_locale: "en" },
    });
  });
});

describe("authenticated account export GET", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    mocks.serverClient.mockReset();
  });

  it("requires an authenticated caller before any REST reads", async () => {
    const source = fixture({ signedIn: false });
    const response = await GET();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required" });
    expect(source.fetch).not.toHaveBeenCalled();
  });

  it("keeps the JSON envelope, attachment filename and private empty export", async () => {
    fixture();
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="akipasa-account-export.json"',
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    const body = await response.json();
    expect(Object.keys(body)).toEqual([
      "exported_at",
      "account_id",
      "email",
      "authentication",
      "data",
    ]);
    expect(body.account_id).toBe(owner);
    expect(Number.isNaN(Date.parse(body.exported_at))).toBe(false);
    expect(body.authentication.profile_metadata).toEqual({
      preferred_locale: "en",
    });
    for (const [table] of currentAccountExportTables())
      expect(body.data[table], table).toEqual([]);
    expect(body.data.recommendation_items).toEqual([]);
    expect(body.data.booking_confirmation_emails).toEqual([]);
  });

  it("filters every direct dataset to the caller, including all three Pals tables", async () => {
    const rows = Object.fromEntries(
      currentAccountExportTables().map(([table, column]) => [
        table,
        [
          { id: `${table}-own`, [column]: owner },
          { id: `${table}-other`, [column]: other },
        ],
      ]),
    );
    const source = fixture({ rows });
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    for (const [table, column] of currentAccountExportTables()) {
      expect(body.data[table]).toEqual([rows[table][0]]);
      expect(
        source.requests.find((request) => request.table === table)?.filters,
      ).toEqual([[column, `eq.${owner}`]]);
    }
    expect(source.requests.every((request) => request.exactCount)).toBe(true);
  });

  it("reads all rows beyond the REST cap in deterministic composite-key order", async () => {
    const rows = Array.from({ length: 2_105 }, (_, index) => ({
      profile_id: owner,
      event_key: `event-${String(index).padStart(4, "0")}`,
      viewed_at: "2026-10-14T00:00:00Z",
    })).reverse();
    const source = fixture({ rows: { recent_event_view_refs: rows } });
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.recent_event_view_refs).toEqual([...rows].reverse());
    expect(
      source.requests
        .filter((request) => request.table === "recent_event_view_refs")
        .map((request) => ({ offset: request.offset, order: request.order })),
    ).toEqual(
      [0, 1_000, 2_000].map((offset) => ({
        offset,
        order: ["profile_id.asc", "event_key.asc"],
      })),
    );
  });

  it("uses exact counts and actual returned rows when the configured cap is smaller", async () => {
    const rows = Array.from({ length: 21 }, (_, index) => ({
      id: String(index),
      profile_id: owner,
    }));
    const source = fixture({ cap: 7, rows: { xp_ledger: rows } });
    const response = await GET();
    expect(response.status).toBe(200);
    expect((await response.json()).data.xp_ledger).toHaveLength(21);
    expect(
      source.requests
        .filter((request) => request.table === "xp_ledger")
        .map((request) => request.offset),
    ).toEqual([0, 7, 14]);
  });

  it("pages owned recommendation requests and bounds item filters without leaking other accounts", async () => {
    const requests = Array.from({ length: 1_005 }, (_, index) => ({
      id: `request-${String(index).padStart(4, "0")}`,
      preference_profile_id: preference,
    }));
    const items = requests.map((row) => ({
      recommendation_request_id: row.id,
      event_id: `event-${row.id}`,
      occurrence_id: "occurrence",
    }));
    const source = fixture({
      rows: {
        preference_profiles: [
          { id: preference, profile_id: owner },
          { id: "other-preference", profile_id: other },
        ],
        recommendation_requests: [
          ...requests,
          { id: "other-request", preference_profile_id: "other-preference" },
        ],
        recommendation_items: [
          ...items,
          { recommendation_request_id: "other-request", event_id: "private" },
        ],
        user_preference_signals: [
          {
            preference_profile_id: preference,
            dimension: "category",
            key: "arts",
          },
          {
            preference_profile_id: "other-preference",
            dimension: "category",
            key: "other",
          },
        ],
        experiment_assignments: [
          { preference_profile_id: preference, experiment_key: "test" },
        ],
      },
    });
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.recommendation_requests).toEqual(requests);
    expect(body.data.recommendation_items).toEqual(items);
    expect(body.data.user_preference_signals).toHaveLength(1);
    const batches = source.requests.filter(
      (request) => request.table === "recommendation_items",
    );
    expect(batches).toHaveLength(11);
    expect(
      batches.every(
        (request) =>
          request.filters[0][1].slice(4, -1).split(",").length <= 100,
      ),
    ).toBe(true);
    expect(
      batches.every(
        (request) =>
          request.order.join(",") ===
          "recommendation_request_id.asc,event_id.asc,occurrence_id.asc",
      ),
    ).toBe(true);
  });

  it("pages recommendation items within each bounded batch", async () => {
    const items = Array.from({ length: 1_003 }, (_, index) => ({
      recommendation_request_id: "owned-request",
      event_id: `event-${String(index).padStart(4, "0")}`,
      occurrence_id: "occurrence",
    }));
    const source = fixture({
      rows: {
        preference_profiles: [{ id: preference, profile_id: owner }],
        recommendation_requests: [
          { id: "owned-request", preference_profile_id: preference },
        ],
        recommendation_items: items,
      },
    });
    const response = await GET();
    expect(response.status).toBe(200);
    expect((await response.json()).data.recommendation_items).toEqual(items);
    expect(
      source.requests
        .filter((request) => request.table === "recommendation_items")
        .map((request) => request.offset),
    ).toEqual([0, 1_000]);
  });

  it.each([
    { table: "pals_states" },
    { table: "suite_email_preferences" },
    { table: "claim_submission_alerts" },
    { table: "xp_ledger", offset: 1_000 },
    { table: "xp_ledger", offset: 1_000, throw: true },
  ])(
    "returns a private retry error instead of a partial attachment on $table failure",
    async (fail) => {
      fixture({
        fail,
        rows: {
          xp_ledger: Array.from({ length: 1_005 }, (_, index) => ({
            id: String(index),
            profile_id: owner,
          })),
        },
      });
      const response = await GET();
      expect(response.status).toBe(503);
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect(response.headers.get("Content-Disposition")).toBeNull();
      expect(await response.json()).toEqual({
        error: "A complete export could not be generated. Try again later.",
        unavailable_tables: [fail.table],
      });
    },
  );

  it.each(["missing-count", "changed-count", "empty-cap"])(
    "rejects unprovable completeness: %s",
    async (kind) => {
      fixture({
        cap: kind === "empty-cap" ? 0 : 7,
        rows: {
          xp_ledger: Array.from({ length: 21 }, (_, index) => ({
            id: String(index),
            profile_id: owner,
          })),
        },
        count: (request, total) =>
          kind === "missing-count" && request.table === "xp_ledger"
            ? null
            : kind === "changed-count" &&
                request.table === "xp_ledger" &&
                request.offset
              ? total - 1
              : total,
      });
      const response = await GET();
      expect(response.status).toBe(503);
      expect((await response.json()).unavailable_tables).toContain("xp_ledger");
    },
  );

  it("bounds total REST page reads and rejects an export exceeding the budget", async () => {
    const source = fixture({
      cap: 1,
      rows: {
        xp_ledger: Array.from({ length: 100 }, (_, index) => ({
          id: String(index),
          profile_id: owner,
        })),
      },
    });
    const response = await GET();
    expect(response.status).toBe(503);
    expect((await response.json()).unavailable_tables).toContain("xp_ledger");
    expect(source.requests).toHaveLength(80);
  });

  it("keeps booking snapshot RPC errors fail closed", async () => {
    fixture({ bookingError: true });
    const response = await GET();
    expect(response.status).toBe(503);
    expect((await response.json()).unavailable_tables).toEqual([
      "booking_confirmation_emails",
    ]);
  });

  it("does not attach partial recommendation rows when a derived read is denied", async () => {
    fixture({
      fail: { table: "recommendation_items" },
      rows: {
        preference_profiles: [{ id: preference, profile_id: owner }],
        recommendation_requests: [
          { id: "owned-request", preference_profile_id: preference },
        ],
      },
    });
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get("Content-Disposition")).toBeNull();
    expect((await response.json()).unavailable_tables).toEqual([
      "recommendation_items",
    ]);
  });

  it.each(["false", "true"])(
    "keeps new billing reads gated by schema readiness=%s",
    async (ready) => {
      vi.stubEnv("AKISUITE_SUBSCRIPTIONS_READY", ready);
      const source = fixture({
        rows: {
          akisuite_billing_subscriptions: [
            { profile_id: owner, stripe_subscription_id: "sub_fixture" },
          ],
        },
      });
      const response = await GET();
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(
        source.requests.some(
          (request) => request.table === "akisuite_billing_subscriptions",
        ),
      ).toBe(ready === "true");
      if (ready === "true")
        expect(body.data.akisuite_billing_subscriptions).toEqual([
          { profile_id: owner, stripe_subscription_id: "sub_fixture" },
        ]);
      else
        expect(body.data).not.toHaveProperty("akisuite_billing_subscriptions");
    },
  );
});

it("the existing Pals migrations permit only the caller's three added datasets", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key);
      create table public.venues(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to anon,authenticated,service_role;
      insert into auth.users values('${owner}'),('${other}');
    `);
    for (const migration of [
      "20261003213755_akipals_restricted_preview.sql",
      "20261005123000_akipals_product_foundations.sql",
    ]) {
      await db.exec(
        readFileSync(
          new URL(`../database/migrations/${migration}`, import.meta.url),
          "utf8",
        ),
      );
    }
    await db.exec(`
      insert into public.pals_preview_access(user_id) select id from auth.users;
      insert into public.pals_states(user_id,state) select id,'{"schema":1}'::jsonb from auth.users;
      insert into public.pals_collections(id,title) values('fixture-collection','Fixture');
      insert into public.pals_items(id,name,collection_id,slot,rarity,render,source_type)
        values('fixture-item','Fixture','fixture-collection','head','common','{}','starter');
      insert into public.pals_entitlements(user_id,entitlement_key,item_id,obtained_via,source_type)
        select id,'fixture','fixture-item','starter','starter' from auth.users;
      begin; set local role authenticated;
      set local request.jwt.claim.sub='${owner}';
    `);
    try {
      for (const table of [
        "pals_preview_access",
        "pals_states",
        "pals_entitlements",
      ]) {
        expect(
          (await db.query(`select user_id from public.${table}`)).rows,
        ).toEqual([{ user_id: owner }]);
        expect(
          (
            await db.query(
              `select user_id from public.${table} where user_id=$1`,
              [other],
            )
          ).rows,
        ).toEqual([]);
      }
    } finally {
      await db.exec("rollback");
    }
    for (const [role, tables] of [
      ["anon", ["pals_preview_access", "pals_states", "pals_entitlements"]],
      ["authenticated", ["pals_commands", "pals_analytics_events"]],
    ] as const) {
      for (const table of tables) {
        await db.exec(`begin; set local role ${role};`);
        try {
          await expect(
            db.query(`select * from public.${table}`),
          ).rejects.toThrow(/permission denied/);
        } finally {
          await db.exec("rollback");
        }
      }
    }
  } finally {
    await db.close();
  }
}, 20_000);
