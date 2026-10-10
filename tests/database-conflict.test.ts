import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";

it("preserves authorization and valid writes while returning finite conflicts", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role authenticated;
      create schema akihq_security;
      create table public.conflict_test (revision integer not null);
      insert into public.conflict_test values (1);
      create function public.save_venue_catalogue(uuid,integer,jsonb,boolean default false)
      returns jsonb language plpgsql security definer set search_path='' as $$
      begin
        if $1 is null then raise exception 'Venue editor required' using errcode='42501'; end if;
        if $2 <> (select revision from public.conflict_test) then
          raise exception 'Catalogue changed. Reload before saving.' using errcode='40001';
        end if;
        update public.conflict_test set revision=revision+1;
        return $3;
      end $$;
      revoke all on function public.save_venue_catalogue(uuid,integer,jsonb,boolean) from public;
      grant execute on function public.save_venue_catalogue(uuid,integer,jsonb,boolean) to authenticated;
      create function akihq_security.write_workspace_snapshot(text,jsonb,timestamptz)
      returns void language plpgsql as $$ begin
        raise exception 'Workspace changed' using errcode = '40001';
      end $$;
    `);
    const attributes =
      "select proacl::text, prosecdef, proconfig from pg_proc where oid='public.save_venue_catalogue(uuid,integer,jsonb,boolean)'::regprocedure";
    const before = await db.query(attributes);
    const migration = readFileSync(
      new URL(
        "../supabase/migrations/20261010030000_stop_application_conflict_retries.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(migration);
    await db.exec(migration);
    expect((await db.query(attributes)).rows).toEqual(before.rows);
    await expect(
      db.query(
        "select public.save_venue_catalogue('00000000-0000-4000-8000-000000000001',0,'{}')",
      ),
    ).rejects.toMatchObject({ code: "PT409" });
    await expect(
      db.query("select public.save_venue_catalogue(null,1,'{}')"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      db.query(
        "select akihq_security.write_workspace_snapshot('test','{}',null)",
      ),
    ).rejects.toMatchObject({ code: "PT409" });
    expect(
      (await db.query("select revision from public.conflict_test")).rows,
    ).toEqual([{ revision: 1 }]);
    await db.query(
      "select public.save_venue_catalogue('00000000-0000-4000-8000-000000000001',1,'{}')",
    );
    expect(
      (await db.query("select revision from public.conflict_test")).rows,
    ).toEqual([{ revision: 2 }]);
  } finally {
    await db.close();
  }
}, 30000);
