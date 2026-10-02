import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import {
  effectiveVenueRelevance,
  recommendationWeight,
  relevanceDecisionSchema,
} from "../src/lib/venue-relevance";
import { rankRecommendations } from "../src/lib/personalisation/ranking";
import type { DiscoveryResult } from "../src/lib/domain";

const actor = "a0000000-0000-4000-8000-000000000001";
const venueId = "b0000000-0000-4000-8000-000000000001";
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema akiduermo;
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.actor',true),'')::uuid $$;
    create table public.profiles(id uuid primary key,app_role text);
    create table public.venues(id uuid primary key, name text not null,address text,city_id uuid,
      discovery_vertical text default 'activities',accommodation_type text,status text default 'published',location text,verified boolean default false);
    create table public.feature_flags(key text primary key,enabled boolean,label_es text,label_en text);
    create table public.crm_catalogue_venues(workspace_id text,lead_id text,venue_id uuid);
    create table public.crm_company_records(workspace_id text,id text,deleted_at timestamptz,data jsonb);
    create table akiduermo.source_categories(external_id text,category text,accommodation_type text);
    create function public.venue_search_normalize(value text) returns text language sql immutable as $$ select trim(regexp_replace(lower(value),'[^a-z0-9]+',' ','g')) $$;
    insert into public.profiles values('${actor}','administrator');
    grant usage on schema public,auth to anon,authenticated,service_role;
    grant select on public.feature_flags to anon,authenticated,service_role;
    grant all on public.venues to authenticated,service_role;
    grant select on public.profiles to service_role;
  `);
  await db.exec(
    readFileSync("database/migrations/0085_venue_relevance_audit.sql", "utf8"),
  );
  await db.exec(`insert into public.venues(id,name,address,location) values('${venueId}','Burger King','Example address','POINT(0 0)');
    insert into public.crm_company_records values('test','test',null,'{"externalId":"test"}');
    insert into akiduermo.source_categories values('test','fast_food',null);
    insert into public.crm_catalogue_venues values('test','test','${venueId}');`);
}, 30_000);
afterAll(async () => {
  await db?.close();
});

describe("relevance database safety", () => {
  it("classifies future imports without changing their approved discovery behaviour", async () => {
    const result = await db.query<{ action: string }>(
      `select action from catalogue_relevance.proposals where venue_id='${venueId}'`,
    );
    expect(result.rows[0].action).toBe("DOWNRANK");
    expect(
      (
        await db.query<{ recommendation_weight: string }>(
          `select recommendation_weight from public.venues where id='${venueId}'`,
        )
      ).rows[0].recommendation_weight,
    ).toBe("1");
  });
  it("denies anonymous access to evidence and admin RPCs", async () => {
    await db.exec("set role anon");
    try {
      await expect(
        db.query("select * from catalogue_relevance.proposals"),
      ).rejects.toThrow(/permission denied/);
      await expect(
        db.query(`select public.admin_venue_relevance_page('${actor}')`),
      ).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec("reset role");
    }
  });
  it("prevents listing owners from changing ranking metadata", async () => {
    await db.exec("set role authenticated");
    try {
      await expect(
        db.query(
          `update public.venues set recommendation_weight=0.35 where id='${venueId}'`,
        ),
      ).rejects.toThrow(/administrators/);
    } finally {
      await db.exec("reset role");
    }
  });
  it("requires a real administrator and rejects stale approvals", async () => {
    await expect(
      db.query(
        `select public.admin_resolve_venue_relevance('${venueId}','${venueId}','KEEP',1,'stale','Test reviewed decision')`,
      ),
    ).rejects.toThrow(/Administrator required/);
    await expect(
      db.query(
        `select public.admin_resolve_venue_relevance('${actor}','${venueId}','KEEP',1,'stale','Test reviewed decision')`,
      ),
    ).rejects.toThrow(/Venue changed/);
  });
  it("logs an approved manual decision and preserves its venue URL/status", async () => {
    const fingerprint = (
      await db.query<{ fingerprint: string }>(
        `select catalogue_relevance.fingerprint(v) fingerprint from public.venues v where id='${venueId}'`,
      )
    ).rows[0].fingerprint;
    await db.query(
      `select public.admin_resolve_venue_relevance('${actor}','${venueId}','DOWNRANK',0.35,'${fingerprint}','Source and branch identity reviewed')`,
    );
    const v = (
      await db.query<{ discovery_enabled: boolean; status: string }>(
        `select discovery_enabled,status from public.venues where id='${venueId}'`,
      )
    ).rows[0];
    expect(v).toEqual({ discovery_enabled: true, status: "published" });
    expect(
      (
        await db.query<{ manual_override: boolean }>(
          `select manual_override from catalogue_relevance.current where venue_id='${venueId}'`,
        )
      ).rows[0].manual_override,
    ).toBe(true);
    expect(
      (
        await db.query(
          `select * from catalogue_relevance.decisions where venue_id='${venueId}'`,
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("new proposals do not overwrite manual decisions", async () => {
    await db.exec(
      `update public.venues set name='Burger King Example' where id='${venueId}'`,
    );
    expect(
      (
        await db.query<{ recommendation_weight: string }>(
          `select recommendation_weight from public.venues where id='${venueId}'`,
        )
      ).rows[0].recommendation_weight,
    ).toBe("0.35");
    expect(
      (
        await db.query<{ manual_override: boolean }>(
          `select manual_override from catalogue_relevance.current where venue_id='${venueId}'`,
        )
      ).rows[0].manual_override,
    ).toBe(true);
  });
});

it("uses unchanged discovery when the rollout switch is off or metadata is missing", () => {
  expect(
    effectiveVenueRelevance(
      { discovery_enabled: false, recommendation_weight: 0.35 },
      false,
    ),
  ).toEqual({ discoveryEnabled: true, recommendationWeight: 1 });
  expect(effectiveVenueRelevance({}, true)).toEqual({
    discoveryEnabled: true,
    recommendationWeight: 1,
  });
  expect(recommendationWeight(-1)).toBe(1);
  expect(recommendationWeight(null)).toBe(1);
  expect(
    relevanceDecisionSchema.safeParse({
      venueId,
      action: "MOVE TO AKIDUERMO",
      weight: 0.5,
      fingerprint: "a".repeat(32),
      reason: "No evidence for move",
    }).success,
  ).toBe(false);
});
function candidate(id: string, weight = 1, visible = true): DiscoveryResult {
  const now = new Date("2026-10-03T12:00:00Z");
  return {
    venue: {
      id,
      slug: id,
      name: id,
      description: { es: id },
      address: "Example",
      locality: "fuengirola",
      latitude: 36,
      longitude: -4,
      verified: true,
      accessible: true,
      recommendationWeight: weight,
      discoveryEnabled: visible,
    },
    event: {
      id,
      slug: id,
      title: { es: id },
      description: { es: id },
      venueId: id,
      category: "food",
      priceCents: 0,
      currency: "EUR",
      source: "verified_venue",
      sponsored: false,
      occurrences: [],
    },
    occurrence: {
      id,
      startsAt: now.toISOString(),
      endsAt: "2026-10-03T18:00:00Z",
      status: "scheduled",
    },
    distanceKm: 1,
  };
}
it("weights equivalent organic candidates and excludes hidden venues", () => {
  const ranked = rankRecommendations({
    candidates: [
      candidate("chain", 0.35),
      candidate("local"),
      candidate("hidden", 1, false),
    ],
    radiusKm: 25,
    now: new Date("2026-10-03T12:00:00Z"),
  });
  expect(ranked.map((r) => r.result.venue.id)).toEqual(["local", "chain"]);
  expect(ranked[1].organicScore).toBeCloseTo(ranked[0].organicScore * 0.35);
});
