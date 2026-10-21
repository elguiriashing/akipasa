begin;

-- Supabase public-schema default ACLs may grant identity sequence capabilities.
-- Audit rows are written only by the existing owner-authorised trigger/RPC path.
revoke all on sequence public.suite_referral_audit_id_seq from public, anon, authenticated, service_role;

commit;
