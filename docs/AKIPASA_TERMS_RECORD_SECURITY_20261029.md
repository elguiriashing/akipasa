# Terms-record security-only proposal

Production metadata permits authenticated users to edit their own terms_version
and terms_accepted_at directly. The intended source0022/0033 contract reserves
these records to accept_current_terms(text,text), which stamps server time. Owner
RLS and applicable live BEFORE triggers do not protect the two fields. This is
an existing own-record integrity issue, not evidence of cross-account or age
verification bypass. No customer rows were read or altered to investigate it.

## Exact proposed action

Apply only the mirrored20261029232451 migration with SHA256
`7fe0fa1aa1346cc3877e9693b60a6f1a382f09bf37ebbe33e0bea951b8eeeb75`.
It revokes UPDATE on only terms_version/terms_accepted_at fromPUBLIC,anon and
authenticated. It preserves all existing acceptance records, ordinary editor
rights, RPC definition/execution ACL and row policies. Preconditions verify the
existing trusted RPC remains usable and fail atomically on unsupported broad or
inherited privileges. No runtime app, package, theme, billing or onboarding change.

The migration has NOT been applied to production. This proposal requires explicit
approval independently of the unfinished full-overhaul PR. The Home/Login release
exception does not authorize it. Any master merge also automatically publishes
Cloudflare source; avoid unnecessary duplicate deployments.

## Evidence

19actual PostgreSQL SQL cases simulate observed drift, demonstrate direct forged
markers before the patch, and verify denial afterward while the existing RPC
still stamps a valid own-user acceptance. They cover unchanged rows/editor rights,
RPC definition/ACL/owner, idempotence and fail-closed rollback conditions.

The separate local backend additionally passed39Auth/REST/RLS probes,5actual Next
journeys and11Profile boundary checks after applying the exact final migration.
The original local source already denied these edits; its acceptance data, RPC,
policies and column privileges remained unchanged. Drift simulation occurred only
in the isolated SQL regression, never production. Full canonical parity, physical
Android and real provider acceptance are not claimed.

Cross-portal source audit found compatible RPC use in AkiPasa public source and
AkiHQ immutable ba33054c4df0a40c93192656f0d21ee86cc99693. Legacy AkiPasa main
3a046967d6d162e43f357265b0ecb1d83f98ecf9 has no direct terms writes.
See receipts/AKIPASA_TERMS_RECORD_ACL_20261029.json.

## Verification and rollback

Before any approved production action, recheck metadata-only prerequisites, then
apply exact immutable SQL once in its transaction. Verify effective authenticated/
anonymous denial, unchanged RPC definition/ACL/policies and stored-row absence of
writes; verify normal acceptance through an authorized disposable environment.
Guard failure rolls back the whole transaction. Preserve ordinary editing and the
acceptance RPC; do not regrant direct legal-marker editing as a cosmetic rollback.
No live customer account, acceptance record, email or payment is a test fixture.
