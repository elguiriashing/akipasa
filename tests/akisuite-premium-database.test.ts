import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  premiumDatabase,
  grantPremium,
  suiteOwner,
  suiteOther,
  suiteVenue,
  suiteVenueTwo,
  suiteEvent,
} from "./fixtures/akisuite-premium-sql";
let db: PGlite;
async function scalar(sql: string) {
  return (await db.query<{ value: unknown }>(sql)).rows[0]?.value;
}
beforeAll(async () => {
  db = await premiumDatabase();
}, 30000);
afterAll(async () => {
  await db?.close();
});

describe("Premium SQL functionality and downgrade retention", () => {
  it("keeps launch closed after migration", async () => {
    expect(await scalar("select public.akisuite_launch_ready() as value")).toBe(
      false,
    );
  });
  it("requires venue Premium for advanced reporting and recurrence", async () => {
    await expect(
      db.query(`select public.akisuite_growth_report('${suiteVenue}')`),
    ).rejects.toThrow("Premium required");
    await expect(
      db.query(
        `select public.set_owned_event_recurrence_v2('${suiteEvent}','2030-03-24 20:00','2030-03-24 22:00','weekly',1,2)`,
      ),
    ).rejects.toThrow("Premium required");
  });
  it("supports atomic DST-aware recurrence, exceptions and timezone changes", async () => {
    await grantPremium(db, "akibusiness_premium");
    await db.exec("update akisuite_private.launch_settings set enabled=true");
    expect(
      await scalar(
        `select public.set_owned_event_recurrence_v2('${suiteEvent}','2030-03-24 20:00','2030-03-24 22:00','weekly',1,3,'Europe/Madrid',array['2030-04-07'::date]) as value`,
      ),
    ).toBe(2);
    const rows = await db.query<{ hour: number }>(
      `select extract(hour from starts_at at time zone 'UTC') as hour from event_occurrences order by starts_at`,
    );
    expect(rows.rows.map((r) => Number(r.hour))).toEqual([19, 18]);
    expect(
      await scalar(
        `select public.set_owned_event_recurrence_v2('${suiteEvent}','2030-03-24 20:00','2030-03-24 22:00','weekly',1,3,'Europe/Madrid',array['2030-04-07'::date]) as value`,
      ),
    ).toBe(0);
    await db.query(
      `select public.set_owned_event_recurrence_v2('${suiteEvent}','2030-03-24 20:00','2030-03-24 22:00','weekly',1,3,'Europe/London',array['2030-04-07'::date])`,
    );
    expect(
      Number(await scalar("select count(*) as value from event_occurrences")),
    ).toBe(2);
  });
  it("rejects nonexistent spring times without partial recurrence writes", async () => {
    await expect(
      db.query(
        `select public.set_owned_event_recurrence_v2('${suiteEvent}','2030-03-24 02:30','2030-03-24 03:30','weekly',1,2,'Europe/Madrid')`,
      ),
    ).rejects.toThrow("Nonexistent local time");
    expect(
      Number(await scalar("select count(*) as value from event_occurrences")),
    ).toBe(2);
  });
  it("does not recreate cancelled individual dates", async () => {
    await db.exec("update event_occurrences set status='cancelled'");
    await db.query(
      `select public.set_owned_event_recurrence_v2('${suiteEvent}','2030-03-24 20:00','2030-03-24 22:00','weekly',1,2,'Europe/Madrid')`,
    );
    expect(
      Number(
        await scalar(
          "select count(*) as value from event_occurrences where status='scheduled'",
        ),
      ),
    ).toBe(0);
  });
  it("saves a reusable template snapshot and creates an unpublished draft", async () => {
    const template = await scalar(
      `select public.save_akisuite_event_template('${suiteEvent}','Poetry night') as value`,
    );
    await db.exec(
      `update events set title_es='Changed original' where id='${suiteEvent}'`,
    );
    const created = await scalar(
      `select public.create_akisuite_event_from_template('${template}','${suiteVenueTwo}','reused-poetry') as value`,
    );
    const row = (
      await db.query(
        `select title_es,status,venue_id from events where id='${created}'`,
      )
    ).rows[0];
    expect(row).toMatchObject({
      title_es: "Poesía en Málaga",
      status: "draft",
      venue_id: suiteVenueTwo,
    });
  });
  it("reports real current/prior interactions and rejects another tenant", async () => {
    await db.exec(
      `insert into analytics_events(venue_id,occurred_at) values('${suiteVenue}',now()-interval '1 day'),('${suiteVenue}',now()-interval '40 days')`,
    );
    expect(
      await scalar(
        `select public.akisuite_growth_report('${suiteVenue}') as value`,
      ),
    ).toMatchObject({ current: 1, previous: 1 });
    await db.exec(`select set_config('test.uid','${suiteOther}',false)`);
    await expect(
      db.query(`select public.akisuite_growth_report('${suiteVenue}')`),
    ).rejects.toThrow("Premium required");
    await db.exec(`select set_config('test.uid','${suiteOwner}',false)`);
  });
  it("runs approved scheduled publication and blocks changed content or a downgrade", async () => {
    await db.exec(
      `update events set status='published' where id='${suiteEvent}'`,
    );
    await db.query(
      `select public.schedule_akisuite_event('${suiteEvent}',now()+interval '1 hour')`,
    );
    expect(
      await scalar(
        `select status as value from events where id='${suiteEvent}'`,
      ),
    ).toBe("draft");
    await db.exec(
      "update akisuite_event_publication_schedules set publish_at=now()-interval '1 minute'",
    );
    expect(
      await scalar("select public.publish_due_akisuite_events() as value"),
    ).toBe(1);
    await db.query(
      `select public.schedule_akisuite_event('${suiteEvent}',now()+interval '1 hour')`,
    );
    await db.exec(
      `update events set description_en='Changed content' where id='${suiteEvent}'; update akisuite_event_publication_schedules set publish_at=now()-interval '1 minute'`,
    );
    expect(
      await scalar("select public.publish_due_akisuite_events() as value"),
    ).toBe(0);
    expect(
      await scalar(
        "select blocked_reason as value from akisuite_event_publication_schedules",
      ),
    ).toBe("content_changed");
    await db.exec(
      `update events set status='published' where id='${suiteEvent}'`,
    );
    await db.query(
      `select public.schedule_akisuite_event('${suiteEvent}',now()+interval '1 hour')`,
    );
    await db.query(
      `select public.cancel_akisuite_publication('${suiteEvent}')`,
    );
    expect(
      await scalar(
        "select state as value from akisuite_event_publication_schedules",
      ),
    ).toBe("cancelled");
    expect(
      await scalar(
        `select status as value from events where id='${suiteEvent}'`,
      ),
    ).toBe("draft");
  });
  it("grants HQ Standard/Pro to one workspace while retaining member role restrictions", async () => {
    await grantPremium(db, "akihq_standard", "sub_hq");
    expect(
      await scalar("select public.crm_has_tool('ws_one','crm') as value"),
    ).toBe(true);
    expect(
      await scalar("select public.crm_has_tool('ws_one','pos') as value"),
    ).toBe(false);
    await db.query(
      "select public.sync_akisuite_subscription('sub_hq',$1,'cus_owner','akihq_pro','month','active','2040-01-01',false,'2030-01-02','ws_one')",
      [suiteOwner],
    );
    expect(
      await scalar("select public.crm_has_tool('ws_one','pos') as value"),
    ).toBe(true);
    expect(
      await scalar("select public.crm_has_tool('ws_one','ai-team') as value"),
    ).toBe(false);
    expect(
      await scalar("select public.crm_has_tool('ws_two','pos') as value"),
    ).toBe(false);
  });
  it("enforces 15 shared images after downgrade without deleting existing files", async () => {
    await db.query(
      "select public.sync_akisuite_subscription('sub_premium',$1,'cus_owner','akibusiness_premium','month','canceled','2040-01-01',false,'2030-01-03','ws_one')",
      [suiteOwner],
    );
    for (let i = 0; i < 15; i++) {
      const venue = i % 2 ? suiteVenue : suiteVenueTwo;
      const path = `${venue}/${i}.jpg`;
      await db.query(
        "insert into storage.objects values('event-media',$1,'{\"size\":100}')",
        [path],
      );
      await db.query(
        "insert into venue_media(id,venue_id,storage_path,size_bytes) values(gen_random_uuid(),$1,$2,1)",
        [venue, path],
      );
    }
    await db.query(
      "insert into storage.objects values('event-media',$1,'{\"size\":100}')",
      [`${suiteVenue}/sixteenth.jpg`],
    );
    await expect(
      db.query(
        "insert into venue_media(id,venue_id,storage_path,size_bytes) values(gen_random_uuid(),$1,$2,1)",
        [suiteVenue, `${suiteVenue}/sixteenth.jpg`],
      ),
    ).rejects.toThrow("media allowance exceeded");
    expect(
      Number(await scalar("select count(*) as value from venue_media")),
    ).toBe(15);
    expect(
      Number(await scalar("select sum(size_bytes) as value from venue_media")),
    ).toBe(1500);
    expect(
      Number(await scalar("select count(*) as value from event_occurrences")),
    ).toBe(2);
    await db.exec("update venue_media set size_bytes=1");
    expect(
      Number(await scalar("select sum(size_bytes) as value from venue_media")),
    ).toBe(1500);
    await expect(
      db.query("update venue_media set storage_path='forged.jpg'"),
    ).rejects.toThrow("immutable");
    await expect(
      db.query(
        `select public.duplicate_owned_event('${suiteEvent}','forged-free-duplicate')`,
      ),
    ).rejects.toThrow("Premium required");
  });
});
