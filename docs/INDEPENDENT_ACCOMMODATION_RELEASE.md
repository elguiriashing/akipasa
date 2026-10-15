# Independent accommodation candidate

Status: implemented locally; not applied, merged, deployed or production-verified.

## Ownership and compatibility contract

`crm_workspaces` remains the current operations/location authorization boundary.
No organisation-wide authority is inferred. The separate additive
`20261016003000_private_operating_location` RPC creates an explicitly named,
private workspace with its caller as owner and an active owner membership. Its
caller/request UUID ledger makes retries idempotent. It creates no public venue,
listing, paid entitlement or automatic connection to other owned venues.
Existing operational permissions still decide whether tools are available.

`20261016010000_independent_accommodation_properties` adds
`accommodation_properties`, referencing an optional existing CRM workspace.
Legacy accommodation property IDs equal existing venue IDs. Only an existing
`crm_workspaces.source_venue_id` equality supplies a legacy workspace mapping.
Legacy membership remains live through `is_venue_member`, so revocations retain
their effect. New independent properties have an explicit caller owner, no venue
and private status. Independent manager assignments are explicit property-member
rows; CRM membership alone never grants property access. Owner/team UI remains
an integration requirement; do not write memberships inferred from names/email.

Eight existing inventory/quote/reservation/outbox tables gain `property_id`.
Existing rows, IDs, snapshots, statuses and `venue_id` links remain. Compatibility
triggers derive canonical identity for old clients and fill legacy venue IDs for
new clients, reject mismatches and forbid reassignment. Composite foreign keys
keep units/types/rates/reservations in their property. Existing exclusion
constraints, lock-row serialization and booking state machine remain in force.
Old booking RPC signatures stay compatible: `p_venue` now denotes a property ID,
which is identical for every legacy property.

Private property creation uses `create_accommodation_property(p_name,p_workspace)`;
optional workspace linkage requires its explicit owner and active owner membership.
The RPC does not modify the workspace or its `source_venue_id`. In particular it
never invokes the legacy detach trigger that suspends workspaces/removes members.
Public creation/publication and owner reassignment are not directly granted.

## Application contract and remaining integration

`/api/business/accommodations` authenticates every request, checks property
current Terms acceptance and management on every inventory request, and uses caller-scoped RLS, never a service
key. Strict operation schemas expose property creation, room/unit editing, rate
and block creation/removal, settings and valid reservation transitions. Reads
report individual dependency failures instead of false empty inventories. Read
windows are bounded to 100 rows per section with explicit page navigation and
one-row lookahead; managed-property pages use a deterministic name/ID order. No input accepts ownership or publication fields.

New private media lives in `accommodation-media`, with property-scoped metadata,
12 explicit ordered public placements and private Storage policies. The real media
endpoint supports bounded MIME/signature-validated uploads, private signed reads,
placement and removal; old venue media remains untouched.

`20261016020000_independent_accommodation_public_contract` adds independent listing
metadata, immutable UUID-derived slugs, explicit submission and staff-only review.
The bilingual `/[locale]/staff/accommodations` queue is bounded and requires the
existing moderator/administrator role; review decisions require a reason and the
exact loaded revision. An edited listing returns to review, and stale approval
fails. New public catalogue/detail/map RPCs union legacy and independent published
rows with one deterministic pagination/count, existing prefix normalization and
actual relevance-flag visibility. Hidden legacy properties remain visible only to
their existing authenticated owner/manager; anonymous calls do not gain access.

Saved stays gain a canonical property ID while preserving legacy keys and dates.
Backfill includes exact saved venue references even if a venue was reclassified
and has no inventory; those retained properties stay private.
The saved reminder queue and sender recheck canonical property state, explicit
reminder opt-in and current verified recipients; dedupe and original scheduling
remain. Confirmation operator URLs target the independent property workbench;
legacy venue URLs remain. New independent requests require the verified account
email; historical legacy contacts are preserved. No real messages were sent.

Account erasure nulls independent ownership and holds public visibility without
deleting property/inventory/reservation history. Existing explicitly assigned
managers retain booking access; publication requires an explicit ownership recovery.
Staff-review actor erasure anonymizes the actor reference while retaining audit.
No automatic ownership transfer or inferred replacement owner exists.

The extracted management and discovery applications consume these contracts in
coordinated candidate branches. `AKISUITE_INDEPENDENT_ACCOMMODATION_ENABLED` must be
exactly `true` to expose the new consumer paths/staff queue. Management JSON/media
endpoints separately require `AKISUITE_ACCOMMODATION_READY=true`; this is a release
operator gate, not evidence that migrations or provider acceptance have passed. Keep it false until
migrations, provider configuration and authenticated acceptance pass. Old reports
remain venue-scoped. A complete hosted schema/Storage rehearsal, owner/team
assignment acceptance and actual production journeys remain release gates.

`20261016050000_accommodation_property_team` adds explicit team assignment by the
verified canonical owner of an independent property. A verified profile UUID can
receive the existing manager role or be revoked; legacy teams keep their original
venue workflow. No owner transfer, invitation email, organisation inheritance or
paid capability is added. Changes serialize on the property and enter a private
audit; managers cannot grant peers, metadata reads are owner/self only, and
revocation immediately removes inventory access. Ownerless recovery still requires
an explicitly reviewed ownership-recovery procedure. Managed property pagination
is additive and preserves the old no-argument RPC.

## Evidence

Disposable PostgreSQL 16 executes the existing complete booking foundation suite
(11 groups including concurrent occupancy, quote expiry, last-unit races, status
permissions and mail leases), then the additive migration with real legacy history.
Nine new groups verify deterministic mappings and unchanged reservation values,
private ownership/workspace access, inventory composite constraints and immediate
revocation, independent last-unit requests/confirmation/cancellation/outbox,
private/public selected media, legacy-client writes/upserts, reviewed public discovery, saved reminders explicit owner-only team grants/revocation and retention-safe account erasure. This uses exact
accommodation migrations with minimal external CRM/Storage/Auth table fixtures;
it does not certify compatibility with the entire hosted schema or Storage DDL
ownership. The isolated database accepts only loopback `/accommodation_test`.

Twenty-six actual API-handler/render/action/terms tests cover origin/body bounds, anonymous denial, strict
creation contract, membership/read failures, property-scoped insert/update/delete,
reservation scope and per-section read recovery. Private operating location SQL
acceptance is separately recorded by its dedicated nine-case PGlite suite.

## Rollout gates and recovery

1. Verify the actual Supabase ref `vhpbvcfkcteswlsdjrfl` schema, functions, grants,
   extra policies/triggers and pending migrations. Inspect hosted Storage policy
   owner privileges before the migration; local database ownership is not proof.
2. Record reservation/type/unit/rate/block/quote/outbox IDs and counts, existing CRM
   memberships/source links, and a recoverable backup. Rehearse on a sanitized
   schema-compatible clone. Preserve historical references even when a venue changed vertical; deterministic
   backfill includes every existing accommodation inventory/history reference.
3. Run complete current-head checks, both SQL suites and hosted browser/Cloudflare
   acceptance. Review mirrored migrations. Apply additive migrations 003000, 010000 and 020000 in order, then team/pagination migration 050000,
   verify exact backfill counts and every retained legacy ID before app promotion.
4. Keep new property public activation disabled until independent management,
   customer discovery/booking/history/media and auth are exercised end to end with
   controlled test accounts. No real customer email/payment/public fake listing.
5. Before any independent production writes, the previous application can be
   restored. After independent records exist, roll back public exposure/new
   creation first while retaining the compatible management, history and
   cancellation routes; a venue-only application is not a safe complete rollback.
   Retain new identities/inventory and
   the compatible SQL functions; never drop the new columns/tables after writes,
   delete histories, clear CRM source links or restore old venue-only booking
   functions over independent records. Disable new creation via reviewed forward
   `REVOKE EXECUTE` on both new creation RPCs and pause independent booking settings
   only for explicitly selected affected property IDs. Preserve existing booking
   management and cancellation. Restoration requires the recorded backup plus a
   reviewed forward repair, not destructive down migration.
