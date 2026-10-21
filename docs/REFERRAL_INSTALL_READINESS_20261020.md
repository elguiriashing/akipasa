# Referral installation readiness — release review packet

Prepared20 October2026 from PR222 sourcef1b8c276 and additive sequence repair.
No production writes, programmes, monetary activation or provider calls were made
by this review. The confirmed shared project is `vhpbvcfkcteswlsdjrfl`.

## Verified prerequisites and safe sequence

Read-only metadata confirms `public.profiles(id)`, `public.current_app_role()`,
`public.billing_customers(profile_id,stripe_customer_id)` and
`public.billing_subscriptions(profile_id)` exist. `gen_random_uuid()` is provided
by the existing PostgreSQL installation. The optional
`public.akisuite_billing_subscriptions` table is absent; foundation capture checks
its existence before querying it. New referral tables/schema are absent at this
preflight. The three role names anon/authenticated/service_role already exist.
The toolbox/operations/listing/Pulse schemas introduce no dependency on these
referral tables and need not be recreated or remapped.

Apply each canonical migration once, using **one** of the mirrored runners:

1. `20261020170421_shared_referral_foundation.sql`.
2. `20261020180654_referral_payout_review.sql`.
3. `20261020185822_referral_audit_sequence_acl.sql` (this amendment).
4. `20261020180946_account_completion_database_coverage.sql`, final PR222 version.

Step4 is an explicit semantic dependency order even though the sequence repair has
an intentionally later generated timestamp. The release manager confirms180946
has **not** been applied;170448 onboarding foundation is installed with no cohort
enrollment. Apply180946 only after all intended feature objects exist, so its six
referral RPC wrappers and nine mutation-table guards are installed. Do not rerun
an already-applied180946 wholesale: its policy/bootstrap clauses are not universally
repeatable. If migration order changes, stop and prepare a narrow reviewed guard
follow-up rather than replaying the whole coverage migration.

The live public-schema default ACL grants USAGE/SELECT/UPDATE on new sequences to
anon/authenticated/service_role. Foundation170421 already revokes table privileges
and protects rows, but did not revoke its audit identity sequence.185822 revokes
only `public.suite_referral_audit_id_seq`; existing owner-executed audit triggers
continue to append. It changes no global default ACL, unrelated sequence,
subscription, programme rule, row, function, role membership or source history.
Review180654 already revokes its own revision sequence and remains unchanged.

With all runtime/private gates closed, the two feature migrations plus the repair
are structurally safe additive installs. This is not activation acceptance:
complete ACL/account coverage probes, actual-role rollback tests and hosted CI
before enabling any application schema consumer. Never seed a programme, code,
percentage, payout threshold, reward or commercial term as part of installation.

## Expected fresh-install shape

- Eight foundation public tables: programmes, representatives, codes,
  attributions, leads, billing*events, audit and cases (all `suite_referral*`).
- One additional public table: `suite_referral_payout_reviews`.
- One private schema/table: `akisuite_referral_private.review_settings`.
- Nine public functions: six foundation functions (including two trigger
  functions), and three administrator-review functions.
- Two new public identity sequences. Neither sequence grants USAGE, SELECT or
  UPDATE to PUBLIC/anon/authenticated/service_role after the repair.
- All nine public tables have RLS enabled and zero rows immediately after an
  unseeded install. The private settings table has exactly one row, `enabled=false`.
- No new Stripe object, customer, subscription, discount, payable balance, payout,
  representative assignment or programme is created. Programme monetary/payout
  CHECK=false constraints and billing `held_unapproved` constraint remain intact.
- After coverage, all six caller-facing referral RPC definitions contain the
  coverage-v1 guard, and all nine tables have `account_completion_guard`.
  Service-only verified billing remains service-only and ungated by a customer
  account completion requirement. No existing account is enrolled.

## Read-only post-install probes

Run metadata/count probes as the release role; they do not establish browser
identity. All results must be assessed, not merely collected.

```sql
select c.relname,c.relrowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r'
  and c.relname like 'suite_referral_%'
order by c.relname;

select role,sequence_name,
 has_sequence_privilege(role,sequence_name,'USAGE') as usage,
 has_sequence_privilege(role,sequence_name,'SELECT') as read,
 has_sequence_privilege(role,sequence_name,'UPDATE') as write
from unnest(array['anon','authenticated','service_role']) role
cross join unnest(array['public.suite_referral_audit_id_seq',
 'public.suite_referral_payout_reviews_revision_seq']) sequence_name;
-- Every capability above must be false. Check PUBLIC ACL entries separately.

select c.relname,c.relacl from pg_class c
where c.oid in ('public.suite_referral_audit_id_seq'::regclass,
 'public.suite_referral_payout_reviews_revision_seq'::regclass);

select role,table_name,
 has_table_privilege(role,'public.'||table_name,'INSERT') as can_insert,
 has_table_privilege(role,'public.'||table_name,'UPDATE') as can_update,
 has_table_privilege(role,'public.'||table_name,'DELETE') as can_delete,
 has_table_privilege(role,'public.'||table_name,'TRUNCATE') as can_truncate
from unnest(array['anon','authenticated','service_role']) role
cross join unnest(array['suite_referral_audit',
 'suite_referral_payout_reviews']) table_name;
-- All raw mutation/truncate capabilities above must be false.

select enabled from akisuite_referral_private.review_settings;
-- Exactly one false row. Do not change it.

select conrelid::regclass relation,conname,pg_get_constraintdef(oid)
from pg_constraint where conrelid in (
 'public.suite_referral_programmes'::regclass,
 'public.suite_referral_billing_events'::regclass) and contype='c';
-- monetary_enabled=false, payouts_enabled=false and held_unapproved retained.

select p.proname,has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute,
 has_function_privilege('service_role',p.oid,'EXECUTE') service_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
 'suite_capture_referral','suite_referral_dashboard',
 'suite_join_referral_programme','suite_record_referral_billing',
 'suite_referral_payout_eligibility','suite_review_referral_payout',
 'suite_referral_payout_review_queue');
-- anon=false for every listed function. Authenticated may execute the six
-- caller-facing functions, but their identity/admin/coverage checks still apply.
-- Verified billing: authenticated=false, service_role=true.
-- Review functions: service_role=false.

select p.proname,position('account completion required [coverage-v1]'
 in p.prosrc)>0 guarded from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('suite_capture_referral',
 'suite_referral_dashboard','suite_join_referral_programme',
 'suite_referral_payout_eligibility','suite_review_referral_payout',
 'suite_referral_payout_review_queue');
-- Six true rows after180946.

select c.relname,t.tgname from pg_trigger t join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname like 'suite_referral_%'
 and t.tgname='account_completion_guard' and not t.tgisinternal;
-- Nine rows after180946.
```

Count all nine tables explicitly after installation. Expected zero is conditional
on a genuinely fresh unseeded installation; preserve any legitimate existing rows
if a concurrent approved action has occurred. Do not DELETE to obtain a zero.
Anonymous table reads must be denied; normal consumers/representatives must see
only their own allowed projections. The review queue/decision RPC must deny normal
users and anonymous callers, and an actual administrator must see an empty queue.
The private review gate must reject decisions even for an administrator.

For positive trigger/admin/capture isolation acceptance, use disposable fixtures
inside an explicit transaction ending in ROLLBACK, with actual authenticated role
and caller claims. Verify transaction completion and re-count afterwards. Do not
use a real charge, actual payout, permanent programme, production secret or customer
reassignment as a test. Local PGlite coverage does not replace those hosted checks.

## Gate and rollback boundaries

Keep `AKISUITE_REFERRALS_READY`, `AKISUITE_REFERRAL_APPROVAL_SCHEMA_READY` and private
review enablement off unless separately accepted. Monetary/payout CHECK=false
constraints are not switches to bypass: actual incentives/disbursement require a
separate approved financial/legal design. Installing schema creates no liability.

Rollback application readiness/private review enablement without deleting audit,
invoice or customer attribution history. Sequence ACL repair is retained. Never
restore the inherited client sequence grants or rewrite already-applied foundation
history. No browser build or provider binding is changed by this amendment.
