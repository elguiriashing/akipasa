-- Bounded administrator queue for submitted or orphaned native properties.
begin;
create index accommodation_native_review_scope on public.accommodation_properties(status,created_at,id) where status='pending' or orphaned_at is not null;
create function public.accommodation_property_review_page(p_limit integer default 101,p_offset integer default 0)
returns table(id uuid,name text,status text,revision_id uuid,city text,address text,description_es text,description_en text,orphaned boolean)
language plpgsql stable security definer set search_path='' as $$
begin
 if not accommodation_private.ready() or not public.account_features_allowed() or not exists(select 1 from public.profiles where profiles.id=auth.uid() and app_role='administrator') then raise exception 'Administrator required' using errcode='42501';end if;
 if p_limit is null or p_offset is null or p_limit not between 1 and 101 or p_offset not between 0 and 10000 then raise exception 'Invalid pagination';end if;
 return query select p.id,p.name,p.status,p.revision_id,p.city,p.address,p.description_es,p.description_en,p.owner_profile_id is null from public.accommodation_properties p where p.status='pending' or p.orphaned_at is not null order by p.created_at,p.id limit p_limit offset p_offset;
end $$;
revoke all on function public.accommodation_property_review_page(integer,integer) from public,anon;
grant execute on function public.accommodation_property_review_page(integer,integer) to authenticated;
create or replace function public.managed_accommodation_properties_page(p_limit integer default 101,p_offset integer default 0) returns table(id uuid,name text,status text,workspace_id text,legacy_venue_id uuid) language plpgsql stable security definer set search_path='' as $$
begin
 if not accommodation_private.ready() or auth.uid() is null or not public.account_features_allowed() then raise exception 'Account access required' using errcode='42501';end if;
 if p_limit is null or p_offset is null or p_limit not between 1 and 101 or p_offset not between 0 and 10000 then raise exception 'Invalid pagination';end if;
 return query select p.id,p.name,p.status,p.workspace_id,p.legacy_venue_id from public.accommodation_properties p where accommodation_private.property_access(p.id) order by p.id limit p_limit offset p_offset;
end $$;
create or replace function public.accommodation_property_team(p_property uuid,p_limit integer default 100,p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_members jsonb;
begin
 if not public.can_manage_accommodation_property(p_property) then raise exception 'Property membership required' using errcode='42501';end if;
 if p_limit is null or p_offset is null or p_limit not between 1 and 100 or p_offset not between 0 and 10000 then raise exception 'Invalid pagination';end if;
 select coalesce(jsonb_agg(to_jsonb(m)),'[]') into v_members from (select profile_id,role from public.accommodation_property_members where property_id=p_property order by profile_id limit p_limit offset p_offset)m;
 return jsonb_build_object('canManageTeam',accommodation_private.property_access(p_property,true),'ownerProfileId',(select owner_profile_id from public.accommodation_properties where id=p_property),'members',v_members,'total',(select count(*) from public.accommodation_property_members where property_id=p_property));
end $$;
notify pgrst,'reload schema';
commit;
