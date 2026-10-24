-- Reject new alternate UUID spellings; retain/count existing case-variant paths.
begin;
do $patch$
declare r record;f record;definition text;n integer;
begin
 for r in select * from(values
  ('akisuite_listing_private.media_usage(uuid,text)',
   'split_part(name,''/'',1)=p_venue::text',
   'lower(split_part(name,''/'',1))=p_venue::text'),
  ('public.akisuite_listing_storage_upload_allowed(text)',
   'v:=split_part(p_name,''/'',1)::uuid;if auth.uid() is null',
   'v:=split_part(p_name,''/'',1)::uuid;if split_part(p_name,''/'',1)<>v::text then return false;end if;if auth.uid() is null')
 ) targets(identity,old_body,new_body) loop
  select oid,proowner,proacl,proconfig,prosecdef,provolatile into f from pg_proc where oid=to_regprocedure(r.identity);
  if not found or not f.prosecdef or f.provolatile<>'v' then raise exception 'Unknown listing Storage namespace contract: %',r.identity;end if;
  definition:=pg_get_functiondef(f.oid);
  n:=(length(definition)-length(replace(definition,r.old_body,'')))/length(r.old_body);
  if n<>1 then raise exception 'Expected one canonical Storage namespace anchor in %, found %',r.identity,n;end if;
  execute replace(definition,r.old_body,r.new_body);
  if exists(select 1 from pg_proc p where p.oid=f.oid and(p.proowner is distinct from f.proowner or p.proacl is distinct from f.proacl or p.proconfig is distinct from f.proconfig or p.prosecdef is distinct from f.prosecdef or p.provolatile is distinct from f.provolatile))then raise exception 'Listing Storage namespace metadata changed';end if;
 end loop;
end$patch$;
notify pgrst,'reload schema';
commit;
