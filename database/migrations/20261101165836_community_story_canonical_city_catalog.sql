begin;

-- Read-only canonical projection. No city/customer rows or original lifecycle
-- function are changed. Nearby aliases share a public story bucket; distant
-- homonyms remain separate. The deterministic DBSCAN order resolves borders.
create function public.community_story_city_groups(p_city_id uuid default null)
returns table(city_id uuid,canonical_id uuid)
language plpgsql stable security definer set search_path='' as $function$
begin
 return query
 with names as (
  select c.id,c.slug,public.venue_search_normalize(c.name_es) name_key,
   public.st_transform(c.center::public.geometry,3035) metric_center
  from public.cities c
  where c.center is not null and (p_city_id is null or
   public.venue_search_normalize(c.name_es)=(select public.venue_search_normalize(t.name_es) from public.cities t where t.id=p_city_id))
 ), clustered as (
  select n.*,public.st_clusterdbscan(n.metric_center,eps:=5000,minpoints:=1)
   over(partition by n.name_key order by n.id) cluster_id
  from names n
 )
 select n.id,first_value(n.id) over(partition by n.name_key,n.cluster_id order by
  case when public.venue_search_normalize(n.slug)=n.name_key then 0 else 1 end,
  length(n.slug),n.slug,n.id)
 from clustered n;
end $function$;
revoke all on function public.community_story_city_groups(uuid) from public,anon,authenticated,service_role;

create function public.community_story_city_catalog(p_area text default 'fuengirola')
returns jsonb language plpgsql stable security definer set search_path='' as $function$
declare result jsonb; area_key text; fallback public.geography;
begin
 if p_area is null or length(btrim(p_area))<1 or length(p_area)>100 or p_area~'[[:cntrl:]]' then
  raise exception 'Invalid public area' using errcode='22023';
 end if;
 area_key:=public.venue_search_normalize(p_area);
 fallback:=public.st_setsrid(public.st_makepoint(-4.625,36.539),4326)::public.geography;
 with groups as materialized (select * from public.community_story_city_groups(null)),
 canonical as materialized (
  select c.* from public.cities c where exists(select 1 from groups g where g.canonical_id=c.id)
 ), anchors as (
  select representative.center,representative.slug,representative.id,
   case when lower(c.slug)=lower(btrim(p_area)) then 0
    when public.venue_search_normalize(c.name_es)=area_key then 1 else 2 end priority
  from public.cities c join groups g on g.city_id=c.id
  join public.cities representative on representative.id=g.canonical_id
  where lower(c.slug)=lower(btrim(p_area)) or public.venue_search_normalize(c.name_es)=area_key
   or public.venue_search_normalize(c.name_es)='fuengirola'
  union all select fallback,'',null::uuid,3
 ), origin as (
  select a.center from anchors a
  order by a.priority,public.st_distance(a.center,fallback),length(a.slug),a.slug,a.id limit 1
 ), counts as (
  -- Exactly the original public cities-count filters, aggregated over aliases.
  select g.canonical_id,count(*) approved_count
  from groups g join public.community_stories s on s.city_id=g.city_id
  join public.venues v on v.id=s.venue_id
  where s.status='approved' and s.public_opt_in and s.deleted_at is null
   and s.expires_at>now() and s.created_at>now()-interval '24 hours'
   and v.status='published' and v.verified
  group by g.canonical_id
 ), nearby as (
  select c.id,c.slug,c.name_es,c.name_en,c.center,coalesce(k.approved_count,0) approved_count,
   public.st_distance(c.center,(select center from origin)) distance_from_area
  from canonical c left join counts k on k.canonical_id=c.id
  order by distance_from_area,c.slug,c.id limit 200
 )
 select coalesce(jsonb_agg(jsonb_build_object('id',n.id,'slug',n.slug,
  'nameEs',n.name_es,'nameEn',n.name_en,
  'latitude',public.st_y(n.center::public.geometry),
  'longitude',public.st_x(n.center::public.geometry),
  'approvedStories24h',n.approved_count)
  order by n.distance_from_area,n.slug,n.id),'[]'::jsonb)
 into result from nearby n;
 return jsonb_build_object('cities',result,'available',true);
end $function$;
revoke all on function public.community_story_city_catalog(text) from public,anon,authenticated,service_role;
grant execute on function public.community_story_city_catalog(text) to anon,authenticated;

create function public.community_story_city_feed(p_city text)
returns jsonb language plpgsql stable security definer set search_path='' as $function$
declare target uuid; members uuid[]; alias_slug text; current_feed jsonb;
 combined jsonb:='[]'::jsonb; result jsonb;
begin
 if p_city is null or length(p_city)<1 or length(p_city)>100 or p_city!~'^[a-z0-9][a-z0-9-]*$' then
  raise exception 'Invalid public city' using errcode='22023';
 end if;
 select c.id into target from public.cities c where c.slug=p_city;
 if target is null then
  return jsonb_build_object('stories','[]'::jsonb,'nextCursor',null,'available',true);
 end if;
 with groups as materialized (select * from public.community_story_city_groups(target))
 select array_agg(g.city_id order by g.city_id) into members from groups g
 where g.canonical_id=(select own.canonical_id from groups own where own.city_id=target);
 if coalesce(array_length(members,1),0)>64 then
  raise exception 'Public city group exceeds reader limit' using errcode='54000';
 end if;
 -- Delegate every authorization/visibility decision to the unchanged public feed.
 for alias_slug in select c.slug from public.cities c where c.id=any(members) order by c.id loop
  current_feed:=public.community_stories_api('feed',jsonb_build_object('city',alias_slug));
  if current_feed->'available' is distinct from 'true'::jsonb or jsonb_typeof(current_feed->'stories') is distinct from 'array' then
   raise exception 'Public city feed unavailable' using errcode='P0002';
  end if;
  combined:=combined||(current_feed->'stories');
 end loop;
 with unique_stories as (
  select distinct on (story->>'id') story from jsonb_array_elements(combined) story
  order by story->>'id',(story->>'createdAt')::timestamptz desc
 ), recent as (
  select jsonb_set(s.story,'{citySlug}',to_jsonb(p_city),false) story
  from unique_stories s
  order by (s.story->>'createdAt')::timestamptz desc,s.story->>'id' desc limit 50
 )
 select coalesce(jsonb_agg(r.story order by (r.story->>'createdAt')::timestamptz desc,r.story->>'id' desc),'[]'::jsonb)
 into result from recent r;
 return jsonb_build_object('stories',result,'nextCursor',null,'available',true);
end $function$;
revoke all on function public.community_story_city_feed(text) from public,anon,authenticated,service_role;
grant execute on function public.community_story_city_feed(text) to anon,authenticated;

comment on function public.community_story_city_catalog(text) is 'Read-only bounded geographically selected canonical-city projection; counts are approved public photos, not crowd estimates.';
comment on function public.community_story_city_feed(text) is 'Read-only alias-aware merge of unchanged public Story feeds; only citySlug is rewritten to requested alias.';
comment on function public.community_story_city_groups(uuid) is 'Owner-only read helper: normalized Spanish name plus deterministic5km PostGIS3035 clusters, not a write/merge of cities.';
commit;
