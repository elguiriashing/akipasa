begin;
-- Privacy access is identity-only, intentionally exempt from feature/onboarding/age gates.
create index suite_funnel_subject_export on suite_funnel_private.stages(profile_id,analytics_id);
create function public.my_business_funnel_export(p_after text default '0',p_until text default null,p_limit integer default 500)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare subject uuid:=auth.uid();after_id bigint;until_id bigint;total bigint;items jsonb;
begin
 if subject is null then raise exception 'Authentication required' using errcode='42501';end if;
 if p_after is null or p_after !~ '^(0|[1-9][0-9]{0,18})$' or (p_until is not null and p_until !~ '^(0|[1-9][0-9]{0,18})$') or p_limit is null or p_limit not between 1 and 1000 then raise exception 'Invalid export page' using errcode='22023';end if;
 after_id:=p_after::bigint;
 if p_until is null then select coalesce(max(analytics_id),0) into until_id from suite_funnel_private.stages where profile_id=subject;else until_id:=p_until::bigint;end if;
 if after_id>until_id then raise exception 'Invalid export continuation' using errcode='22023';end if;
 select count(*) into total from suite_funnel_private.stages where profile_id=subject and analytics_id<=until_id;
 select coalesce(jsonb_agg(to_jsonb(page) order by page.analytics_id::bigint),'[]') into items from (
 select analytics_id::text,stage,workspace_id,venue_id,occurred_at,consented_at
 from suite_funnel_private.stages s where s.profile_id=subject and s.analytics_id>after_id and s.analytics_id<=until_id
 order by s.analytics_id limit p_limit) page;
 -- Proof keys are internal integrity references, not meaningful user-facing evidence;
 -- raw invoice/session/event identifiers remain solely in existing billing exports.
 return jsonb_build_object('until',until_id::text,'total',total,'rows',items);
end $$;
revoke all on function public.my_business_funnel_export(text,text,integer) from public,anon;
grant execute on function public.my_business_funnel_export(text,text,integer) to authenticated;
commit;
