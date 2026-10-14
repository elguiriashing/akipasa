begin;

-- Restore the service-only boundary after historically expanded function grants.
-- Keep the qualified implementation from 0082 and all existing ledger records.
alter function public.claim_stripe_webhook_event(text,text) set search_path = '';
revoke execute on function public.claim_stripe_webhook_event(text,text)
  from public, anon, authenticated;
grant execute on function public.claim_stripe_webhook_event(text,text)
  to service_role;

commit;