-- Explicit one-time attachment, without granting arbitrary venue_id UPDATE.
-- No existing rental, venue, membership, media or booking rows are rewritten.
create or replace function public.link_owned_rental_company_venue(
  p_company uuid,
  p_venue uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  linked uuid;
begin
  if actor is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if not public.is_venue_member(p_venue, array['owner','manager']::public.venue_member_role[]) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  -- Serialize competing companies for one venue, then lock the owned company.
  perform 1 from public.venues where id = p_venue
    and discovery_vertical is distinct from 'accommodation' for update;
  if not found then
    raise exception 'venue unavailable' using errcode = '42501';
  end if;
  select venue_id into linked from public.car_rental_companies
    where id = p_company and submitted_by = actor for update;
  if not found then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if linked = p_venue then return p_company; end if;
  if linked is not null or exists (
    select 1 from public.car_rental_companies where venue_id = p_venue
  ) then
    raise exception 'company or venue already linked' using errcode = 'PT409';
  end if;
  update public.car_rental_companies set venue_id = p_venue where id = p_company;
  return p_company;
end;
$$;
revoke all on function public.link_owned_rental_company_venue(uuid,uuid) from public, anon;
grant execute on function public.link_owned_rental_company_venue(uuid,uuid) to authenticated;
