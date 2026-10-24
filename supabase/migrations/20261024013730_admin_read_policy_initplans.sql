-- Preserve administrator-only audit reads; evaluate the row-independent guard once.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '10s';
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public'
      and tablename='moderation_actions'
      and policyname='moderation_actions_operator_read'
      and cmd='SELECT' and roles=array['authenticated']::name[]
      and qual='has_platform_role(ARRAY[''administrator''::app_role])'
  ) then raise exception 'Unexpected moderation read policy; review before changing it'; end if;
end $$;
alter policy moderation_actions_operator_read on public.moderation_actions
  using ((select public.has_platform_role(array['administrator']::public.app_role[])));
create index if not exists moderation_actions_recent_idx
  on public.moderation_actions(created_at desc, id desc);
commit;
