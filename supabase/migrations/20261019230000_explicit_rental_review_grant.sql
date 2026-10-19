begin;

-- The review audit is readable only through its owner/staff RLS policy.
-- Explicit grants avoid relying on project-level default privileges.
revoke all on table public.car_rental_company_reviews
  from public, anon, authenticated;
grant select on table public.car_rental_company_reviews to authenticated;

commit;
