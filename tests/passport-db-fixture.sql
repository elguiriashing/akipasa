
create role anon; create role authenticated; create role service_role;
create schema auth; create schema private;
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create type public.app_role as enum('consumer','organiser','moderator','administrator');
create table auth.users(id uuid primary key,email text);
create table public.profiles(id uuid primary key,display_name text,app_role public.app_role);
create function public.has_platform_role(roles public.app_role[]) returns boolean language sql security definer as $$select exists(select 1 from public.profiles where id=auth.uid() and app_role=any(roles))$$;
create table public.cities(id uuid primary key,name_es text,name_en text,slug text,timezone text);
create table public.venues(id uuid primary key,city_id uuid references public.cities(id),status text,verified boolean,location text,name text,slug text);
create table public.check_ins(id uuid primary key,profile_id uuid references public.profiles(id),venue_id uuid references public.venues(id),state text,created_at timestamptz default now());
create table public.xp_ledger(profile_id uuid,delta integer,check_in_id uuid);
create table public.venue_checkin_credentials(id uuid primary key,venue_id uuid,active boolean);
create table public.moderation_actions(actor_id uuid,action text,target_type text,target_id uuid,reason text,metadata jsonb);
