// @vitest-environment node
// Executable projection/ACL/legacy-delegation tests. Geometry and group membership
// below are explicit adapters, NOT a claim of real PostGIS clustering. The exact
// migration's3035/DBSCAN behavior requires the separately prepared hosted fixture.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
const migration = "20261101165836_community_story_canonical_city_catalog.sql";
const id = (n: number) =>
  `97000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
let db: PGlite, originalApi: string, groupDefinition: string;
async function rpc(name: string, value: string | null) {
  return (
    await db.query<{
      result: {
        cities?: Record<string, unknown>[];
        stories?: Record<string, unknown>[];
        available: boolean;
        nextCursor?: null;
      };
    }>(`select public.${name}($1) result`, [value])
  ).rows[0].result;
}
async function story(
  n: number,
  city = 2,
  venue = 11,
  status = "approved",
  opt = true,
  age = "1 hour",
  deleted = false,
) {
  await db.query(
    "insert into check_ins values($1,$2,$3,$4,'accepted','{}',now())",
    [id(1000 + n), id(1), id(venue), id(30)],
  );
  await db.query(
    "insert into community_stories(id,owner_id,check_in_id,venue_id,city_id,caption,kind,public_opt_in,status,created_at,expires_at,deleted_at)values($1,$2,$3,$4,$5,$6,'venue',$7,$8,now()-$9::interval,now()-$9::interval+interval'24 hours',case when $10 then now() else null end)",
    [
      id(2000 + n),
      id(1),
      id(1000 + n),
      id(venue),
      id(city),
      `caption-${n}`,
      opt,
      status,
      age,
      deleted,
    ],
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;alter default privileges grant execute on functions to service_role;
create schema auth;create schema storage;create schema extensions;grant usage on schema auth to anon,authenticated;
create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
create function account_features_allowed()returns boolean language sql stable as $$select false$$;
create type app_role as enum('moderator','administrator');create function has_platform_role(app_role[])returns boolean language sql stable as $$select false$$;
create domain public.geometry as text;create domain public.geography as text;
create function public.st_makepoint(float8,float8)returns public.geometry language sql immutable as $$select ($1::text||','||$2::text)::public.geometry$$;
create function public.st_setsrid(public.geometry,int)returns public.geometry language sql immutable as $$select $1$$;
create function public.st_x(public.geometry)returns float8 language sql immutable as $$select split_part($1,',',1)::float8$$;
create function public.st_y(public.geometry)returns float8 language sql immutable as $$select split_part($1,',',2)::float8$$;
create function public.st_distance(public.geography,public.geography)returns float8 language sql immutable as $$select sqrt(power(split_part($1,',',1)::float8-split_part($2,',',1)::float8,2)+power(split_part($1,',',2)::float8-split_part($2,',',2)::float8,2))$$;
create function public.venue_search_normalize(text)returns text language sql immutable as $$select trim(regexp_replace(translate(lower($1),'áéíóúüñ','aeiouun'),'[^a-z0-9]+',' ','g'))$$;
create table profiles(id uuid primary key);insert into profiles values('${id(1)}');
create table cities(id uuid primary key,slug text,name_es text,name_en text,center public.geography);
create table venues(id uuid primary key,city_id uuid,name text,status text,verified bool);
create table venue_checkin_credentials(id uuid primary key,venue_id uuid);
create table check_ins(id uuid primary key,profile_id uuid references profiles,venue_id uuid references venues,credential_id uuid,state text,risk_flags text[],created_at timestamptz);
create table storage.buckets(id text primary key,name text,public bool,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(bucket_id text,name text);alter table storage.objects enable row level security;
create table qa_city_groups(city_id uuid primary key,canonical_id uuid);`);
  await db.exec(
    readFileSync(
      "database/migrations/20261031230204_community_stories.sql",
      "utf8",
    ),
  );
  originalApi = (
    await db.query<{ definition: string }>(
      "select pg_get_functiondef('public.community_stories_api(text,jsonb)'::regprocedure) definition",
    )
  ).rows[0].definition;
  const sql = readFileSync("database/migrations/" + migration, "utf8");
  expect(sql).toBe(readFileSync("supabase/migrations/" + migration, "utf8"));
  await db.exec(sql);
  groupDefinition = (
    await db.query<{ definition: string }>(
      "select pg_get_functiondef('public.community_story_city_groups(uuid)'::regprocedure) definition",
    )
  ).rows[0].definition;
  // Precomputed groups isolate reader contracts from unavailable PostGIS in PGlite.
  await db.exec(
    `create or replace function public.community_story_city_groups(p_city_id uuid default null)returns table(city_id uuid,canonical_id uuid)language sql stable security definer set search_path='' as $$select g.city_id,g.canonical_id from public.qa_city_groups g where p_city_id is null or (select public.venue_search_normalize(c.name_es)from public.cities c where c.id=g.city_id)=(select public.venue_search_normalize(c.name_es)from public.cities c where c.id=p_city_id)$$;`,
  );
}, 30000);
beforeEach(async () => {
  await db.exec(`reset role;truncate community_stories,check_ins,venues,cities,qa_city_groups cascade;
insert into cities values('${id(100)}','fuengirola','Fuengirola',null,'-4.625,36.539'),('${id(2)}','fuengirola-2','FUENGIROLA',null,'-4.626,36.540'),('${id(3)}','fuengirola-far','Fuengirola',null,'-3.7,40.4'),('${id(4)}','malaga','Málaga',null,'-4.42,36.72');
insert into qa_city_groups values('${id(100)}','${id(100)}'),('${id(2)}','${id(100)}'),('${id(3)}','${id(3)}'),('${id(4)}','${id(4)}');
insert into venues values('${id(10)}','${id(100)}','Bare venue','published',true),('${id(11)}','${id(2)}','Alias venue','published',true),('${id(12)}','${id(2)}','Unpublished','draft',true),('${id(13)}','${id(2)}','Unverified','published',false);
select set_config('test.uid','',false);`);
});
afterAll(async () => db?.close());
it("leaves the original lifecycle body unchanged and retains deterministic metric grouping source", async () => {
  expect(
    (
      await db.query<{ definition: string }>(
        "select pg_get_functiondef('public.community_stories_api(text,jsonb)'::regprocedure)definition",
      )
    ).rows[0].definition,
  ).toBe(originalApi);
  expect(groupDefinition).toContain(
    "st_transform(c.center::public.geometry,3035)",
  );
  expect(groupDefinition).toContain("st_clusterdbscan");
  expect(groupDefinition).toContain("eps:=5000,minpoints:=1");
  expect(groupDefinition).toContain("order by n.id");
});
it("denies private grouping and service/default-public execution while allowing only anon/auth public readers", async () => {
  for (const role of ["anon", "authenticated", "service_role"]) {
    expect(
      (
        await db.query<{ ok: boolean }>(
          "select has_function_privilege($1,'public.community_story_city_groups(uuid)','EXECUTE')ok",
          [role],
        )
      ).rows[0].ok,
    ).toBe(false);
  }
  for (const fn of [
    "community_story_city_catalog(text)",
    "community_story_city_feed(text)",
  ]) {
    for (const role of ["anon", "authenticated"])
      expect(
        (
          await db.query<{ ok: boolean }>(
            `select has_function_privilege($1,'public.${fn}','EXECUTE')ok`,
            [role],
          )
        ).rows[0].ok,
      ).toBe(true);
    expect(
      (
        await db.query<{ ok: boolean }>(
          `select has_function_privilege('service_role','public.${fn}','EXECUTE')ok`,
        )
      ).rows[0].ok,
    ).toBe(false);
  }
  await db.exec("set role anon");
  await expect(
    db.query("select * from public.community_story_city_groups(null)"),
  ).rejects.toThrow(/permission denied/);
});
it("returns200 nearest canonical groups rather than the first alphabetic raw aliases", async () => {
  for (let n = 300; n < 521; n++) {
    await db.query("insert into cities values($1,$2,$3,null,'-1,42')", [
      id(n),
      `aaa-${n}`,
      `Far${n}`,
    ]);
    await db.query("insert into qa_city_groups values($1,$1)", [id(n)]);
  }
  await db.exec("set role anon");
  const r = await rpc("community_story_city_catalog", "fuengirola");
  expect(r.cities).toHaveLength(200);
  expect(r.cities?.[0].slug).toBe("fuengirola");
  expect(r.cities?.map((c) => c.slug)).not.toContain("fuengirola-2");
  expect(r.cities?.map((c) => c.slug)).toContain("malaga");
  expect(r.available).toBe(true);
});
it("sums exact public24h filters across aliases and exposes only existingCityDTO keys", async () => {
  await story(1, 100, 10);
  await story(2);
  await story(3, 2, 11, "pending");
  await story(4, 2, 11, "rejected");
  await story(5, 2, 11, "approved", false);
  await story(6, 2, 11, "approved", true, "25 hours");
  await story(7, 2, 11, "approved", true, "1 hour", true);
  await story(8, 2, 12);
  await story(9, 2, 13);
  await db.exec("set role anon");
  const city = (await rpc("community_story_city_catalog", "fuengirola"))
    .cities?.[0];
  expect(city?.approvedStories24h).toBe(2);
  expect(Object.keys(city!).sort()).toEqual(
    [
      "id",
      "slug",
      "nameEs",
      "nameEn",
      "latitude",
      "longitude",
      "approvedStories24h",
    ].sort(),
  );
  expect(city?.nameEn).toBe(null);
});
it("resolves selected public area by slug/name and unmatched region falls back to Fuengirola", async () => {
  await db.exec("set role anon");
  for (const area of ["malaga", "Málaga"])
    expect(
      (await rpc("community_story_city_catalog", area)).cities?.[0].slug,
    ).toBe("malaga");
  for (const area of ["Costa del Sol", "unknown area", "fuengirola-2"])
    expect(
      (await rpc("community_story_city_catalog", area)).cities?.[0].slug,
    ).toBe("fuengirola");
});
it("merges unchanged public alias feeds, rewritesonlyrequested citySlug and preserves order/privacy", async () => {
  await story(1, 100, 10, "approved", true, "2 hours");
  await story(2, 2, 11, "approved", true, "1 hour");
  await story(3, 2, 11, "pending");
  await db.exec("set role anon");
  for (const slug of ["fuengirola", "fuengirola-2"]) {
    const feed = await rpc("community_story_city_feed", slug);
    expect(feed.stories?.map((s) => s.id)).toEqual([id(2002), id(2001)]);
    expect(feed.stories?.every((s) => s.citySlug === slug)).toBe(true);
    expect(JSON.stringify(feed)).not.toContain("owner_id");
    expect(JSON.stringify(feed)).not.toContain("moderation_reason");
    expect(feed.nextCursor).toBe(null);
    expect(feed.available).toBe(true);
  }
  expect(
    (await rpc("community_story_city_feed", "fuengirola-far")).stories,
  ).toEqual([]);
});
it("caps merged feed at50globally while includingaliasmembersbeyondthefirstslug", async () => {
  for (let n = 1; n <= 60; n++)
    await story(
      n,
      n <= 30 ? 100 : 2,
      n <= 30 ? 10 : 11,
      "approved",
      true,
      `${n} minutes`,
    );
  await db.exec("set role anon");
  const r = await rpc("community_story_city_feed", "fuengirola");
  expect(r.stories).toHaveLength(50);
  expect(r.stories?.map((s) => s.id)).toEqual(
    Array.from({ length: 50 }, (_, i) => id(2001 + i)),
  );
});
it("fails closed on malformed area/city and excessive alias groups without touching private state", async () => {
  await db.exec("set role anon");
  for (const x of [null, "", "x".repeat(101), "bad\narea"])
    await expect(rpc("community_story_city_catalog", x)).rejects.toThrow(
      /Invalid public area/,
    );
  for (const x of [null, "", "Bad City", "../private", "x".repeat(101)])
    await expect(rpc("community_story_city_feed", x)).rejects.toThrow(
      /Invalid public city/,
    );
  expect((await rpc("community_story_city_feed", "unknown")).stories).toEqual(
    [],
  );
  await db.exec("reset role");
  for (let n = 400; n < 464; n++) {
    await db.query(
      "insert into cities values($1,$2,'Fuengirola',null,'-4.625,36.539')",
      [id(n), `fuengirola-${n}`],
    );
    await db.query("insert into qa_city_groups values($1,$2)", [
      id(n),
      id(100),
    ]);
  }
  await db.exec("set role anon");
  await expect(rpc("community_story_city_feed", "fuengirola")).rejects.toThrow(
    /reader limit/,
  );
});
