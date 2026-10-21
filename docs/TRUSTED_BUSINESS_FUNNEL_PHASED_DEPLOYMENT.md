# Disabled funnel installation in atomic phases

Status: the release manager installed phases01–11 on the authorised shared project;
collection remains disabled. Source baseline is master
99feec0dc532598bb16f7a8b2afe8dad4752ef26. Installation receipts and independently
confirmed history/readback are archived in
`database/deployments/trusted-business-funnel/installation-20261021.json`.
The release manager reported two stalled canonical requests (59minutes and12hours,
then user-aborted), no surviving old transaction, no private settings table, and
only the standalone `suite_business_stage` enum prerequisite installed. This is a
reported recovery baseline, not a diagnosis of the provider or a new live readback.
Do not replay the complete canonical migration or assume an aborted tool request
committed/rolled back without independent evidence.

## What changes

Both canonical mirrored migrations remain byte-for-byte unchanged:

- `20261020234414_trusted_business_funnel.sql`
- `20261021000745_trusted_funnel_privacy_export.sql`

`database/deployments/trusted-business-funnel/manifest.json` pins their SHA256s,
source statement identities, phase byte lengths/hashes, dependency order and
canonical/hash-based `apply_migration` names. The generator retains exact function
bodies and original SQL statements, adds only transaction-local timeout guards,
dependency/disabled-state assertions and immediate private-function ACL closure.
Every original non-wrapper statement is assigned once. The final schema matches
canonical functions, triggers, constraints, indexes, RLS, policies and grants.

The ordinary canonical history remains appropriate for clean databases. This
recovery plan is an alternate transport for a fresh, disabled install where the
large request did not finish. It is not a schema upgrade for an already active
funnel and intentionally rejects configured/active settings or a nonempty new
ledger. It does not touch customer subscriptions, historic analytics or billing
records, reset schemas, move extensions, grant browser access or enable collection.

## Before the first DDL call

1. Verify the target is the authorised shared project, currently reported as
   `vhpbvcfkcteswlsdjrfl`; do not infer safety from its Development label.
2. Review the exact branch/commit and run `npm run test:funnel-deployment`.
   `node scripts/build-funnel-deployment.mjs --check` rejects generated drift.
3. Read `preflight.sql` using the authorised read-only metadata tool. Required
   source relations/account guards must exist. Confirm the enum label already
   exists, and reconcile any unexpected private schema/table/RPC before continuing.
   Do not drop unexpected objects or blindly replay partially committed phases.
4. Confirm the previously stalled request has no unresolved backend transaction.
   If a request is still ambiguous, stop. A tool timeout does not prove rollback.
   Do not cancel unrelated sessions or run large DML/rollback QA against production.
5. During any future installation keep `AKISUITE_FUNNEL_READY` unset/false, collection disabled,
   retention_days/retention_approval_ref NULL. No financial or legal configuration
   is supplied by this plan. Do not open a capture/marketing gate to test install.

## Apply one phase at a time

Use **`apply_migration` for DDL**, with exactly the `migration_name` and full SQL
file from the reviewed manifest. Do not use `execute_sql` for this DDL, concatenate
phases, parallelise them, remove the timeouts, or send the old large migration.
Read-only SQL is only for metadata/readback.

| Phase | Atomic dependency group                                              | Recovery handling                                                                |
| ----- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 00    | Enum prerequisite                                                    | Skip only when the existing exact label is verified; retain its earlier receipt  |
| 01    | Private schema/tables/RLS/grants and reserved-action integrity guard | First new phase for the reported enum-only baseline                              |
| 02    | Indexes on the new empty optional ledger                             | No source-data backfill                                                          |
| 03    | Existing billing-audit evidence index                                | Isolated so source-table lock/index work cannot hide other DDL progress          |
| 04    | Activation/eligibility/capture helpers                               | Private execution revoked in the same transaction                                |
| 05    | Optional-data cleanup/subject-lock helpers                           | Private execution revoked in the same transaction                                |
| 06    | Claim/workspace/checkout evidence functions                          | No trusted source trigger until dependencies exist                               |
| 07    | Verified billing evidence function                                   | Separate function transaction                                                    |
| 08    | Subject/privacy/activation triggers                                  | Existing source data is preserved                                                |
| 09    | Trusted claim/workspace/checkout/billing triggers                    | Collection remains off; optional ledger stays empty                              |
| 10    | Manager and maintenance RPCs                                         | Original caller/grant restrictions retained                                      |
| 11    | Identity-only complete privacy export                                | Restricted accounts retain own-data access; raw provider proof keys stay private |

Each transaction sets **2seconds lock_timeout**, **8seconds statement_timeout** and
**15seconds idle_in_transaction_session_timeout** locally. These are engineering
failure bounds for server SQL, not production product configuration or a guarantee
that a provider/control-plane transport returns within that time. They do not
change future sessions. A lock/statement failure rolls back that phase; earlier
committed phases remain closed and disabled. Investigate the exact failed phase
and its locks/permissions/provider status before deliberately retrying it. Never
retry while a preceding result is unknown. Do not increase limits automatically.

Every committed boundary asserts disabled collection, NULL approval settings, an
empty private ledger, and no private-function execution for anon/authenticated/
service_role. The new tables have RLS and explicit grants in their creation phase.
The integrity trigger installed in phase01 rejects generic client attempts to
manufacture the reserved analytics action. The trusted aggregate always requires
its private proof ledger, so any unlinked older public analytics row is not trusted
billing/claim evidence; do not backfill or delete historical analytics as cleanup.

For **each** phase, archive: reviewed commit, manifest SHA256, phase filename and
full SHA256, exact migration_name, target project, actual tool-assigned version,
start/end UTC time, tool outcome/receipt and the next dependency boundary. Mark
production status Not started/In progress/Applied only from actual receipts. Never
mark an ambiguous request applied. Preserve the enum-only earlier receipt too.
The phases are intentionally not silently idempotent: duplicate object errors
require receipt/catalogue reconciliation, not IF NOT EXISTS over unknown objects.

## After all phases commit

Run the reviewed `readback.sql` with the read-only tool. Expected results:

- enabled false; retention_days, retention_approval_ref and enabled_since NULL;
- optional_rows0, private_client_execute_grants0, trigger_count13;
- manager authenticated execute true, anonymous false;
- maintenance service execute true, authenticated false;
- privacy authenticated execute true, anonymous false.

Review actual function owners/search paths/grants if provider defaults differ.
The local parity tests simulate hostile default client/service grants; they do not
substitute for actual production metadata. Preserve every existing customer row.
Deploy/readiness and authenticated manager/privacy acceptance remain separate gates.
Do not collect data to prove the install and do not invent a retention period.

`apply_migration` assigns its own actual history versions. This plan contains **no
migration-history DML or automatic repair**. Archive those receipts and leave any
operator reconciliation of generated versions versus canonical source versions as
a separate reviewed gate. Do not run `db push`, repair/revert old history, replay
the canonical files, or claim canonical history is reconciled merely because DDL
objects now exist. Existing shared mission migrations already have independently
assigned provider versions; preserve all unrelated history.

## Rollback and interruption

If any phase fails, its transaction rolls back; verify the receipt/backend state.
Leave completed phases installed with collection off and readiness false. Resume
only from a verified dependency boundary. Do not drop the schema, data, triggers or
source-table index as an emergency response to an unknown tool result. If source
trigger removal is genuinely needed later, prepare a separately reviewed narrow
forward migration; privacy/retention and retained data still need protection.

The deployment generator and fixtures perform no linked/provider writes. Local
verification covers18 canonical/parity/privacy cases, nine additional phased
capture cases, deterministic byte/hash generation, hostile-default ACL closure,
missing dependency rejection, forced phase rollback and transaction-local setting
reset. The final catalogue comparison includes exact function definitions and ACLs,
all constraints/indexes/triggers/RLS/policies. Live lock cancellation/control-plane
behaviour and production installation are not claimed by local tests.

## Verified installation checkpoint

The release manager applied phases01–11 strictly sequentially with the frozen
manifest SHA256dcbb383a45745cbb5996674b28ed1c2f128aadafc9f90d111149f7f38d84f658.
Phase00 was skipped because its enum label was already installed. Each actual
provider version/name was independently confirmed by a read-only history query;
the JSON receipt maps those records to the full payload hash. Phase10 took about
45seconds at the provider boundary; other calls were reported around1–2seconds.
These are observed transport durations, not measured SQL execution times.

A separate read-only execution of the frozen readback confirmed collectionfalse,
NULL retention/approval/start, zero optional rows,13 triggers, zero private client
execution grants and the intended authenticated/service/anonymous RPC grants.
The release manager's read-only actual-role rollback checks returned not_activated
for an active owner, empty own privacy export, and42501 for a foreign workspace.
No production subject, billing state, capture setting or migration history was
changed by this agent. History reconciliation remains separately unperformed.

Because all shared schema/privacy dependencies now exist, this PR sets only the
AkiPasa **source** `AKISUITE_FUNNEL_READY=true`. Its consumers are the own-identity
export reader and bounded maintenance RPC; it cannot set collection or retention.
The source readiness change is not proof of production Worker deployment. A focused
real-SQL/adapter regression proves readinesstrue still returns inactive reporting,
empty restricted-identity export, cleanup0 and unchanged disabled/NULL settings.
Other commercial/tax/checkout gates remain as before. Runtime readiness and provider
smoke acceptance after release still require verification; collection has no
approved retention period and remains off.
