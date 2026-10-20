begin;
-- Private, deny-all records. Public RPCs are invoker wrappers around guarded helpers.
create table private.prestige_settings (
 singleton boolean primary key default true check(singleton), enabled boolean not null default false,
 shipping_intake_enabled boolean not null default false, delivery_enabled boolean not null default false, address_purge_ready boolean not null default false,
 address_retention_days integer check(address_retention_days between 1 and 365)
);
insert into private.prestige_settings(singleton) values(true);
create table private.prestige_programmes (
 key text primary key check(key ~ '^[a-z][a-z0-9_]{2,63}$'),
 title_es text not null check(length(trim(title_es)) between 3 and 100),
 title_en text not null check(length(trim(title_en)) between 3 and 100),
 achievement_keys text[] not null check(cardinality(achievement_keys) between 1 and 1000),
 definition_snapshot jsonb not null,
 active boolean not null default false, physical_eligible boolean not null default false,
 created_by uuid not null, created_at timestamptz not null default now()
);
create table private.prestige_awards (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade,
 programme_key text not null references private.prestige_programmes(key),
 serial bigint generated always as identity unique, awarded_at timestamptz not null default now(),
 evidence jsonb not null, title_es text not null, title_en text not null,
 public_id uuid not null default gen_random_uuid() unique,
 public_alias text check(public_alias is null or length(trim(public_alias)) between 2 and 40),
 shared boolean not null default false, hall_of_fame boolean not null default false,
 revoked_at timestamptz, unique(profile_id,programme_key),
 check(not hall_of_fame or shared), check(not shared or public_alias is not null)
);
create index prestige_awards_member on private.prestige_awards(profile_id,awarded_at desc);
create index prestige_awards_public on private.prestige_awards(awarded_at desc,id) where hall_of_fame and revoked_at is null;
create table private.prestige_physical_requests (
 award_id uuid primary key references private.prestige_awards(id) on delete cascade,
 status text not null default 'requested' check(status in ('requested','reviewed','declined')),
 delivery_status text not null default 'disabled' check(delivery_status in ('disabled','awaiting_address','ready','preparing','shipped','delivered','cancelled')),
 tracking_reference text check(tracking_reference is null or length(trim(tracking_reference)) between 1 and 100),
 requested_at timestamptz not null default now(), reviewed_at timestamptz, reviewed_by uuid,
 review_note text check(review_note is null or length(review_note) between 3 and 500)
);
-- Strict-private shipping path: no direct browser or service-role table grants.
-- Intake and manual delivery-state controls remain closed until separately approved.
create table private.prestige_shipping_addresses (
 award_id uuid primary key references private.prestige_awards(id) on delete cascade,
 recipient_name text not null check(length(trim(recipient_name)) between 2 and 100),
 address_line1 text not null check(length(trim(address_line1)) between 3 and 200),
 address_line2 text check(address_line2 is null or length(address_line2)<=200),
 postal_code text not null check(length(trim(postal_code)) between 1 and 32),
 city text not null check(length(trim(city)) between 1 and 100),
 region text check(region is null or length(region)<=100),
 country_code text not null check(country_code ~ '^[A-Z]{2}$'),
 phone text check(phone is null or length(phone)<=40),
 submitted_at timestamptz not null default now(), delete_after timestamptz not null
);
create index prestige_shipping_retention on private.prestige_shipping_addresses(delete_after,award_id);
alter table private.prestige_shipping_addresses enable row level security;
revoke all on private.prestige_shipping_addresses from public,anon,authenticated,service_role;
create table private.prestige_audit (
 id bigint generated always as identity primary key, actor_id uuid references public.profiles(id) on delete set null,
 action text not null, award_id uuid, programme_key text, created_at timestamptz not null default now(), detail jsonb not null default '{}'
);
alter table private.prestige_settings enable row level security;
alter table private.prestige_programmes enable row level security;
alter table private.prestige_awards enable row level security;
alter table private.prestige_physical_requests enable row level security;
alter table private.prestige_audit enable row level security;
revoke all on private.prestige_settings,private.prestige_programmes,private.prestige_awards,private.prestige_physical_requests,private.prestige_audit from public,anon,authenticated,service_role;
revoke all on sequence private.prestige_awards_serial_seq,private.prestige_audit_id_seq from public,anon,authenticated,service_role;
create function private.prestige_definitions(p_keys text[]) returns jsonb language sql stable set search_path='' as $$
 select jsonb_agg(jsonb_build_object('key',key,'condition_type',condition_type,'target_count',target_count,'minimum_xp',minimum_xp,'city_key',city_key,'category_key',category_key) order by key)
 from public.achievements where key=any(p_keys) and active and not archived;
$$;
revoke all on function private.prestige_definitions(text[]) from public,anon,authenticated,service_role;
create function private.prestige_physical_qualifies(p_profile uuid,p_programme text) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from private.prestige_programmes p where p.key=p_programme and p.active and p.physical_eligible and p.definition_snapshot=private.prestige_definitions(p.achievement_keys)
 and not exists(select 1 from private.passport_test_accounts where profile_id=p_profile)
 and not exists(select 1 from unnest(p.achievement_keys) requirement(key) left join public.achievements a on a.key=requirement.key left join private.achievement_counts(p_profile) c on c.achievement_key=requirement.key where coalesce(c.current_count,0)<case when a.condition_type='xp' then a.minimum_xp else a.target_count end));
$$;
revoke all on function private.prestige_physical_qualifies(uuid,text) from public,anon,authenticated,service_role;
-- Browser roles cannot directly rewrite award evidence or financial/fulfilment state.
create function private.prestige_member(p_action text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare member uuid:=auth.uid(); v_programme private.prestige_programmes%rowtype; v_award private.prestige_awards%rowtype; proof jsonb; result jsonb; inserted integer; retention integer; features_allowed boolean;
begin
 if member is null then raise exception 'authentication required' using errcode='42501'; end if;
 if p_action='export' then
 return jsonb_build_object('awards',coalesce((select jsonb_agg(to_jsonb(a)-'profile_id' order by a.awarded_at,a.id) from private.prestige_awards a where a.profile_id=member),'[]'::jsonb),'shipping_addresses',coalesce((select jsonb_agg(to_jsonb(s) order by s.award_id) from private.prestige_shipping_addresses s join private.prestige_awards a on a.id=s.award_id where a.profile_id=member and s.delete_after>now()),'[]'::jsonb),'physical_requests',coalesce((select jsonb_agg(jsonb_build_object('award_id',r.award_id,'status',r.status,'requested_at',r.requested_at,'reviewed_at',r.reviewed_at,'delivery_status',r.delivery_status,'tracking_reference',r.tracking_reference) order by r.requested_at,r.award_id) from private.prestige_physical_requests r join private.prestige_awards a on a.id=r.award_id where a.profile_id=member),'[]'::jsonb));
 end if;
 -- Privacy read/deletion/withdrawal are usable after digital launch is closed.
 if p_action in ('shipping_read','shipping_delete','withdraw') then
 select * into v_award from private.prestige_awards where id=(p_payload->>'award_id')::uuid and profile_id=member for update;
 if not found then raise exception 'award not found' using errcode='42501'; end if;
 if p_action='shipping_read' then
 return coalesce((select to_jsonb(s) from private.prestige_shipping_addresses s where award_id=v_award.id and delete_after>now()),'null'::jsonb);
 elsif p_action='withdraw' then
 update private.prestige_awards set shared=false,hall_of_fame=false where id=v_award.id;
 insert into private.prestige_audit(actor_id,action,award_id,programme_key) values(member,'visibility_withdrawn',v_award.id,v_award.programme_key);
 else
 delete from private.prestige_shipping_addresses where award_id=v_award.id;
 update private.prestige_physical_requests set delivery_status=case when delivery_status in ('ready','awaiting_address','disabled') then 'disabled' when delivery_status='preparing' then 'cancelled' else delivery_status end where award_id=v_award.id;
 insert into private.prestige_audit(actor_id,action,award_id,programme_key) values(member,'address_deleted',v_award.id,v_award.programme_key);
 end if;
 return jsonb_build_object('ok',true);
 end if;
 if p_action in ('claim','request_physical','shipping_submit') and to_regprocedure('public.account_features_allowed()') is not null then
 execute 'select public.account_features_allowed()' into features_allowed;
 if features_allowed is not true then raise exception 'account completion required' using errcode='42501'; end if;
 end if;
 if not exists(select 1 from private.prestige_settings where enabled) then raise exception 'prestige unavailable' using errcode='55000'; end if;
 perform pg_advisory_xact_lock(hashtextextended('prestige:'||member::text,0));
 if p_action='read' then
 with counts as materialized(select * from private.achievement_counts(member))
 select jsonb_build_object('programmes',coalesce((select jsonb_agg(jsonb_build_object('key',p.key,'title_es',p.title_es,'title_en',p.title_en,'physical_eligible',p.physical_eligible,'definition_current',p.definition_snapshot=private.prestige_definitions(p.achievement_keys),'requirements',(select jsonb_agg(jsonb_build_object('key',a.key,'target',case when a.condition_type='xp' then a.minimum_xp else a.target_count end,'current',coalesce(c.current_count,0),'title_es',a.title_es,'title_en',a.title_en)) from public.achievements a left join counts c on c.achievement_key=a.key where a.key=any(p.achievement_keys)))) from private.prestige_programmes p where active),'[]'::jsonb),'awards',coalesce((select jsonb_agg((to_jsonb(a)-'profile_id')||jsonb_build_object('physical_status',r.status,'delivery_status',r.delivery_status,'tracking_reference',r.tracking_reference,'has_shipping_address',exists(select 1 from private.prestige_shipping_addresses s where s.award_id=a.id and s.delete_after>now())) order by a.awarded_at desc) from private.prestige_awards a left join private.prestige_physical_requests r on r.award_id=a.id where a.profile_id=member),'[]'::jsonb),'fulfilment_enabled',coalesce((select delivery_enabled from private.prestige_settings),false),'shipping_intake_enabled',coalesce((select shipping_intake_enabled and address_purge_ready and address_retention_days is not null from private.prestige_settings),false)) into result;
 return result;
 elsif p_action='claim' then
 select * into v_programme from private.prestige_programmes where key=p_payload->>'programme_key' and active for share;
 if not found then raise exception 'programme unavailable'; end if;
 if v_programme.definition_snapshot is distinct from private.prestige_definitions(v_programme.achievement_keys) then raise exception 'requirements changed; programme review required'; end if;
 if exists(select 1 from private.passport_test_accounts where profile_id=member) then raise exception 'test accounts cannot earn prestige'; end if;
 -- Recompute from accepted source activity, never client progress, unlock timestamps or manual tiers.
 select jsonb_agg(jsonb_build_object('key',a.key,'target',case when a.condition_type='xp' then a.minimum_xp else a.target_count end,'count',c.current_count) order by a.key) into proof from unnest(v_programme.achievement_keys) k join public.achievements a on a.key=k and a.active and not a.archived join private.achievement_counts(member) c on c.achievement_key=a.key where c.current_count>=case when a.condition_type='xp' then a.minimum_xp else a.target_count end;
 if coalesce(jsonb_array_length(proof),0)<>cardinality(v_programme.achievement_keys) then raise exception 'requirements not met'; end if;
 insert into private.prestige_awards(profile_id,programme_key,evidence,title_es,title_en) values(member,v_programme.key,proof,v_programme.title_es,v_programme.title_en) on conflict(profile_id,programme_key) do nothing;
 get diagnostics inserted=row_count;
 select * into v_award from private.prestige_awards where profile_id=member and programme_key=v_programme.key;
 if v_award.revoked_at is not null then raise exception 'award revoked'; end if;
 if inserted=1 then insert into private.prestige_audit(actor_id,action,award_id,programme_key,detail) values(member,'earned',v_award.id,v_programme.key,proof); end if;
 return to_jsonb(v_award)-'profile_id';
 elsif p_action='shipping_submit' then
 select address_retention_days into retention from private.prestige_settings where shipping_intake_enabled and address_purge_ready and address_retention_days is not null;
 if not found then raise exception 'shipping intake disabled'; end if;
 select * into v_award from private.prestige_awards where id=(p_payload->>'award_id')::uuid and profile_id=member and revoked_at is null for update;
 if not found then raise exception 'award not found' using errcode='42501'; end if;
 if not exists(select 1 from private.prestige_physical_requests r where r.award_id=v_award.id and r.status='reviewed' and r.delivery_status in ('disabled','awaiting_address','ready'))
 or not private.prestige_physical_qualifies(member,v_award.programme_key)
 then raise exception 'reviewed eligibility required'; end if;
 insert into private.prestige_shipping_addresses(award_id,recipient_name,address_line1,address_line2,postal_code,city,region,country_code,phone,delete_after)
 values(v_award.id,trim(p_payload->>'recipient_name'),trim(p_payload->>'address_line1'),nullif(trim(p_payload->>'address_line2'),''),trim(p_payload->>'postal_code'),trim(p_payload->>'city'),nullif(trim(p_payload->>'region'),''),upper(trim(p_payload->>'country_code')),nullif(trim(p_payload->>'phone'),''),now()+retention*interval '1 day')
 on conflict(award_id) do update set recipient_name=excluded.recipient_name,address_line1=excluded.address_line1,address_line2=excluded.address_line2,postal_code=excluded.postal_code,city=excluded.city,region=excluded.region,country_code=excluded.country_code,phone=excluded.phone,submitted_at=now(),delete_after=excluded.delete_after;
 update private.prestige_physical_requests set delivery_status='ready' where award_id=v_award.id;
 insert into private.prestige_audit(actor_id,action,award_id,programme_key) values(member,'address_submitted',v_award.id,v_award.programme_key);
 return jsonb_build_object('ok',true);
 elsif p_action in ('visibility','request_physical') then
 select * into v_award from private.prestige_awards where id=(p_payload->>'award_id')::uuid and profile_id=member and revoked_at is null for update;
 if not found then raise exception 'award not found' using errcode='42501'; end if;
 if p_action='visibility' then
 update private.prestige_awards set shared=coalesce((p_payload->>'shared')::boolean,false),hall_of_fame=coalesce((p_payload->>'hall_of_fame')::boolean,false),public_alias=nullif(trim(p_payload->>'public_alias'),'') where id=v_award.id;
 insert into private.prestige_audit(actor_id,action,award_id,programme_key) values(member,'visibility_changed',v_award.id,v_award.programme_key);
 else
 if not exists(select 1 from private.prestige_programmes where key=v_award.programme_key and physical_eligible and active) then raise exception 'physical programme unavailable'; end if;
 insert into private.prestige_physical_requests(award_id) values(v_award.id) on conflict do nothing;
 get diagnostics inserted=row_count;
 if inserted=1 then insert into private.prestige_audit(actor_id,action,award_id,programme_key) values(member,'physical_interest',v_award.id,v_award.programme_key); end if;
 end if;
 return jsonb_build_object('ok',true,'fulfilment_enabled',false);
 else raise exception 'unknown action'; end if;
end;$$;
revoke all on function private.prestige_member(text,jsonb) from public,anon,authenticated;
grant execute on function private.prestige_member(text,jsonb) to authenticated;
create function public.prestige_member(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.prestige_member(p_action,p_payload);$$;
revoke all on function public.prestige_member(text,jsonb) from public,anon,authenticated;
grant execute on function public.prestige_member(text,jsonb) to authenticated;

create function private.prestige_public(p_public_id uuid,p_page integer) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (
 select a.public_id,a.serial,a.title_es,a.title_en,a.public_alias,a.awarded_at from private.prestige_awards a
 where exists(select 1 from private.prestige_settings where enabled) and a.revoked_at is null and a.shared
 and ((p_public_id is not null and a.public_id=p_public_id) or (p_public_id is null and a.hall_of_fame))
 order by a.awarded_at desc,a.id limit 24 offset case when p_public_id is null then (greatest(1,least(coalesce(p_page,1),10000))-1)*24 else 0 end
 ) x;
$$;
revoke all on function private.prestige_public(uuid,integer) from public,anon,authenticated;
grant execute on function private.prestige_public(uuid,integer) to anon,authenticated;
create function public.prestige_public(p_public_id uuid default null,p_page integer default 1) returns jsonb language sql security invoker set search_path='' as $$select private.prestige_public(p_public_id,p_page);$$;
revoke all on function public.prestige_public(uuid,integer) from public,anon,authenticated;
grant execute on function public.prestige_public(uuid,integer) to anon,authenticated;

create function private.prestige_admin(p_action text,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); keys text[]; k text; v_programme private.prestige_programmes%rowtype; result jsonb; page integer; target uuid; note text; review_award private.prestige_awards%rowtype;
begin
 if actor is null or not public.has_platform_role(array['administrator']::public.app_role[]) then raise exception 'administrator required' using errcode='42501'; end if;
 if p_action='read' then
 page:=greatest(1,least(coalesce((p_payload->>'page')::integer,1),10000));
 return jsonb_build_object('enabled',(select enabled from private.prestige_settings),'fulfilment_enabled',(select delivery_enabled from private.prestige_settings),'shipping_intake_enabled',(select shipping_intake_enabled and address_purge_ready and address_retention_days is not null from private.prestige_settings),'programmes',coalesce((select jsonb_agg(to_jsonb(p) order by p.key) from private.prestige_programmes p),'[]'::jsonb),'requests',coalesce((select jsonb_agg(to_jsonb(x)) from (select r.*,a.serial,a.programme_key,a.evidence,a.revoked_at from private.prestige_physical_requests r join private.prestige_awards a on a.id=r.award_id order by r.requested_at desc,r.award_id limit 24 offset (page-1)*24) x),'[]'::jsonb));
 elsif p_action='configure' then
 perform pg_advisory_xact_lock(hashtextextended('prestige-catalogue',0));
 select array_agg(distinct value order by value) into keys from jsonb_array_elements_text(p_payload->'achievement_keys');
 if cardinality(keys) is null or cardinality(keys) not between 1 and 1000 then raise exception 'requirements needed'; end if;
 foreach k in array keys loop if not exists(select 1 from public.achievements where key=k and active and not archived) then raise exception 'achievement unavailable'; end if; end loop;
 if (select count(*) from private.prestige_programmes)>=100 then raise exception 'programme limit reached'; end if;
 if exists(select 1 from private.prestige_programmes where key=p_payload->>'key') then raise exception 'programme identity immutable; create a new version'; end if;
 insert into private.prestige_programmes(key,title_es,title_en,achievement_keys,definition_snapshot,active,physical_eligible,created_by) values(p_payload->>'key',trim(p_payload->>'title_es'),trim(p_payload->>'title_en'),keys,private.prestige_definitions(keys),false,coalesce((p_payload->>'physical_eligible')::boolean,false),actor) returning * into v_programme;
 insert into private.prestige_audit(actor_id,action,programme_key,detail) values(actor,'configured',v_programme.key,to_jsonb(v_programme));
 return to_jsonb(v_programme);
 elsif p_action='programme_status' then
 update private.prestige_programmes set active=coalesce((p_payload->>'active')::boolean,false) where key=p_payload->>'key' returning * into v_programme;
 if not found then raise exception 'programme unavailable'; end if;
 insert into private.prestige_audit(actor_id,action,programme_key,detail) values(actor,'programme_status',v_programme.key,jsonb_build_object('active',v_programme.active));
 elsif p_action='read_shipping' then
 target:=(p_payload->>'award_id')::uuid; note:=trim(p_payload->>'reason');
 if note is null or length(note) not between 3 and 500 then raise exception 'reason required'; end if;
 select to_jsonb(s) into result from private.prestige_shipping_addresses s where s.award_id=target and s.delete_after>now();
 if result is null then raise exception 'address unavailable'; end if;
 insert into private.prestige_audit(actor_id,action,award_id,detail) values(actor,'address_read_admin',target,jsonb_build_object('reason',note));
 return result;
 elsif p_action='delivery' then
 if not exists(select 1 from private.prestige_settings where delivery_enabled) then raise exception 'fulfilment disabled'; end if;
 target:=(p_payload->>'award_id')::uuid; note:=trim(p_payload->>'reason');
 if note is null or length(note) not between 3 and 500 then raise exception 'reason required'; end if;
 select * into review_award from private.prestige_awards where id=target and revoked_at is null for update;
 if not found or not exists(select 1 from private.prestige_physical_requests where award_id=target and status='reviewed' and delivery_status=p_payload->>'expected_status') then raise exception 'delivery state changed' using errcode='PT409'; end if;
 if not ((p_payload->>'expected_status'='ready' and p_payload->>'status'='preparing') or (p_payload->>'expected_status'='preparing' and p_payload->>'status'='shipped') or (p_payload->>'expected_status'='shipped' and p_payload->>'status'='delivered') or (p_payload->>'expected_status' in ('disabled','awaiting_address','ready','preparing') and p_payload->>'status'='cancelled')) then raise exception 'invalid delivery transition'; end if;
 if p_payload->>'status' in ('preparing','shipped') and not private.prestige_physical_qualifies(review_award.profile_id,review_award.programme_key) then raise exception 'eligibility requires review'; end if;
 if p_payload->>'status' in ('preparing','shipped') and not exists(select 1 from private.prestige_shipping_addresses where award_id=target and delete_after>now()) then raise exception 'address unavailable'; end if;
 update private.prestige_physical_requests set delivery_status=p_payload->>'status',tracking_reference=coalesce(nullif(trim(p_payload->>'tracking_reference'),''),tracking_reference) where award_id=target;
 insert into private.prestige_audit(actor_id,action,award_id,detail) values(actor,'delivery_changed',target,jsonb_build_object('from',p_payload->>'expected_status','to',p_payload->>'status','reason',note));
 elsif p_action in ('review','revoke') then
 target:=(p_payload->>'award_id')::uuid; note:=trim(p_payload->>'reason');
 if note is null or length(note) not between 3 and 500 then raise exception 'reason required'; end if;
 select * into review_award from private.prestige_awards where id=target for update;
 if not found then raise exception 'award not found'; end if;
 if p_action='review' then
 if p_payload->>'status' not in ('reviewed','declined') then raise exception 'fulfilment disabled'; end if;
 if p_payload->>'status'='reviewed' then
 select * into v_programme from private.prestige_programmes where key=review_award.programme_key;
 if review_award.revoked_at is not null or not v_programme.active or not v_programme.physical_eligible
 or exists(select 1 from private.passport_test_accounts where profile_id=review_award.profile_id)
 or v_programme.definition_snapshot is distinct from private.prestige_definitions(v_programme.achievement_keys)
 or exists(select 1 from unnest(v_programme.achievement_keys) requirement(key) left join public.achievements a on a.key=requirement.key left join private.achievement_counts(review_award.profile_id) c on c.achievement_key=requirement.key where coalesce(c.current_count,0)<case when a.condition_type='xp' then a.minimum_xp else a.target_count end)
 then raise exception 'eligibility requires review'; end if;
 end if;

 update private.prestige_physical_requests set status=p_payload->>'status',reviewed_at=now(),reviewed_by=actor,review_note=note where award_id=target;
 if not found then raise exception 'request not found'; end if;
 else update private.prestige_awards set revoked_at=coalesce(revoked_at,now()),shared=false,hall_of_fame=false where id=target; end if;
 insert into private.prestige_audit(actor_id,action,award_id,detail) values(actor,p_action,target,jsonb_build_object('reason',note,'status',p_payload->>'status'));
 else raise exception 'unknown action'; end if;
 return jsonb_build_object('ok',true,'fulfilment_enabled',false);
end;$$;
revoke all on function private.prestige_admin(text,jsonb) from public,anon,authenticated;
grant execute on function private.prestige_admin(text,jsonb) to authenticated;
create function public.prestige_admin(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.prestige_admin(p_action,p_payload);$$;
revoke all on function public.prestige_admin(text,jsonb) from public,anon,authenticated;
grant execute on function public.prestige_admin(text,jsonb) to authenticated;
-- Bounded service-only retention worker. Schedule only before approved intake activation.
create function private.purge_prestige_shipping(p_limit integer) returns integer language plpgsql security definer set search_path='' as $$
declare deleted integer;
begin
 with expired as (select award_id from private.prestige_shipping_addresses where delete_after<=now() order by delete_after,award_id limit greatest(1,least(coalesce(p_limit,100),1000)) for update skip locked), removed as (delete from private.prestige_shipping_addresses s using expired e where s.award_id=e.award_id returning s.award_id)
 insert into private.prestige_audit(action,award_id) select 'address_purged',award_id from removed;
 get diagnostics deleted=row_count; return deleted;
end;$$;
revoke all on function private.purge_prestige_shipping(integer) from public,anon,authenticated,service_role;
grant execute on function private.purge_prestige_shipping(integer) to service_role;
create function public.purge_prestige_shipping(p_limit integer default 100) returns integer language sql security invoker set search_path='' as $$select private.purge_prestige_shipping(p_limit);$$;
revoke all on function public.purge_prestige_shipping(integer) from public,anon,authenticated,service_role;
grant usage on schema private to service_role;
grant execute on function public.purge_prestige_shipping(integer) to service_role;
-- No seed rules, shipping addresses, live awards or automatic orders.
commit;
