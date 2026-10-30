# Staff exact-claim account boundary —30October2026

Implemented and tested source repair in draftPR332. **Not production-applied.**
No new Worker release or separate competing PR is proposed by this document.

## Confirmed narrow behavior

The older staff claim list is covered by the canonical account-eligibility gate.
The newer exact-ID RPC was introduced afterward and checked only the staff role.
Its SECURITY DEFINER read returns a pending claim's submitted evidence and claimant
contact details. Both the web page and list require eligible accounts, but direct
RPC callers could bypass the web page's pending/underage restriction.

Preconditions are explicit: an authenticated cohort-enrolled pending/underage
account has been assigned moderator/administrator through an eligible administrator's
supported role-assignment RPC, and knows a pending claim UUID. This is a staff
account-lock mismatch, not anonymous access, arbitrary consumer escalation or a
claim that all pending IDs can be enumerated. Current account_features_allowed does
not implement current-terms checks; those requirements are not claimed repaired.

Static review traced actual0002/0027roles,170448onboarding,180946coverage,
190818identity guard,102315list,270015exactlookup and the app's role-assignment/
staff callers. No root/scoped SECURITY.md was found; explicit account contracts,
source comments and existing covered staff list establish the boundary. Shared
security-skill reference resources were unavailable; no exhaustive scan is claimed.

Separate actual-source PGlite validation used full onboarding/final-identity/coverage
migrations, actual role-assignment/predicate/list/exactlookup definitions and a
synthetic JWT-sub transport. An eligible legacy administrator promoted ordinary
cohort consumers through the real canonical role RPC; underage state came from
actual terminal declaration. All four restricted staff states had eligibilityfalse:
list denied42501 while oldbyID returned only synthetic test details. Live read-only
function metadata matched the exact old definition/body hashes below; no production
RPC/customer rows were invoked. This does not establish production cohort activation,
existing restricted staff, real JWT/PostgREST acceptance or active exploitation.

## Forward source and validation

Generated locally using SupabaseCLI2.122.0 migrationnew. Byte-identical mirrors:

- database/migrations/20261030114106_protect_staff_claim_account_eligibility.sql
- supabase/migrations/20261030114106_protect_staff_claim_account_eligibility.sql

SHA256:154fe91bf7a8a80d433a0a6c5827f22a90bac1ac3e2de99e95063afea24fa160.
Old bodyMD5:154545dcdaf45d679cc35adeaf1677b7;
old full definitionMD5:c49199892edff53e68364f05507f953d.
New bodyMD5:085d3d37194bf241cb0fd23f92ca2478.

The only functional addition is a fail-closed call to the existing canonical
account_features_allowed after the original role check and before claimant reads.
It preserves role checks, exact pending-ID filtering, query/return shape, STABLE,
SECURITY DEFINER, empty search path, owner/OID/ACL and legacy/completed staff access.
The canonical helper, enrollment, roles, other RPCs, claims and customer rows are
unchanged. No billing, notification, feature activation or XP operation is added.

The transaction accepts only the known old/already-repaired lookup body and trusted
same-owner canonical helper attributes/execution boundary. Unsupported drift fails
atomically instead of overwriting an unknown function or widening grants. Applying
again is idempotent. The helper call denies unexpected SQLNULL as well as false.

37maintained SQL tests pass: actual oldgap→newdenial; four restricted and four
eligible staff cases; guest/consumer/deleted identity; missing/nonpending claims;
full original fields; owner/OID/ACL/shape/helper/list/data invariants; idempotence;
17atomic drift cases and explicitNULL fault denial. Both migration files pass the
SQL permission audit with0findings. Focused evidence/limits/source hashes:
receipts/AKIPASA_STAFF_CLAIM_ACCOUNT_SQL_20261030.json. Fullcheck/hosted results belong
in the execution ledger after completion, never borrowed from a previous commit.

## Production and rollback boundary

Only source and disposable in-memory fixtures have changed. Existing335terms fix
is already applied once and must not be repeated. This new staff lookup migration
still requires exact reviewed source, current catalog prerequisite checks and
explicit production approval before any application. No production role, consent,
claim, cohort setting or customer record may be changed to demonstrate the result.
After any approved application, verify the guarded body/owner/ACL/helper metadata;
use disposable staging identities for live functional testing. UI rollback retains
account and terms protection: do not restore the old unguarded lookup or regrant
terms editing as a cosmetic rollback. Full332's route/device/strict acceptance gates
remain unchanged and incomplete.
