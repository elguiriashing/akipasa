-- Generated canonical native accommodation deployment phase 09. No activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $native_hold$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='native_deployment_bucket_hold' and permissive='RESTRICTIVE' and cmd='ALL') then raise exception 'Native Storage hold missing';end if;end $native_hold$;
create function public.complete_accommodation_upload(p_reservation uuid,p_digest text) returns boolean language plpgsql security definer set search_path='' as $$
declare r accommodation_property_private.upload_reservations;o storage.objects;
begin
 select * into r from accommodation_property_private.upload_reservations where id=p_reservation for update;
 if not found or r.state not in ('pending','uploaded') or r.expires_at<=now() or p_digest is distinct from r.digest then raise exception 'Invalid receipt';end if;
 -- Check the actor, not the service identity issuing this receipt.
 if not exists(select 1 from public.accommodation_properties p where p.id=r.property_id and p.owner_profile_id is not null and
 (p.owner_profile_id=r.actor or exists(select 1 from public.accommodation_property_members m where m.property_id=p.id and m.profile_id=r.actor)) and
 (p.workspace_id is null or exists(select 1 from public.crm_workspaces w join public.crm_workspace_members m on m.workspace_id=w.id where w.id=p.workspace_id and w.owner_profile_id=p.owner_profile_id and w.status in ('active','trial') and m.profile_id=r.actor and m.status='active' and m.role in ('owner','admin','manager','staff')))) then raise exception 'Membership revoked' using errcode='42501';end if;
 if exists(select 1 from account_private.onboarding where profile_id=r.actor and status<>'complete') then raise exception 'Account completion required' using errcode='42501';end if;
 select * into o from storage.objects where bucket_id='accommodation-media' and name=r.storage_path;
 if not found or o.metadata->>'size' is distinct from r.size_bytes::text or o.metadata->>'mimetype' is distinct from r.mime_type or o.user_metadata->>'accommodation_upload_id' is distinct from r.id::text or o.user_metadata->>'sha256' is distinct from r.digest then raise exception 'Stored bytes mismatch';end if;
 update accommodation_property_private.upload_reservations set state='uploaded' where id=r.id;return true;
end $$;
revoke all on function public.complete_accommodation_upload(uuid,text) from public,anon,authenticated;
grant execute on function public.complete_accommodation_upload(uuid,text) to service_role;
create function public.cancel_accommodation_upload(p_reservation uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare r accommodation_property_private.upload_reservations;
begin
 select * into r from accommodation_property_private.upload_reservations where id=p_reservation for update;
 if not found or r.state='committed' then return false;end if;
 update accommodation_property_private.upload_reservations set state='failed' where id=r.id;return true;
end $$;
revoke all on function public.cancel_accommodation_upload(uuid) from public,anon,authenticated;
grant execute on function public.cancel_accommodation_upload(uuid) to service_role;
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
