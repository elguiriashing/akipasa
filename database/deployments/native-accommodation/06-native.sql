-- Generated canonical native accommodation deployment phase 06. No activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $native_hold$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='native_deployment_bucket_hold' and permissive='RESTRICTIVE' and cmd='ALL') then raise exception 'Native Storage hold missing';end if;end $native_hold$;
create function public.review_accommodation_property(p_property uuid,p_publish boolean,p_revision uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not accommodation_property_private.ready() or not public.account_features_allowed() or not exists(select 1 from public.profiles where id=auth.uid() and app_role='administrator') then raise exception 'Administrator required' using errcode='42501';end if;
 if p_reason is null or char_length(btrim(p_reason)) not between 10 and 2000 then raise exception 'Review reason required';end if;
 update public.accommodation_properties set status=case when p_publish then 'published' else 'rejected' end,updated_at=now() where id=p_property and revision_id=p_revision and status='pending';
 if not found then raise exception 'Stale property revision';end if;
 insert into accommodation_property_private.audit(property_id,actor,action,detail) values(p_property,auth.uid(),'review',jsonb_build_object('revision',p_revision,'publish',p_publish,'reason',p_reason));
end $$;
revoke all on function public.review_accommodation_property(uuid,boolean,uuid,text) from public,anon;
grant execute on function public.review_accommodation_property(uuid,boolean,uuid,text) to authenticated;
-- An explicit reviewed override is scoped to one property, with no Stripe/price mutation.
create function public.set_accommodation_listing_grant(p_property uuid,p_reference text,p_until timestamptz default null,p_revoke boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if not accommodation_property_private.ready() or not public.account_features_allowed() or not exists(select 1 from public.profiles where id=auth.uid() and app_role='administrator') then raise exception 'Administrator required' using errcode='42501';end if;
 if p_reference is null or char_length(btrim(p_reference)) not between 3 and 300 or (p_until is not null and p_until<=now()) then raise exception 'Valid review reference and future expiry required';end if;
 perform 1 from public.accommodation_properties where id=p_property for update;
 if not found then raise exception 'Unknown property';end if;
 if p_revoke then
  update accommodation_property_private.property_entitlements set revoked_at=coalesce(revoked_at,now()) where property_id=p_property and source='admin_override' and reference=p_reference returning id into v_id;
  if v_id is null then raise exception 'Unknown reviewed grant';end if;
 else
  insert into accommodation_property_private.property_entitlements(property_id,source,reference,ends_at) values(p_property,'admin_override',p_reference,p_until) returning id into v_id;
 end if;
 insert into accommodation_property_private.audit(property_id,actor,action,detail) values(p_property,auth.uid(),'listing_grant_review',jsonb_build_object('grant',v_id,'reference',p_reference,'revoke',p_revoke,'until',p_until));return v_id;
end $$;
revoke all on function public.set_accommodation_listing_grant(uuid,text,timestamptz,boolean) from public,anon;
grant execute on function public.set_accommodation_listing_grant(uuid,text,timestamptz,boolean) to authenticated;
do $native_closed$ declare r record; v boolean;begin
 if to_regclass('accommodation_property_private.launch_settings') is not null then
  if not exists(select 1 from accommodation_property_private.launch_settings) or exists(select 1 from accommodation_property_private.launch_settings s where s.enabled or s.uploads_enforced or coalesce(to_jsonb(s)->>'inventory_enabled','false')<>'false') then raise exception 'Native deployment requires disabled settings';end if;
 end if;
 for r in select c.oid::regclass t from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and ((n.nspname='accommodation_property_private' and c.relname<>'launch_settings') or (n.nspname='public' and (c.relname='accommodation_properties' or c.relname like 'accommodation_property_%'))) loop
  execute format('select exists(select 1 from %s limit 1)',r.t) into v;if v then raise exception 'Native deployment requires empty tables';end if;
 end loop;
 if exists(select 1 from storage.buckets where id='accommodation-media' and public) then raise exception 'Native bucket must remain private';end if;
 if exists(select 1 from storage.objects where bucket_id='accommodation-media') then raise exception 'Native deployment requires empty Storage';end if;
end $native_closed$;
commit;
