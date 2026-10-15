import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { it, expect } from "vitest";
const sql = (name: string) =>
  readFileSync(
    new URL("../supabase/migrations/" + name, import.meta.url),
    "utf8",
  );
const owner = "11111111-1111-4111-8111-111111111111",
  renter = "22222222-2222-4222-8222-222222222222",
  other = "33333333-3333-4333-8333-333333333333",
  branch = "44444444-4444-4444-8444-444444444444",
  venue = "55555555-5555-4555-8555-555555555555",
  vehicle = "66666666-6666-4666-8666-666666666666";
it("separates branches, keeps manager access, enforces contacts and queues both-party lifecycle email exactly once", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema storage;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create type public.app_role as enum('moderator','administrator');create type public.venue_member_role as enum('owner','manager','editor');
 create function public.has_platform_role(public.app_role[]) returns boolean language sql stable as $$select current_user='postgres' and auth.uid() is null$$;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,deleted_at timestamptz);create table public.profiles(id uuid primary key);
 create table public.venues(id uuid primary key,discovery_vertical text);create table public.venue_members(venue_id uuid,profile_id uuid,role public.venue_member_role);
 create function public.is_venue_member(target_venue uuid,allowed_roles public.venue_member_role[] default array['owner','manager','editor']::public.venue_member_role[]) returns boolean language sql stable as $$select exists(select 1 from public.venue_members where venue_id=target_venue and profile_id=auth.uid() and role=any(allowed_roles))$$;
 create table public.venue_media(id uuid primary key,venue_id uuid,storage_path text,alt_es text,alt_en text,size_bytes bigint);
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key,bucket_id text,name text);alter table storage.objects enable row level security;
 create table public.suite_email_outbox(id uuid default gen_random_uuid(),dedupe_key text unique,kind text,profile_id uuid,recipient text,locale text,payload jsonb,status text,last_error text);
 insert into auth.users values('${owner}','owner@example.test',now(),null),('${renter}','renter@example.test',now(),null),('${other}','other@example.test',now(),null);insert into profiles select id from auth.users;
 insert into venues values('${venue}','activities');insert into venue_members values('${venue}','${other}','manager');`);
    await db.exec(sql("20261014223000_akiconduzco_rentals.sql"));
    await db.exec(sql("20261015135805_akicoches_venue_workspace.sql"));
    await db.exec(sql("20261015163602_link_owned_rental_company_venue.sql"));
    await db.exec(
      `insert into car_rental_companies(id,name,slug,city,address,latitude,longitude,submitted_by,venue_id) values('${branch}','Fixture Branch','fixture-branch','Fuengirola','Calle Fixture',36.5,-4.6,'${owner}','${venue}');update car_rental_companies set status='published';insert into car_rental_vehicles(id,company_id,name,category,transmission,fuel,seats,luggage,daily_price_cents,deposit_cents,active) values('${vehicle}','${branch}','Fixture Car','economy','manual','petrol',5,2,5000,10000,true);`,
    );
    await db.exec(sql("20261015220302_independent_rental_branches.sql"));
    expect(
      (await db.query(`select venue_id from car_rental_companies`)).rows,
    ).toEqual([{ venue_id: null }]);
    await db.exec(`set request.jwt.claim.sub='${other}'`);
    expect(
      (
        await db.query(
          `select can_manage_rental_company('${branch}') as allowed`,
        )
      ).rows,
    ).toEqual([{ allowed: true }]);
    await db.exec(`delete from venue_members;`);
    expect(
      (
        await db.query(
          `select can_manage_rental_company('${branch}') as allowed`,
        )
      ).rows,
    ).toEqual([{ allowed: true }]);
    await db.exec(`set request.jwt.claim.sub='${renter}'`);
    const request = (phone: string, email = "renter@example.test") =>
      db.query<{ id: string }>(
        `select request_car_rental_booking('${vehicle}',current_date+1,current_date+3,'Fixture Renter','${email}','${phone}','Child seat please','77777777-7777-4777-8777-777777777777','en') as id`,
      );
    await expect(request("")).rejects.toThrow(/invalid contact/);
    await expect(
      request("+34 600 123 456", "other@example.test"),
    ).rejects.toThrow(/verified account/);
    const id = (await request("+34 600 123 456")).rows[0].id;
    expect((await request("+34 600 123 456")).rows[0].id).toBe(id);
    expect(
      (await db.query(`select count(*)::int as n from suite_email_outbox`))
        .rows,
    ).toEqual([{ n: 2 }]);
    await expect(
      db.exec(`select set_car_rental_booking_status('${id}','confirmed')`),
    ).rejects.toThrow(/only cancel/);
    await db.exec(
      `set request.jwt.claim.sub='${other}';select set_car_rental_booking_status('${id}','confirmed');`,
    );
    expect(
      (await db.query(`select count(*)::int as n from suite_email_outbox`))
        .rows,
    ).toEqual([{ n: 4 }]);
    expect(
      (
        await db.query(
          `select count(*)::int as n from car_rental_calendar_blocks where reason='booking'`,
        )
      ).rows,
    ).toEqual([{ n: 1 }]);
    await expect(
      db.exec(`select set_car_rental_booking_status('${id}','confirmed')`),
    ).rejects.toThrow();
    const summary = (
      await db.query<{ summary: { upcoming: number } }>(
        `select rental_branch_booking_summary('${branch}') as summary`,
      )
    ).rows[0].summary;
    expect(summary.upcoming).toBe(1);
    await db.exec(`set request.jwt.claim.sub='${renter}'`);
    await expect(
      db.exec(`select rental_branch_booking_summary('${branch}')`),
    ).rejects.toThrow(/not authorized/);
    expect(
      (
        await db.query(
          `select has_function_privilege('authenticated','public.link_owned_rental_company_venue(uuid,uuid)','execute') as link`,
        )
      ).rows,
    ).toEqual([{ link: false }]);
    await db.exec(
      `set request.jwt.claim.sub='${other}';grant usage on schema auth,storage to authenticated,anon;grant select on storage.objects to authenticated,anon;grant insert,delete on storage.objects to authenticated;set role authenticated;`,
    );
    const media = "88888888-8888-4888-8888-888888888888";
    await db.exec(
      `insert into car_rental_media(id,company_id,storage_path,alt) values('${media}','${branch}','${branch}/own.webp','Branch car');`,
    );
    await db.exec(
      `update car_rental_companies set name='Independent profile' where id='${branch}';`,
    );
    await expect(
      db.exec(
        `insert into car_rental_media(company_id,storage_bucket,storage_path) values('${branch}','event-media','unrelated/image.jpg')`,
      ),
    ).rejects.toThrow();
    await db.exec(
      `reset role;set request.jwt.claim.sub='${renter}';set role authenticated;`,
    );
    expect((await db.query(`select id from car_rental_media`)).rows).toEqual(
      [],
    );
    await expect(
      db.exec(
        `insert into car_rental_media(company_id,storage_path) values('${branch}','${branch}/foreign.webp')`,
      ),
    ).rejects.toThrow();
    await db.exec(
      `reset role;set request.jwt.claim.sub='${other}';set role authenticated;update car_rental_vehicles set rental_media_id='${media}' where id='${vehicle}';reset role;set request.jwt.claim.sub='';set role anon;`,
    );
    expect((await db.query(`select id from car_rental_media`)).rows).toEqual([
      { id: media },
    ]);
    await db.exec(`reset role;`);
  } finally {
    await db.close();
  }
}, 30000);
