-- AkiPals 2.0 identity studio. Additive, independent of deprecated game state.
-- Apply only after review and approval. No account, game-save or entitlement reset.
create table if not exists public.pals_avatar_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  appearance jsonb not null,
  updated_at timestamptz not null default now(),
  constraint pals_avatar_appearance_object check (jsonb_typeof(appearance) = 'object'),
  constraint pals_avatar_appearance_size check (octet_length(appearance::text) <= 4096)
);

alter table public.pals_avatar_profiles enable row level security;
revoke all on public.pals_avatar_profiles from public, anon, authenticated;
grant select, insert, update on public.pals_avatar_profiles to authenticated;
grant select, insert, update, delete on public.pals_avatar_profiles to service_role;

-- This migration was installed through the managed connector for the
-- restricted playtest. Policies are conditional so a subsequent repository
-- migration reconciliation can be replayed without broadening any access.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'pals_avatar_profiles'
      and policyname = 'pals_avatar_owner_read'
  ) then
    create policy pals_avatar_owner_read on public.pals_avatar_profiles
      for select to authenticated using (user_id = (select auth.uid()));
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'pals_avatar_profiles'
      and policyname = 'pals_avatar_owner_insert'
  ) then
    create policy pals_avatar_owner_insert on public.pals_avatar_profiles
      for insert to authenticated with check (user_id = (select auth.uid()));
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'pals_avatar_profiles'
      and policyname = 'pals_avatar_owner_update'
  ) then
    create policy pals_avatar_owner_update on public.pals_avatar_profiles
      for update to authenticated using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()));
  end if;
end
$$;

comment on table public.pals_avatar_profiles is
  'Private self-designed AkiPals avatar appearance only; no coordinates, facial recognition, public identity sharing or payment entitlements.';
