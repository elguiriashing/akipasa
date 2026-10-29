begin;

-- Reproduce the existing own-profile editor contract in fresh source replays.
-- Read-only production metadata on 2026-10-29 confirmed every listed column
-- already permits authenticated UPDATE; anon permits none and app_role is denied.
-- 0069 added these editable columns after 0033 restricted UPDATE to name/locale.
-- Do not grant table UPDATE or change any row/role/terms/onboarding policy.
set local search_path = public, pg_catalog;

do $profile_edit_guard$
begin
  if not exists (
    select 1 from pg_class
    where oid = 'public.profiles'::regclass and relrowsecurity
  ) then
    raise exception 'Profile edit grants require enabled row-level security';
  end if;
  if not exists (
    select 1 from pg_policy
    where polrelid = 'public.profiles'::regclass
      and polname = 'profiles_update_self' and polcmd = 'w'
      and polpermissive and polroles = array[0::oid]
      and pg_get_expr(polqual, polrelid) = '(id = auth.uid())'
      and pg_get_expr(polwithcheck, polrelid) =
        '((id = auth.uid()) AND (app_role = current_app_role()))'
  ) then
    raise exception 'Profile edit grants require the canonical owner and role policy';
  end if;
  if (select count(*) from pg_policy
      where polrelid = 'public.profiles'::regclass and polcmd in ('w', '*')) <> 1 then
    raise exception 'Additional profile mutation policies require explicit review';
  end if;
  if has_table_privilege('authenticated', 'public.profiles', 'UPDATE')
     or has_any_column_privilege('anon', 'public.profiles', 'UPDATE') then
    raise exception 'Unexpected broad profile privileges require explicit review';
  end if;
end
$profile_edit_guard$;

grant update (
  username, avatar_url, banner_url, bio, public_email, phone,
  website_url, instagram_url, locality, province, birth_year, gender,
  profile_visibility, contact_visibility, attendance_visibility
) on table public.profiles to authenticated;

-- No ID, role, terms, onboarding, billing or private-schema privilege is added.
commit;
