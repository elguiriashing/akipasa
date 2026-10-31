// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
let db: PGlite;
const uid = (n: number) =>
  `98000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
async function actor(n: number | null, staff = false) {
  await db.query(
    "select set_config('test.uid',$1,false),set_config('test.staff',$2,false)",
    [n ? uid(n) : "", String(staff)],
  );
}
async function call(action: string, payload: object = {}) {
  const { rows } = await db.query<{ result: unknown }>(
    "select public.community_stories_api($1,$2::jsonb) result",
    [action, JSON.stringify(payload)],
  );
  return rows[0].result as {
    id: string;
    checkIns: { id: string }[];
    cities: { approvedStories24h: number }[];
    stories: { id: string; reportCount: number }[];
    story: { status: string };
  };
}
beforeAll(async () => {
  db = new PGlite();
  // Disposable transport/schema projection, not Supabase network or complete migration replay.
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;create schema extensions;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create function public.account_features_allowed() returns boolean language sql stable as $$select auth.uid() is not null and coalesce(current_setting('test.eligible',true),'true')<>'false'$$;
 create type public.app_role as enum ('moderator','administrator');
 create function public.has_platform_role(public.app_role[]) returns boolean language sql stable as $$select coalesce(current_setting('test.staff',true),'false')='true'$$;
 create domain public.geometry as text;
 create function public.st_y(public.geometry) returns float8 language sql immutable as $$select 36.7::float8$$;
 create function public.st_x(public.geometry) returns float8 language sql immutable as $$select -4.4::float8$$;
 create table public.profiles(id uuid primary key);create table public.cities(id uuid primary key,slug text,name_es text,name_en text,center text);
 create table public.venues(id uuid primary key,city_id uuid,name text,status text,verified bool);
 create table public.venue_checkin_credentials(id uuid primary key,venue_id uuid);
 create table public.check_ins(id uuid primary key,profile_id uuid references public.profiles(id) on delete cascade,venue_id uuid references public.venues(id) on delete cascade,credential_id uuid,state text,risk_flags text[],created_at timestamptz);
 create table storage.buckets(id text primary key,name text,public bool,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant usage on schema storage to anon,authenticated;
 grant select,insert,update,delete on storage.objects to anon,authenticated;
 create policy synthetic_legacy_permissive on storage.objects for all to anon,authenticated using(true) with check(true);
 insert into profiles values('${uid(1)}'),('${uid(2)}');
 insert into cities values('${uid(10)}','malaga','Málaga','Malaga','city-centroid');
 insert into venues values('${uid(20)}','${uid(10)}','Verified venue','published',true);
 insert into venue_checkin_credentials values('${uid(30)}','${uid(20)}');
 insert into check_ins values('${uid(40)}','${uid(1)}','${uid(20)}','${uid(30)}','accepted','{}',now()),('${uid(41)}','${uid(2)}','${uid(20)}','${uid(30)}','accepted','{}',now()),('${uid(42)}','${uid(1)}','${uid(20)}',null,'accepted','{}',now()),('${uid(43)}','${uid(1)}','${uid(20)}','${uid(30)}','accepted','{}',now()-interval '25 hours');`);
  const sql = readFileSync(
    "database/migrations/20261031230204_community_stories.sql",
    "utf8",
  );
  expect(sql).toBe(
    readFileSync(
      "supabase/migrations/20261031230204_community_stories.sql",
      "utf8",
    ),
  );
  await db.exec(sql);
  expect(
    (
      await db.query<{ collection_enabled: boolean }>(
        "select collection_enabled from public.community_story_settings",
      )
    ).rows[0].collection_enabled,
  ).toBe(false);
  await db.exec(
    "update public.community_story_settings set collection_enabled=true",
  );
}, 30000);
afterAll(async () => db?.close());
let storyId: string;
it("requires caller ownership, accepted credential and recent verified visit", async () => {
  await actor(1);
  expect(
    (await call("check-ins")).checkIns.map((r: { id: string }) => r.id),
  ).toEqual([uid(40)]);
  for (const id of [uid(41), uid(42), uid(43)])
    await expect(
      call("reserve", {
        checkInId: id,
        kind: "venue",
        caption: "test",
        publicOptIn: "true",
      }),
    ).rejects.toThrow("Verified check-in");
  await expect(
    call("reserve", {
      checkInId: uid(40),
      kind: "venue",
      publicOptIn: "false",
    }),
  ).rejects.toThrow("Public opt-in");
  storyId = (
    await call("reserve", {
      checkInId: uid(40),
      kind: "venue",
      caption: "Actual visit",
      publicOptIn: "true",
    })
  ).id;
  await expect(
    call("reserve", { checkInId: uid(40), kind: "venue", publicOptIn: "true" }),
  ).rejects.toThrow("duplicate key");
});
it("withholds incomplete uploads and pending photos from public media/feed/ranking", async () => {
  await expect(call("finalize", { id: storyId })).rejects.toThrow(
    "Upload missing",
  );
  await db.query("insert into storage.objects values($1,$2)", [
    "community-stories",
    `${storyId}.webp`,
  ]);
  expect((await call("finalize", { id: storyId })).story.status).toBe(
    "pending",
  );
  await actor(null);
  expect(await call("media", { id: storyId })).toBeNull();
  expect((await call("feed", { city: "malaga" })).stories).toEqual([]);
  expect((await call("cities")).cities[0].approvedStories24h).toBe(0);
  await expect(call("mine")).rejects.toThrow("Account required");
});
it("authorizes owner preview and staff moderation without profile/coordinates projection", async () => {
  await actor(2);
  expect(await call("media", { id: storyId })).toBeNull();
  await expect(call("moderation")).rejects.toThrow("Moderator required");
  await actor(1);
  expect((await call("media", { id: storyId })).id).toBe(storyId);
  await actor(2, true);
  await expect(
    call("moderate", { id: storyId, decision: "approve", reason: " " }),
  ).rejects.toThrow("Reason required");
  expect((await call("moderation")).stories[0].id).toBe(storyId);
  expect(
    (
      await call("moderate", {
        id: storyId,
        decision: "approve",
        reason: "Manual review complete",
      })
    ).story.status,
  ).toBe("approved");
  await actor(null);
  const feed = await call("feed", { city: "malaga" });
  expect(feed.stories).toHaveLength(1);
  expect(JSON.stringify(feed)).not.toMatch(
    /owner_id|profile_id|latitude|longitude|credential|storage/,
  );
  expect((await call("cities")).cities[0].approvedStories24h).toBe(1);
});
it("supports bounded reports and immediately revokes deleted or expired stories", async () => {
  await actor(2);
  expect(await call("report", { id: storyId, reason: "privacy" })).toEqual({
    reported: true,
  });
  expect(await call("report", { id: storyId, reason: "privacy" })).toEqual({
    reported: true,
  });
  await expect(call("delete", { id: storyId })).rejects.toThrow("Not eligible");
  await actor(2, true);
  expect(
    (await call("moderation", { queue: "reported" })).stories[0].reportCount,
  ).toBe(1);
  await actor(1);
  expect(await call("delete", { id: storyId })).toEqual({ deleted: true });
  await actor(null);
  expect(await call("media", { id: storyId })).toBeNull();
  expect((await call("feed", { city: "malaga" })).stories).toEqual([]);
  expect((await call("cities")).cities[0].approvedStories24h).toBe(0);
});
it("never grants direct client table reads or writes and creates a private bucket", async () => {
  const { rows } = await db.query<{ selectable: boolean; writable: boolean }>(
    "select has_table_privilege('anon','public.community_stories','select') selectable,has_table_privilege('authenticated','public.community_stories','insert') writable",
  );
  expect(rows[0]).toEqual({ selectable: false, writable: false });
  const bucket = await db.query<{ public: boolean }>(
    "select public from storage.buckets",
  );
  expect(bucket.rows[0].public).toBe(false);
});
it("rejects geofence-risk and unpublished venues without trusting photo or client city", async () => {
  await actor(2);
  await db.query(
    "update public.check_ins set risk_flags=array['outside_geofence'] where id=$1",
    [uid(41)],
  );
  await expect(
    call("reserve", {
      checkInId: uid(41),
      kind: "selfie",
      publicOptIn: "true",
      cityId: uid(999),
    }),
  ).rejects.toThrow("Verified check-in");
  await db.query("update public.check_ins set risk_flags='{}' where id=$1", [
    uid(41),
  ]);
  await db.query("update public.venues set verified=false where id=$1", [
    uid(20),
  ]);
  await expect(
    call("reserve", {
      checkInId: uid(41),
      kind: "selfie",
      publicOptIn: "true",
    }),
  ).rejects.toThrow("Verified check-in");
  await db.query("update public.venues set verified=true where id=$1", [
    uid(20),
  ]);
});
it("allows an owner to abort only an incomplete upload and retry, and rejects expired media", async () => {
  await actor(2);
  const first = await call("reserve", {
    checkInId: uid(41),
    kind: "selfie",
    publicOptIn: "true",
  });
  await actor(1);
  await expect(call("abort", { id: first.id })).rejects.toThrow("Not eligible");
  await actor(2);
  expect(await call("abort", { id: first.id })).toEqual({ aborted: true });
  const retry = await call("reserve", {
    checkInId: uid(41),
    kind: "selfie",
    publicOptIn: "true",
  });
  await db.query("insert into storage.objects values($1,$2)", [
    "community-stories",
    `${retry.id}.webp`,
  ]);
  await call("finalize", { id: retry.id });
  await expect(call("abort", { id: retry.id })).rejects.toThrow("Not eligible");
  await db.query(
    "update public.community_stories set created_at=now()-interval '25 hours',expires_at=now()-interval '1 hour' where id=$1",
    [retry.id],
  );
  expect(await call("media", { id: retry.id })).toBeNull();
  expect((await call("mine")).stories).toEqual([]);
});
it("bounds daily reservations transactionally under the profile lock", async () => {
  await actor(1);
  for (let n = 100; n < 110; n++)
    await db.query(
      "insert into public.check_ins values($1,$2,$3,$4,'accepted','{}',now())",
      [uid(n), uid(1), uid(20), uid(30)],
    );
  for (let n = 100; n < 109; n++)
    await call("reserve", {
      checkInId: uid(n),
      kind: "venue",
      publicOptIn: "true",
    });
  await expect(
    call("reserve", {
      checkInId: uid(109),
      kind: "venue",
      publicOptIn: "true",
    }),
  ).rejects.toThrow("Daily limit");
});

it("isolates the private bucket even with a broad pre-existing storage policy", async () => {
  await db.exec("set role authenticated");
  try {
    const result = await db.query<{ count: number }>(
      "select count(*)::int count from storage.objects where bucket_id='community-stories'",
    );
    expect(result.rows[0].count).toBe(0);
    await expect(
      db.exec(
        "insert into storage.objects values('community-stories','forged.webp')",
      ),
    ).rejects.toThrow("row-level security");
    await db.exec(
      "insert into storage.objects values('other-bucket','untouched.webp')",
    );
  } finally {
    await db.exec("reset role");
  }
});
it("retains aborted attempts and cleanup backlog, without letting expiry or fake confirmation imply physical deletion", async () => {
  const { rows } = await db.query<{ story_id: string }>(
    "select story_id from public.community_story_media_cleanup where owner_id=$1 order by created_at",
    [uid(2)],
  );
  expect(rows.length).toBeGreaterThan(0);
  const aborted = rows[0].story_id;
  const attempt = await db.query<{ deleted_at: string }>(
    "select deleted_at from public.community_stories where id=$1",
    [aborted],
  );
  expect(attempt.rows[0].deleted_at).toBeTruthy();
  await actor(1);
  await expect(call("cleanup-complete", { id: aborted })).rejects.toThrow(
    "Not eligible",
  );
  await actor(2);
  await db.query("insert into storage.objects values($1,$2)", [
    "community-stories",
    `${aborted}.webp`,
  ]);
  expect(await call("cleanup-complete", { id: aborted })).toEqual({
    removed: false,
  });
  await db.query("delete from storage.objects where bucket_id=$1 and name=$2", [
    "community-stories",
    `${aborted}.webp`,
  ]);
  expect(await call("cleanup-complete", { id: aborted })).toEqual({
    removed: true,
  });
});

it("preserves owner withdrawal after attendance eligibility is revoked without permitting new publishing or moderation", async () => {
  await actor(2);
  await db.query(
    "insert into public.check_ins values($1,$2,$3,$4,'accepted','{}',now())",
    [uid(300), uid(2), uid(20), uid(30)],
  );
  const created = await call("reserve", {
    checkInId: uid(300),
    kind: "venue",
    publicOptIn: "true",
  });
  await db.query("insert into storage.objects values($1,$2)", [
    "community-stories",
    `${created.id}.webp`,
  ]);
  await call("finalize", { id: created.id });
  await actor(1, true);
  await call("moderate", {
    id: created.id,
    decision: "approve",
    reason: "Reviewed actual photo",
  });
  await actor(2);
  await db.exec("select set_config('test.eligible','false',false)");
  try {
    expect((await call("mine")).stories.map((row) => row.id)).toContain(
      created.id,
    );
    for (const action of [
      "reserve",
      "check-ins",
      "report",
      "moderation",
      "moderate",
    ])
      await expect(call(action, { id: created.id })).rejects.toThrow();
    await actor(1);
    await expect(call("delete", { id: created.id })).rejects.toThrow(
      "Not eligible",
    );
    await actor(2);
    expect(await call("delete", { id: created.id })).toEqual({ deleted: true });
    await actor(null);
    expect(await call("media", { id: created.id })).toBeNull();
    expect((await call("feed", { city: "malaga" })).stories).toEqual([]);
    await expect(call("mine")).rejects.toThrow("Account required");
    await actor(2);
    await db.query(
      "delete from storage.objects where bucket_id=$1 and name=$2",
      ["community-stories", `${created.id}.webp`],
    );
    expect(await call("cleanup-complete", { id: created.id })).toEqual({
      removed: true,
    });
  } finally {
    await db.exec("select set_config('test.eligible','true',false)");
  }
});
it("does not block moderator/reporter/profile deletion and retains opaque media cleanup after identity removal", async () => {
  await db.query("insert into profiles values($1),($2)", [uid(500), uid(501)]);
  await db.query(
    "insert into public.check_ins values($1,$2,$3,$4,'accepted','{}',now())",
    [uid(500), uid(500), uid(20), uid(30)],
  );
  await db.query(
    "insert into public.community_stories(id,owner_id,check_in_id,venue_id,city_id,caption,kind,public_opt_in,status,moderated_by) values($1,$2,$3,$4,$5,'Owner photo','venue',true,'approved',$6)",
    [uid(500), uid(500), uid(500), uid(20), uid(10), uid(501)],
  );
  await db.query(
    "insert into public.community_story_reports(story_id,reporter_id,reason) values($1,$2,'privacy')",
    [uid(500), uid(501)],
  );
  await db.query("insert into storage.objects values('community-stories',$1)", [
    `${uid(500)}.webp`,
  ]);
  await db.query("delete from public.profiles where id=$1", [uid(501)]);
  const moderator = await db.query<{ moderated_by: string | null }>(
    "select moderated_by from public.community_stories where id=$1",
    [uid(500)],
  );
  expect(moderator.rows[0].moderated_by).toBeNull();
  const reports = await db.query<{ count: number }>(
    "select count(*)::int count from public.community_story_reports where reporter_id=$1",
    [uid(501)],
  );
  expect(reports.rows[0].count).toBe(0);
  await db.query("delete from public.profiles where id=$1", [uid(500)]);
  await actor(null);
  expect(await call("media", { id: uid(500) })).toBeNull();
  const cleanup = await db.query<{ story_id: string; owner_id: string | null }>(
    "select story_id,owner_id from public.community_story_media_cleanup where story_id=$1",
    [uid(500)],
  );
  expect(cleanup.rows).toEqual([{ story_id: uid(500), owner_id: null }]);
  const media = await db.query<{ count: number }>(
    "select count(*)::int count from storage.objects where bucket_id='community-stories' and name=$1",
    [`${uid(500)}.webp`],
  );
  expect(media.rows[0].count).toBe(1);
});
it("cascades deleted check-ins to story/report metadata while retaining authorized private cleanup", async () => {
  await db.query("insert into profiles values($1)", [uid(502)]);
  await db.query(
    "insert into public.check_ins values($1,$2,$3,$4,'accepted','{}',now())",
    [uid(502), uid(502), uid(20), uid(30)],
  );
  await db.query(
    "insert into public.community_stories(id,owner_id,check_in_id,venue_id,city_id,kind,public_opt_in,status) values($1,$2,$3,$4,$5,'venue',true,'approved')",
    [uid(502), uid(502), uid(502), uid(20), uid(10)],
  );
  await db.query(
    "insert into public.community_story_reports(story_id,reporter_id,reason) values($1,$2,'privacy')",
    [uid(502), uid(1)],
  );
  await db.query("delete from public.check_ins where id=$1", [uid(502)]);
  await actor(null);
  expect(await call("media", { id: uid(502) })).toBeNull();
  const cleanup = await db.query<{ owner_id: string }>(
    "select owner_id from public.community_story_media_cleanup where story_id=$1",
    [uid(502)],
  );
  expect(cleanup.rows[0].owner_id).toBe(uid(502));
  await actor(1);
  await expect(call("cleanup-complete", { id: uid(502) })).rejects.toThrow(
    "Not eligible",
  );
  await actor(502);
  expect(await call("cleanup-complete", { id: uid(502) })).toEqual({
    removed: true,
  });
});
it("exports all retained owner records with stable bounded pagination and explicit truncation", async () => {
  type Page = {
    section: string;
    items: { id: string; deletedAt: string | null; expiresAt: string }[];
    nextCursor: string | null;
    truncated: boolean;
  };
  await actor(1);
  const seen = new Set<string>();
  let after: string | null = null;
  for (let n = 0; n < 30; n++) {
    const page = (await call("export", {
      section: "stories",
      limit: 2,
      after,
    })) as unknown as Page;
    expect(page.items.length).toBeLessThanOrEqual(2);
    expect(page.truncated).toBe(page.nextCursor !== null);
    for (const item of page.items) {
      expect(seen.has(item.id)).toBe(false);
      seen.add(item.id);
    }
    if (!page.truncated) break;
    expect(page.nextCursor).toBe(page.items.at(-1)?.id);
    after = page.nextCursor;
  }
  const expected = await db.query<{ id: string }>(
    "select id from public.community_stories where owner_id=$1",
    [uid(1)],
  );
  expect([...seen].sort()).toEqual(expected.rows.map((row) => row.id).sort());
  expect(seen.size).toBeGreaterThan(2);
  await db.exec("select set_config('test.eligible','false',false)");
  try {
    const page = (await call("export", {
      section: "stories",
      limit: 100,
    })) as unknown as Page;
    expect(page.items.some((item) => item.deletedAt !== null)).toBe(true);
    expect(JSON.stringify(page)).not.toMatch(
      /moderated_by|owner_id|latitude|longitude|mediaUrl|storage/,
    );
  } finally {
    await db.exec("select set_config('test.eligible','true',false)");
  }
  await actor(2);
  const other = (await call("export", {
    section: "stories",
    limit: 100,
  })) as unknown as Page;
  expect(
    other.items.some((item) => new Date(item.expiresAt).getTime() < Date.now()),
  ).toBe(true);
  expect(other.items.every((item) => !seen.has(item.id))).toBe(true);
  for (const section of ["reports", "cleanup"]) {
    const page = (await call("export", {
      section,
      limit: 100,
    })) as unknown as Page;
    expect(page.section).toBe(section);
    expect(page.truncated).toBe(false);
    expect(page.nextCursor).toBeNull();
    expect(JSON.stringify(page)).not.toMatch(
      /caption|owner_id|reporter_id|mediaUrl|storage/,
    );
  }
  await expect(
    call("export", { section: "stories", limit: 101 }),
  ).rejects.toThrow("Invalid export page");
  await expect(call("export", { section: "unknown" })).rejects.toThrow(
    "Invalid export page",
  );
  await actor(null);
  await expect(call("export", { section: "stories" })).rejects.toThrow(
    "Account required",
  );
  await actor(999);
  await expect(call("export", { section: "stories" })).rejects.toThrow(
    "Account required",
  );
});
it("defaults database collection off independently of public read and owner withdrawal rights", async () => {
  await db.exec(
    "update public.community_story_settings set collection_enabled=false",
  );
  await actor(2);
  try {
    await expect(
      call("reserve", {
        checkInId: uid(300),
        kind: "venue",
        publicOptIn: "true",
      }),
    ).rejects.toThrow("Story collection unavailable");
    expect((await call("mine")).stories).toBeDefined();
    expect(
      (await call("export", { section: "stories" })) as unknown,
    ).toBeTruthy();
  } finally {
    await db.exec(
      "update public.community_story_settings set collection_enabled=true",
    );
  }
});

it("redacts staff review reasons and third-party free text from direct owner exports", async () => {
  await actor(1);
  await db.query(
    "update public.community_stories set moderation_reason=$1 where owner_id=$2",
    ["synthetic-third-party@example.invalid confidential report", uid(1)],
  );
  const exported = await call("export", { section: "stories", limit: 100 });
  expect(JSON.stringify(exported)).not.toMatch(
    /moderationReason|moderation_reason|synthetic-third-party|confidential report/,
  );
});
