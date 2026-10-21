# Native property review workspace

The separately gated AkiPasa administrator route
/{en|es}/admin/accommodation-review lists submitted property revisions and retained
orphaned properties requiring ownership review. It never exposes an owner's
unsubmitted private drafts. A bounded, administrator-only RPC returns business
listing fields, revision IDs and orphan state; no customer or billing details.
Anonymous, ordinary owner, restricted administrator and disabled-feature calls fail
closed. Explicit NULL pagination cannot turn the queue into an unbounded query.
The forward migration also closes explicit-NULL pagination in the existing native
owner property/team readers without changing their scope or returned contract.

An administrator approves/rejects an exact pending revision with a required reason.
The server action independently checks persisted admin role and native readiness;
the database remains authoritative for account eligibility, role, revision and audit.
Only a confirmed database success is shown as recorded. EN/ES review forms retain
the controlled reason on stale/error responses and prevent duplicate submissions.
Orphaned properties stay private and show ownership review instructions; this
workspace does not transfer ownership or approve financial entitlements.

This candidate depends on corrected foundation001000 from PR249, not the unsafe
original244 head, and adds only forward005500. Native runtime/database readiness
remains off. Local four actual-role SQL cases plus eight action/UI cases cover
scope, private draft exclusion, pagination, revision races, role/feature gates,
confirmed success and preserved form values. Central supported-Next integration,
exact hosted CI and real administrator/owner EN/ES mobile/tablet acceptance remain
required before availability. No production data or configuration was changed.

Rollback hides the route/navigation by disabling native readiness and reverts the
consumer if needed. Preserve the bounded RPCs, property IDs, submitted revisions,
retained orphan records and immutable audit history.
