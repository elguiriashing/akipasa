-- Explicit private rental-branch attachment to an existing operating scope.
-- Depends on operating_organisations' verified-identity helper; no public row IDs added.
begin;
create table public.rental_operating_location_links (
  company_id uuid primary key references public.car_rental_companies(id) on delete restrict,
  workspace_id text not null references public.crm_workspaces(id) on delete restrict,
  attached_by uuid references public.profiles(id) on delete set null,
  attached_at timestamptz not null default now()
);
create index rental_operating_location_workspace on public.rental_operating_location_links(workspace_id,company_id);
alter table public.rental_operating_location_links enable row level security;
revoke all on public.rental_operating_location_links from public,anon,authenticated;
grant select on public.rental_operating_location_links to authenticated;

create function public.can_read_rental_operating_link(p_company uuid,p_workspace text) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.car_rental_companies c
    where c.id=p_company and operating_org_private.verified_actor() is not null
      and (c.submitted_by=operating_org_private.verified_actor() or exists(
        select 1 from public.car_rental_company_members m where m.company_id=c.id
          and m.profile_id=operating_org_private.verified_actor() and m.role='owner')))
    and exists(select 1 from public.crm_workspaces w join public.crm_workspace_members m on m.workspace_id=w.id
      where w.id=p_workspace and w.status in ('active','trial') and m.profile_id=operating_org_private.verified_actor() and m.status='active');
$$;
revoke all on function public.can_read_rental_operating_link(uuid,text) from public,anon;
grant execute on function public.can_read_rental_operating_link(uuid,text) to authenticated;
create policy rental_link_private_member_read on public.rental_operating_location_links
  for select to authenticated using(public.can_read_rental_operating_link(company_id,workspace_id));

create function public.attach_rental_operating_location(p_company uuid,p_workspace text) returns text
language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=operating_org_private.verified_actor(); v_submitter uuid; v_workspace text; v_previous text;
begin
  if v_actor is null then raise exception 'verified account required' using errcode='42501'; end if;
  select submitted_by into v_submitter from public.car_rental_companies where id=p_company for update;
  if not found then raise exception 'rental branch ownership required' using errcode='42501'; end if;
  if v_submitter is distinct from v_actor then
    perform 1 from public.car_rental_company_members where company_id=p_company and profile_id=v_actor and role='owner' for update;
    if not found then raise exception 'rental branch ownership required' using errcode='42501'; end if;
  end if;
  select w.id into v_workspace from public.crm_workspaces w join public.crm_workspace_members m on m.workspace_id=w.id
    where w.id=p_workspace and w.owner_profile_id=v_actor and w.status in ('active','trial')
      and m.profile_id=v_actor and m.status='active' and m.role='owner' for update of w,m;
  if v_workspace is null then raise exception 'explicit location ownership required' using errcode='42501'; end if;
  select workspace_id into v_previous from public.rental_operating_location_links where company_id=p_company;
  if found then
    if v_previous<>v_workspace then raise exception 'rental branch already belongs to another location' using errcode='PT409'; end if;
    return v_previous;
  end if;
  insert into public.rental_operating_location_links(company_id,workspace_id,attached_by) values(p_company,v_workspace,v_actor);
  return v_workspace;
end;
$$;
revoke all on function public.attach_rental_operating_location(uuid,text) from public,anon;
grant execute on function public.attach_rental_operating_location(uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;

