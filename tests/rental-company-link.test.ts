import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
const sql = readFileSync(
  new URL(
    "../database/migrations/20261015163602_link_owned_rental_company_venue.sql",
    import.meta.url,
  ),
  "utf8",
);
const owner = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222",
  company = "33333333-3333-4333-8333-333333333333",
  venue = "44444444-4444-4444-8444-444444444444",
  second = "55555555-5555-4555-8555-555555555555";
describe("explicit rental company attachment", () => {
  it("enforces company ownership plus venue management, preserves rows and refuses reassignment", async () => {
    const db = new PGlite();
    try {
      await db.exec(`create role anon; create role authenticated; create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create type public.venue_member_role as enum ('owner','manager','editor');
    create table public.venues(id uuid primary key, discovery_vertical text);
    create table public.venue_members(venue_id uuid, profile_id uuid, role public.venue_member_role);
    create function public.is_venue_member(target_venue uuid, allowed_roles public.venue_member_role[]) returns boolean language sql stable as $$ select exists(select 1 from public.venue_members where venue_id=target_venue and profile_id=auth.uid() and role=any(allowed_roles)) $$;
    create table public.car_rental_companies(id uuid primary key, submitted_by uuid,venue_id uuid unique,name text,status text);
    insert into public.venues values('${venue}','activities'),('${second}','activities');
    insert into public.venue_members values('${venue}','${owner}','owner'),('${second}','${owner}','owner');
    insert into public.car_rental_companies values('${company}','${owner}',null,'Fixture company','published');`);
      await db.exec(sql);
      const call = () =>
        db.query(
          `select public.link_owned_rental_company_venue('${company}','${venue}')`,
        );
      await expect(call()).rejects.toThrow(/authentication required/);
      await db.exec(`set request.jwt.claim.sub='${other}'`);
      await expect(call()).rejects.toThrow(/not authorized/);
      await db.exec(
        `insert into public.venue_members values('${venue}','${other}','manager')`,
      );
      await expect(call()).rejects.toThrow(/not authorized/);
      await db.exec(`set request.jwt.claim.sub='${owner}'`);
      await call();
      await call();
      expect(
        (
          await db.query(
            `select name,status,venue_id from public.car_rental_companies`,
          )
        ).rows,
      ).toEqual([
        { name: "Fixture company", status: "published", venue_id: venue },
      ]);
      await expect(
        db.query(
          `select public.link_owned_rental_company_venue('${company}','${second}')`,
        ),
      ).rejects.toThrow(/already linked/);
      expect(
        (
          await db.query(
            `select has_function_privilege('anon','public.link_owned_rental_company_venue(uuid,uuid)','EXECUTE') as anon, has_function_privilege('authenticated','public.link_owned_rental_company_venue(uuid,uuid)','EXECUTE') as authenticated`,
          )
        ).rows,
      ).toEqual([{ anon: false, authenticated: true }]);
    } finally {
      await db.close();
    }
  }, 20000);
});
