# Explicit company groups and existing operating locations

Status: additive candidate; not applied, deployed or production verified.

## Canonical model decision

Source inspection found no generic company ownership authority. The existing
`crm_company_records` table (`akihq/supabase/migrations/20260917145343_bulk_company_import.sql`)
is a workspace-scoped imported prospect catalogue with JSON data, import/revision
and publication fields; its records are not verified company owners. Rental
`car_rental_companies` and `car_rental_company_members` identify rental branches,
not cross-product organisations. `crm_workspaces` and `crm_workspace_members`
already identify operating locations and their actual permissions. These remain
canonical, including all IDs, legacy `source_venue_id` links and capability keys.
A legacy workspace may aggregate multiple venues: this migration does not assert
that it represents one physical site or split/normalize it. Existing
`crm_workspace_venues` relationships remain authoritative. Exact physical-location
mapping requires live inventory and explicit owner reconciliation.

Properties can separately use their existing `workspace_id`: the coordinated
`create_accommodation_property(p_name text,p_workspace text default null)` accepts
only an explicit active workspace whose owner column and active owner membership
match the caller. Existing property backfill preserves exact source-venue links,
not inferred company groups. Rental branches attach only through the separately reviewed, explicit mapping
below; company grouping alone does not attach any rental company, property or
public venue.

`20261016030000_operating_organisations.sql` introduces only an explicit ownership
group: `operating_organisations`, its owner/admin memberships, and a one-company-per-
existing-workspace association. Private request and audit tables support creation
retries and attributable membership/attachment changes. No historical company
backfill runs. A user-entered company name is a private label, not legal ownership
verification. Names, email domains, addresses, proximity, imported leads and shared
billing profiles never establish a relationship.

Before hosted application, inspect live schema for any canonical model absent from
the source snapshot. The migration deliberately fails on existing same-name objects
rather than silently accepting an incompatible structure. No provider access or
production schema inspection is claimed by local tests.

## Server contracts

All RPCs require authenticated verified, non-deleted Supabase users. Direct table
writes and private request/audit access are revoked from users and anonymous roles.
Names are trimmed, bounded to 2–120 characters, and reject control characters.

- `create_operating_organisation(p_request_id uuid,p_name text) RETURNS uuid`:
  request identity belongs to the caller; identical retry returns the same ID,
  changed name returns `PT409`, and new request creates a separate group. It creates
  owner membership only; no workspace, listing, subscription or operational grant.
- `attach_operating_location(p_organisation uuid,p_workspace text) RETURNS text`:
  requires active company owner/admin AND matching existing workspace owner column
  AND active workspace owner membership. Company authority alone is insufficient.
  Same mapping retry succeeds; assigning to a different company returns `PT409`.
  Workspace and membership locks serialize competing attachments; company mutation
  locks serialize administrator revocation. This does not detach a venue or change
  existing memberships, billing or tools.
- `set_operating_organisation_admin(p_organisation uuid,p_profile uuid,p_active boolean)`:
  only the actual active company owner can explicitly enable/revoke an administrator
  using a verified profile UUID. No email/name lookup, owner transfer or invitation
  email is included. Repeating the same state is idempotent and creates no new audit
  event. Revocation retains its row and removes company access immediately.
- `list_operating_organisations(p_limit integer=50,p_offset integer=0)` returns
  `id,name,role` only for the caller's active owner/admin memberships.
- `list_operating_organisation_locations(p_organisation uuid,p_limit integer=50,p_offset integer=0)`
  returns `id,name,role` for the explicitly selected company. `role` is the caller's
  existing active **location** membership, or null. A null role must suppress any
  claim of location access. Limits are 1–100 and offsets 0–10000.

Company owners/admins can see group location metadata. They do not automatically
read PoS, bookings, staff, inventory, fiscal or customer records. Ordinary location
staff are not promoted to company administrators. Existing database operational
RPCs, entitlements and per-location RLS remain authoritative. Removing company
administration does not revoke independently granted location membership; removing
location membership prevents attachment even if the old owner column remains.

Profiles use existing deletion semantics: memberships/request identity cascade,
audit actors and company owner references become null rather than preventing
account deletion or transferring ownership. Owner recovery after deletion is a
separate reviewed process; no administrator can silently appoint a new owner.

## Application and release dependencies

The free management hub owns company create/select and explicit location attachment;
`AKISUITE_ORGANISATIONS_READY=false` remains the default until migration verification.
Preserve creation request UUID/name through ambiguous retries. A partial workflow
that created a location but failed attachment must retain that location and offer
explicit retry, never create a duplicate or infer another company. Company metadata
lists must never become operational authorization. Operations handoffs use the
existing explicit workspace ID and server-verified capabilities.

Existing venue, accommodation and rental discovery remain independent. The grouping
migration sends no email, invokes no provider, changes no pricing/checkout flag,
relabels no legacy entitlement, and creates no public fake listing. Hostname roles,
SSO, booking migration and authenticated production acceptance are separate gates.

## Validation and recovery

`tests/akisuite-operating-organisations.test.ts` executes actual canonical CRM
workspace tables/constraints, existing access policies and detach protection,
private-location creation, and the new mirrored migration in disposable PGlite.
It covers verified identity, validation, caller isolation/idempotency, RLS and
private-table denial, explicit same-company attachment, cross-company conflict,
other-tenant denial, admin metadata without location access, revocation, removed
location membership, suspended company and preservation of venue links and grants.
The separate `scripts/test-operating-organisations-sql.mjs` requires an empty,
local-only `operating_organisations_test` PostgreSQL database. Actual PostgreSQL16
acceptance passed concurrent same-request creation, conflicting payloads, competing
company attachment of one workspace, and administrator revocation blocking an
in-flight attachment. No operational entitlement or subscription was granted.
The harness refuses non-loopback hosts, other database names and nonempty databases;
it never resets customer data. Run using `TEST_OPERATING_ORGANISATIONS_DATABASE_URL`.

Local SQL evidence does not establish hosted schema compatibility or live journeys.

Before production apply, capture schema/grants and counts for CRM workspaces,
memberships, entitlements, subscriptions and bookings; verify those remain unchanged.
There is no inferred backfill count: initial company/group tables must be empty.
Test creation/attachment only with controlled approved accounts and private data.

Rollback is a reviewed forward change revoking authenticated EXECUTE on the three
write RPCs above and disabling the management readiness flag. Retain company,
location association, membership, request and audit rows. Existing operations can
continue through existing location membership. Restore compatible application
builds; never delete created workspaces, detach legacy venue links, drop customer
records, remove subscription history or grant company-wide tools during rollback.

## Explicit rental branch association

`20261016040000_rental_operating_location.sql` adds the private
`rental_operating_location_links(company_id,workspace_id,attached_by,attached_at)`
relation. It does not put private workspace IDs into public rental catalogue rows.
No historical branch is linked automatically. Existing branch, vehicle, booking,
media and independent membership IDs remain intact.

`attach_rental_operating_location(p_company uuid,p_workspace text) RETURNS text`
requires verified identity, canonical branch ownership (`submitted_by` or an
explicit independent branch member with role `owner`), and the existing workspace
owner column plus active owner membership. A branch manager, company administrator,
public-listing viewer or unrelated location owner cannot attach it. The RPC locks
both ownership boundaries, returns the same association on retry, and rejects a
different target with `PT409`. There is no reassignment or automatic team grant.

Authenticated relation reads require branch ownership AND active membership in
the associated active/trial workspace; anonymous reads and direct writes are
denied. Revoked independent branch ownership or location membership removes these
reads and retry authority. Attaching a branch changes no billing, publication,
booking rules, customer permissions or location tool entitlements. In UI the
company, operating location and rental branch are distinct explicitly selected IDs.

Six PGlite groups cover owner/manager/other-tenant boundaries, private RLS,
idempotency/reassignment denial, preserved legacy source links/no entitlement
creation, revocation and null-safe ownership checks for a nullable legacy submitter.
PostgreSQL16 also proves a nullable submitter cannot bypass an explicit independent
owner membership. Concurrent attachment to two owned locations
produces exactly one association and one PT409; another user cannot read the map.
Rollback disables the readiness flag and revokes this write RPC, retaining the
private map and all branch/history rows. Correcting an erroneous mapping requires
a separately reviewed recovery action, never a silent location reassignment.
