import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(await fs.readFile("tests/passport-db-fixture.sql", "utf8"));
for (const file of [
  "database/migrations/20260916103318_managed_achievements.sql",
  "database/migrations/20260916115126_activity_achievements.sql",
  "supabase/migrations/20261003193908_passport_city_collection.sql",
]) {
  try {
    await db.exec(await fs.readFile(file, "utf8"));
    console.log("Applied", file);
  } catch (e) {
    console.error(e.message, e.detail, e.where, e.query?.slice(0, 300));
    process.exit(1);
  }
}
const admin = "10000000-0000-0000-0000-000000000001",
  member = "10000000-0000-0000-0000-000000000002",
  other = "10000000-0000-0000-0000-000000000003";
await db.exec(
  `insert into auth.users values('${admin}','admin@example.test'),('${member}','member@example.test'),('${other}','other@example.test');insert into public.profiles values('${admin}','Admin','administrator'),('${member}','Member','consumer'),('${other}','Other','consumer');grant usage on schema public,auth,private to authenticated;grant execute on function auth.uid() to authenticated;`,
);
const login = async (id) =>
  db.exec(
    `select set_config('request.jwt.claim.sub','${id}',false);set role authenticated;`,
  );
const logout = async () => db.exec("reset role;");
const rpc = async (action, payload) => {
  const r = await db.query(
    "select public.admin_passport_awards($1,$2::jsonb) value",
    [action, JSON.stringify(payload)],
  );
  return r.rows[0].value;
};
await login(member);
await assert.rejects(() => rpc("search", { query: "Admin" }), /administrator/);
await assert.rejects(
  () => db.query("select public.passport_collection($1)", [other]),
  /not authorised/,
);
await assert.rejects(
  () => db.query("select * from private.passport_manual_awards"),
  /permission denied/,
);
await logout();
await login(admin);
await rpc("mark_test", { profile_id: member, enabled: true });
const grant = {
  profile_id: member,
  achievement_key: "stamp_fuengirola_cafe_5",
  purpose: "test",
  reason: "Visual test",
  request_id: "20000000-0000-0000-0000-000000000001",
};
await rpc("grant", grant);
await rpc("grant", grant);
let state = await rpc("read", { profile_id: member });
assert.equal(state.grants.length, 1);
let f = state.collection.families.find(
  (x) => x.family_key === "stamp/fuengirola/cafe",
);
assert.equal(f.current_count, 0);
assert.ok(f.milestones.find((m) => m.tier === 2).manual_at);
assert.equal(f.milestones.filter((m) => m.unlocked_at).length, 0);
await rpc("preset", {
  profile_id: member,
  city_key: "malaga",
  preset: "mixed",
  purpose: "test",
  reason: "Mixed test",
  request_id: "20000000-0000-0000-0000-000000000002",
});
state = await rpc("read", { profile_id: member });
assert.equal(state.grants.length, 11);
await rpc("reset_city", {
  profile_id: member,
  city_key: "malaga",
  reason: "Reset test",
});
state = await rpc("read", { profile_id: member });
assert.equal(state.grants.filter((g) => !g.revoked_at).length, 1);
await logout();
await db.exec(`insert into public.cities values('30000000-0000-0000-0000-000000000001','Los Boliches','Los Boliches','los-boliches','Europe/Madrid'),('30000000-0000-0000-0000-000000000002','Málaga','Málaga','malaga','Europe/Madrid');
insert into public.venues select ('40000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,case when n<=5 then '30000000-0000-0000-0000-000000000001'::uuid else '30000000-0000-0000-0000-000000000002'::uuid end,'published',true,'point','Venue '||n,'venue-'||n from generate_series(1,7) n;
select set_config('request.jwt.claim.sub','${admin}',false);
insert into public.venue_achievement_categories select id,'cafe' from public.venues;
insert into public.check_ins select gen_random_uuid(),'${member}',id,'accepted',now() from public.venues;
insert into public.check_ins select gen_random_uuid(),'${member}',id,'accepted',now() from public.venues where slug='venue-1';
insert into public.check_ins select gen_random_uuid(),'${member}',id,'cooldown',now() from public.venues;
`);
await login(admin);
state = await rpc("read", { profile_id: member });
f = state.collection.families.find(
  (x) => x.family_key === "stamp/fuengirola/cafe",
);
assert.equal(f.current_count, 5);
assert.ok(f.milestones.find((m) => m.tier === 2).unlocked_at);
assert.equal(
  state.collection.families.find((x) => x.family_key === "stamp/malaga/cafe")
    .current_count,
  2,
);
await rpc("reset_city", {
  profile_id: member,
  city_key: "fuengirola",
  reason: "Reset test",
});
state = await rpc("read", { profile_id: member });
f = state.collection.families.find(
  (x) => x.family_key === "stamp/fuengirola/cafe",
);
assert.ok(f.milestones.find((m) => m.tier === 2).unlocked_at);
assert.ok(!f.milestones.some((m) => m.manual_at));
await logout();
assert.equal(
  (await db.query("select count(*) n from public.xp_ledger")).rows[0].n,
  0,
);
console.log(
  "PASS: permissions, idempotency, manual provenance, presets/reset, city isolation, repeated/rejected visits, natural award preservation, no XP mutation",
);
await db.close();
