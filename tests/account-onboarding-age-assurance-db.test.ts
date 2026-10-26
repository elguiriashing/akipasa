import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
let db: PGlite;
const alice = "11111111-1111-4111-8111-111111111111",
  bob = "22222222-2222-4222-8222-222222222222";
async function asUser(id = alice) {
  await db.exec(
    `reset role; set request.jwt.claim.sub='${id}'; set role authenticated;`,
  );
}
async function verified() {
  return (
    await db.query<{ s: { adult_verified: boolean } }>(
      "select public.my_age_assurance() s",
    )
  ).rows[0].s.adult_verified;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
 create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;
 create table public.profiles(id uuid primary key);
 create table public.check_ins(profile_id uuid references public.profiles(id), state text);
 grant select,insert on public.check_ins to authenticated;
 create function public.account_features_allowed() returns boolean language sql stable as $$select coalesce(current_setting('test.account_allowed',true),'true')<>'false'$$;
 insert into profiles values('${alice}'),('${bob}');`);
  await db.exec(
    readFileSync(
      new URL(
        "../supabase/migrations/20261026171719_age_assurance_review_policy.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
}, 20000);
afterAll(async () => db.close());
describe.sequential(
  "private attestation authority and disabled rollout",
  () => {
    it("is disabled and does not change legacy check-ins", async () => {
      await asUser();
      expect(await verified()).toBe(false);
      await db.exec(
        "insert into public.check_ins values(auth.uid(),'accepted')",
      );
    });
    it("denies browser/private reads, writes, settings and other-person predicates", async () => {
      await asUser();
      for (const sql of [
        "select * from age_assurance_private.attestations",
        "update age_assurance_private.rollout set enabled=true",
        `select age_assurance_private.adult_verified('${bob}')`,
        `insert into age_assurance_private.attestations values('${alice}','fake','fake',now(),now()+interval '1 day',null)`,
      ])
        await expect(db.exec(sql)).rejects.toThrow(/permission denied/);
      await db.exec("reset role;set role anon");
      await expect(db.exec("select public.my_age_assurance()")).rejects.toThrow(
        /permission denied/,
      );
    });
    it("does not verify even a recorded proof until operator rollout", async () => {
      await db.exec(
        `reset role;set role service_role;insert into age_assurance_private.attestations values('${alice}','fixture','proof-1',now()-interval '1 minute',now()+interval '1 day',null);reset role;`,
      );
      await asUser();
      expect(await verified()).toBe(false);
    });
    it("isolates caller proof and gates direct check-ins after rollout", async () => {
      await db.exec(
        "reset role;set role service_role;update age_assurance_private.rollout set enabled=true;reset role;",
      );
      await asUser();
      expect(await verified()).toBe(true);
      await db.exec(
        "insert into public.check_ins values(auth.uid(),'accepted')",
      );
      await asUser(bob);
      expect(await verified()).toBe(false);
      await expect(
        db.exec("insert into public.check_ins values(auth.uid(),'accepted')"),
      ).rejects.toThrow(/adult verification required/);
      await expect(
        db.exec(`insert into public.check_ins values('${alice}','accepted')`),
      ).rejects.toThrow(/adult verification required/);
    });
    it("cannot reuse one provider proof for another identity", async () => {
      await db.exec("reset role;set role service_role");
      await expect(
        db.exec(
          `insert into age_assurance_private.attestations values('${bob}','fixture','proof-1',now(),now()+interval '1 day',null)`,
        ),
      ).rejects.toThrow(/unique/);
    });
    it("never overrides existing account restrictions", async () => {
      await asUser();
      await db.exec("set test.account_allowed='false'");
      await expect(
        db.exec("insert into public.check_ins values(auth.uid(),'accepted')"),
      ).rejects.toThrow(/adult verification required/);
      await db.exec("set test.account_allowed='true'");
    });
    it.each([
      "revoked_at=now()",
      "expires_at=now()",
      "verified_at=now()+interval '1 hour'",
    ])("rejects %s", async (patch) => {
      await db.exec(
        `reset role;update age_assurance_private.attestations set verified_at=now()-interval '1 minute',expires_at=now()+interval '1 day',revoked_at=null where profile_id='${alice}';update age_assurance_private.attestations set ${patch} where profile_id='${alice}';`,
      );
      await asUser();
      expect(await verified()).toBe(false);
      await expect(
        db.exec("insert into public.check_ins values(auth.uid(),'accepted')"),
      ).rejects.toThrow(/adult verification required/);
    });
    it("cascades own proof on deletion without rewriting check-in history", async () => {
      await db.exec(
        `reset role;delete from public.check_ins;delete from public.profiles where id='${alice}'`,
      );
      await asUser();
      expect(await verified()).toBe(false);
      await db.exec("reset role");
      expect(
        (
          await db.query<{ n: number }>(
            "select count(*)::int n from age_assurance_private.attestations",
          )
        ).rows[0].n,
      ).toBe(0);
    });
    it("keeps canonical migration copies identical", () => {
      expect(
        readFileSync(
          new URL(
            "../database/migrations/20261026171719_age_assurance_review_policy.sql",
            import.meta.url,
          ),
          "utf8",
        ),
      ).toBe(
        readFileSync(
          new URL(
            "../supabase/migrations/20261026171719_age_assurance_review_policy.sql",
            import.meta.url,
          ),
          "utf8",
        ),
      );
    });
  },
);
