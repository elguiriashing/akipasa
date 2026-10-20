# Account lock: database coverage candidate

Implemented and locally tested; no live migration or cohort activation performed.

The read-only 20 October 2026 inventory of the shared project identified 1,114
authenticated-callable public functions, including 153 SECURITY DEFINER functions,
and 259 public/storage policies. The accompanying JSON records signatures and
classification, without customer rows, credentials or production function bodies.

Concrete gaps in the first candidate included `enroll_in_passport`,
`suite_save_stay`, direct venue/event creation, operating organisation/location
list RPCs, module snapshots, workspace chat, and fiscal reads through a private
permission predicate. Frontend/API guards alone did not cover these paths.

The additive migration intersects deployed SQL permission predicates with the
caller-only account gate, including crm_has_tool, membership, fiscal and private
workspace predicates. It wraps 106 explicitly inventoried PL/pgSQL account/staff
RPCs in an outer eligibility check before original declarations execute. It
retains each deployed signature, original body, owner, attributes and ACL; trusted
service-readable backups record original definitions for review/rollback. It
fails transactionally on an unexpected language/result/body shape. It never
renames functions or silently grants execute to a broader role.

Statement triggers cover the explicit public operating/listing/preferences
manifest and private hospitality/fiscal tables, catching legacy/private definer
writes. New uploads/updates require eligibility; object deletion remains available.
Operational/admin JSON wrappers return no data for restricted callers. Public
discovery and quote availability remain useful without account features.

Safety exceptions are deliberate: own personal-data exports/reads, legal terms,
profile rectification, consent/reminder withdrawal, deletion request processing,
safety reports and identity role lookup remain possible. Own claim-decision export
is retained while the direct staff-read clause cannot expose other claimants to
a restricted caller. Existing business privacy/support controls retain their
tenant authorisation; the independent central privacy screen remains available.
The booking compatibility wrapper delegates to a guarded mutation; public tool
checks intersect the gate directly as well as at use sites. PostgreSQL/PostGIS
extension functions are not modified.

There is no backfill, enrollment date, approved terms value, role reassignment,
subscription adjustment, data scan/rewrite or customer data deletion. Anonymous
and service calls retain their existing authorisation; the extra account check
only applies when auth.uid() identifies an enrolled pending/negative account.

Local PGlite acceptance checks direct REST/RLS-style reads, legacy definer writes,
declaration-time reads, Passport enrollment, saved stays, SQL JSON calls, privacy
export, public discovery, retained rows, grandfathered/complete/negative accounts,
and trusted background writes. These tests validate the migration mechanism and
representative paths; they do not substitute for exact production-schema staging
or real PostgreSQL multi-connection acceptance.

Before activation, apply to the exact reconstructed/staging schema, inspect the
backup/function/trigger manifest and Supabase advisors, recheck newly integrated
referral/prestige/billing RPCs and API-exposed schemas, and run the authenticated
five-domain/provider/tenant/privacy journeys. New module RPCs must use the same
caller-only gate and preserve rights paths. Stop enrollment before rollback;
retain compatible access guards for existing cohort rows. Review backed-up
definitions and remove only this migration's additions if rollback is approved.

## Generic state licence audit

Read-only metadata after the toolbox deployment confirms anonymous/authenticated
roles have no SELECT/INSERT/UPDATE on raw workspace_snapshots. Public snapshot
RPCs delegate to private filtered read/write functions: each of 19 collections
maps to a tool and calls can_tool -> crm_has_tool -> licensed. Owner/admin status
is evaluated after the licence intersection. Disallowed writes preserve the
existing collection and responses filter its contents. Sites uses the approved
marketing parent alias. Generic durable records check record_type on both USING
and WITH CHECK; module snapshots use crm_member_has_tool, which delegates to the
licensed predicate. No unlicensed generic-state bypass was found in this review.

Fourteen PGlite cases exercise the reviewed snapshot/filter/read/write/mapping SQL
against every canonical tool and all 19 collections, including owner writes,
raw-table denial and retained-data restoration. Membership/licence authorities
are isolated adapters; billing activation and real tenant membership remain
covered by their separate lifecycle/security suites. This is not a live write
probe or proof for future unreviewed RPCs.
