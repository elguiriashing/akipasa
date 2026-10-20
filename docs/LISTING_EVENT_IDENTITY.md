# Listing event identity forward guard

Baseline170415 retains monthly event IDs after deletion. Before this fix, an
owner could delete an event and recreate the same UUID; publication reused the
retained ledger slot instead of consuming a new distinct-event allowance.

Additive migration233905 installs a BEFORE INSERT/UPDATE OF id trigger and a
retained-ledger event-ID index. With the existing listing gate enabled, INSERT of
any previously published UUID is rejected across every venue and tier; event
primary-key changes are prohibited. Fresh UUIDs and ordinary event UPDATE remain
available under existing RLS, account-completion and publication guards. A caller
cannot resurrect a deleted ID through INSERT ON CONFLICT, a legacy function or
another owned venue. Existing rows, events, occurrences and history are untouched.

There is no service/admin bypass while the listing gate is enabled. Use UPDATE
for legitimate edits; imports that INSERT existing published UUIDs must reconcile
rather than reuse an insert/upsert operation. Source search found no application
or script event upsert caller. Never clear retained ledger rows to bypass this
check. No applied170415 SQL is rewritten.

Apply233905 only after exact-head CI and live schema/role preflight. The existing
listing gate remains unchanged/defaultfalse. Rollback keeps the additive guard
and disables listing enforcement only under the coordinated previous release
plan; do not delete publication history or customer data. Actual hosted large
rollback acceptance calls returned no result and are not passing evidence. No
production migration or activation was performed by this patch.

The regression uses real authenticated PostgreSQL roles and owner-scoped RLS,
first reproduces same-UUID reuse before the fix, then denies original/other-owned-
venue resurrection, primary-key UPDATE and upsert resurrection. It retains fresh
drafts, ordinary edits and the existing ledger, denies outsiders/private calls,
checks Premium cannot bypass identity, and installs the actual account completion
migration and mutation-guard block to prove pending/complete states still intersect.
