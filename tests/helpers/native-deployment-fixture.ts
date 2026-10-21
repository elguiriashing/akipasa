import { PGlite } from "@electric-sql/pglite";
export const nativeOwner = "11111111-1111-4111-8111-111111111111";
export async function nativeDeploymentFixture(hostile = true) {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage; create schema account_private;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated,service_role;
    create table public.profiles(id uuid primary key,app_role text);
    create table public.venues(id uuid primary key);
    create table public.crm_workspaces(id text primary key,owner_profile_id uuid,status text);
    create table public.crm_workspace_members(workspace_id text,profile_id uuid,status text,role text);
    create table account_private.onboarding(profile_id uuid,status text);
    create function public.account_features_allowed() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid())$$;
    revoke all on function public.account_features_allowed() from public,anon;
    grant execute on function public.account_features_allowed() to authenticated,service_role;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(bucket_id text references storage.buckets(id),name text,metadata jsonb,user_metadata jsonb,primary key(bucket_id,name));
    alter table storage.objects enable row level security;
    alter table storage.buckets enable row level security;
    grant usage on schema storage to anon,authenticated,service_role;
    grant all on storage.objects,storage.buckets to anon,authenticated,service_role;
    create policy hostile_existing_storage_policy on storage.objects to anon,authenticated using(true) with check(true);
    insert into storage.buckets values('legacy-media','legacy-media',false,123,array['image/png']);
    insert into storage.objects values('legacy-media','keep.png','{"size":12}','{}');
    insert into profiles values('${nativeOwner}','administrator');
    create schema accommodation_private;
    create table accommodation_private.legacy_settings(value text);
    insert into accommodation_private.legacy_settings values('retained');
    create function accommodation_private.legacy_helper() returns text language sql security definer set search_path='' as $$select value from accommodation_private.legacy_settings$$;
    revoke all on schema accommodation_private from public,anon,authenticated;
    grant usage on schema accommodation_private to service_role;
    revoke all on function accommodation_private.legacy_helper() from public,anon,authenticated;
    grant execute on function accommodation_private.legacy_helper() to service_role;
    grant select on accommodation_private.legacy_settings to service_role;
    create table public.accommodation_reservations(legacy_id text primary key);
    insert into accommodation_reservations values('retained-booking');
    select set_config('test.uid','${nativeOwner}',false);
  `);
  if (hostile)
    await db.exec(`
    alter default privileges grant all on tables to public,anon,authenticated,service_role;
    alter default privileges grant execute on functions to anon,authenticated,service_role;
    alter default privileges grant usage on schemas to public,anon,authenticated,service_role;
  `);
  return db;
}
