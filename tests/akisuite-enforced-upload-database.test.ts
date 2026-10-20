import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import {
  premiumDatabase,
  suiteOwner,
  suiteOther,
  suiteVenue,
  suiteVenueTwo,
  suiteEvent,
} from "./fixtures/akisuite-premium-sql";
let db: PGlite;
const sha = "a".repeat(64);
async function role(value: string, id = suiteOwner) {
  await db.exec("reset role");
  await db.query("select set_config('test.uid',$1,false)", [id]);
  await db.exec(`set role ${value}`);
}
async function reserve(width = 1920, event: string | null = null) {
  return (
    await db.query<{ value: { id: string; path: string } }>(
      "select public.reserve_listing_upload($1,$2,$3,$4,$5,$6,$7) as value",
      [suiteVenue, sha, "image/jpeg", 100, width, 1080, event],
    )
  ).rows[0].value;
}
async function object(receipt: { id: string; path: string }, digest = sha) {
  await role("service_role");
  await db.query(
    "insert into storage.objects(bucket_id,name,metadata,user_metadata) values($1,$2,$3,$4)",
    [
      "event-media",
      receipt.path,
      { size: 100, mimetype: "image/jpeg" },
      { listing_upload_id: receipt.id, sha256: digest },
    ],
  );
}
beforeEach(async () => {
  db = await premiumDatabase(false);
  await db.exec(`alter table storage.objects add column user_metadata jsonb; grant usage on schema storage to service_role; grant all on storage.objects to service_role;
 alter table venue_media enable row level security; grant select,insert,update,delete on venue_media to authenticated;
 create policy fixture_media_member on venue_media to authenticated using(public.is_venue_member(venue_id)) with check(public.is_venue_member(venue_id));`);
  await db.exec(
    readFileSync(
      "database/migrations/20261020170415_listing_entitlement_limits.sql",
      "utf8",
    ),
  );
  const sql = readFileSync(
    "database/migrations/20261020173552_enforced_listing_uploads.sql",
    "utf8",
  );
  try {
    await db.exec(sql);
  } catch (error) {
    const e = error as {
      message: string;
      position?: string;
      internalPosition?: string;
      internalQuery?: string;
    };
    const source = e.internalQuery || sql;
    const at = Number(e.internalPosition || e.position || 0);
    throw new Error(
      `${e.message} at ${at}: ${source.slice(Math.max(0, at - 250), at + 250)}`,
    );
  }
  await db.exec(
    "update akisuite_listing_private.launch_settings set enabled=true",
  );
}, 30000);
afterEach(async () => {
  await db?.close();
});
describe("reserved server upload boundary", () => {
  it("preserves existing authenticated upload while strict gate is closed, then denies direct insert/update", async () => {
    await role("authenticated");
    await db.query(
      "insert into storage.objects(bucket_id,name,metadata) values('event-media',$1,'{\"size\":100}')",
      [`${suiteVenue}/existing.jpg`],
    );
    await db.exec(
      "reset role;update akisuite_listing_private.launch_settings set uploads_enforced=true",
    );
    await role("authenticated");
    await expect(
      db.query(
        "insert into storage.objects(bucket_id,name,metadata) values('event-media',$1,'{\"size\":100}')",
        [`${suiteVenue}/forged.jpg`],
      ),
    ).rejects.toThrow("row-level security");
    expect(
      (
        await db.query(
          "update storage.objects set metadata=metadata returning name",
        )
      ).rows,
    ).toEqual([]);
    expect(
      (await db.query("select name from storage.objects")).rows,
    ).toHaveLength(1);
    await db.query("delete from storage.objects where name=$1", [
      `${suiteVenue}/existing.jpg`,
    ]);
    expect(
      (await db.query("select name from storage.objects")).rows,
    ).toHaveLength(0);
  });
  it("reserves only an authorized listing/event and enforces free dimensions before Storage", async () => {
    await db.exec(
      "update akisuite_listing_private.launch_settings set uploads_enforced=true",
    );
    await role("authenticated");
    await expect(reserve(1921)).rejects.toThrow("resolution");
    const receipt = await reserve(1920, suiteEvent);
    expect(receipt.path).toContain(`${suiteVenue}/events/${suiteEvent}/`);
    await role("authenticated", suiteOther);
    await expect(reserve()).rejects.toThrow("membership");
    await role("authenticated");
    await expect(
      reserve(1920, "30000000-0000-4000-8000-000000000009"),
    ).rejects.toThrow("mismatch");
  });
  it("counts pending reservations under the quota lock and expires slots without deleting existing media", async () => {
    await db.exec(
      "update akisuite_listing_private.launch_settings set uploads_enforced=true",
    );
    await role("authenticated");
    const receipts = [];
    for (let i = 0; i < 8; i++) receipts.push(await reserve());
    await expect(reserve()).rejects.toThrow("allowance");
    await db.exec(
      "reset role;update akisuite_listing_private.upload_reservations set expires_at=now()-interval '1 second' where id='" +
        receipts[0].id +
        "'",
    );
    await role("authenticated");
    await expect(reserve()).resolves.toBeTruthy();
  });
  it("rejects forged owner receipts and wrong byte evidence; valid service receipt is consumed once", async () => {
    await db.exec(
      "update akisuite_listing_private.launch_settings set uploads_enforced=true",
    );
    await role("authenticated");
    const r = await reserve();
    await expect(
      db.query("select public.complete_listing_upload($1,$2)", [r.id, sha]),
    ).rejects.toThrow("permission denied");
    await object(r, "b".repeat(64));
    await expect(
      db.query("select public.complete_listing_upload($1,$2)", [r.id, sha]),
    ).rejects.toThrow("mismatch");
    await role("postgres");
    await db.query(
      "update storage.objects set user_metadata=$1 where name=$2",
      [{ listing_upload_id: r.id, sha256: sha }, r.path],
    );
    await role("service_role");
    expect(
      (
        await db.query(
          "select public.complete_listing_upload($1,$2) as verified",
          [r.id, sha],
        )
      ).rows[0],
    ).toEqual({ verified: true });
    await role("authenticated");
    await db.query(
      "insert into venue_media(id,venue_id,storage_path,size_bytes,mime_type) values($1,$2,$3,999,$4)",
      ["50000000-0000-4000-8000-000000000001", suiteVenue, r.path, "image/png"],
    );
    expect(
      (await db.query("select size_bytes,mime_type from venue_media")).rows[0],
    ).toEqual({ size_bytes: 100, mime_type: "image/jpeg" });
    await expect(
      db.query(
        "insert into venue_media(id,venue_id,storage_path) values($1,$2,$3)",
        ["50000000-0000-4000-8000-000000000002", suiteVenue, r.path],
      ),
    ).rejects.toThrow("receipt");
    await role("service_role");
    expect(
      (
        await db.query("select public.cancel_listing_upload($1) as removed", [
          r.id,
        ])
      ).rows[0],
    ).toEqual({ removed: false });
  });
  it("denies membership revoked before verification and downgrade above current resolution", async () => {
    await db.exec(
      `update akisuite_listing_private.launch_settings set uploads_enforced=true;insert into billing_subscriptions values('${suiteOwner}','business','active','2040-01-01')`,
    );
    await role("authenticated");
    const r = await reserve(3840);
    await object(r);
    await db.query("select public.complete_listing_upload($1,$2)", [r.id, sha]);
    await role("postgres");
    await db.exec("update billing_subscriptions set status='canceled'");
    await role("authenticated");
    await expect(
      db.query(
        "insert into venue_media(id,venue_id,storage_path) values($1,$2,$3)",
        ["50000000-0000-4000-8000-000000000001", suiteVenue, r.path],
      ),
    ).rejects.toThrow("resolution");
    await role("postgres");
    await db.exec(
      `delete from venue_members where profile_id='${suiteOwner}' and venue_id='${suiteVenue}'`,
    );
    await role("service_role");
    await expect(
      db.query("select public.complete_listing_upload($1,$2)", [r.id, sha]),
    ).rejects.toThrow("Membership revoked");
  });
  it("cannot consume another actor reservation or move a verified image across listings", async () => {
    await db.exec(
      `update akisuite_listing_private.launch_settings set uploads_enforced=true;insert into venue_members values('${suiteVenue}','${suiteOther}','editor')`,
    );
    await role("authenticated");
    const r = await reserve();
    await object(r);
    await db.query("select public.complete_listing_upload($1,$2)", [r.id, sha]);
    await role("authenticated", suiteOther);
    await expect(
      db.query(
        "insert into venue_media(id,venue_id,storage_path) values($1,$2,$3)",
        ["50000000-0000-4000-8000-000000000001", suiteVenue, r.path],
      ),
    ).rejects.toThrow("receipt");
    await role("authenticated");
    await db.query(
      "insert into venue_media(id,venue_id,storage_path) values($1,$2,$3)",
      ["50000000-0000-4000-8000-000000000001", suiteVenue, r.path],
    );
    await expect(
      db.query("update venue_media set venue_id=$1", [suiteVenueTwo]),
    ).rejects.toThrow("immutable");
  });
});
