# AkiSuite Role Restructure — Current State and Release Plan

**Discovery snapshot:** 2026-10-16 (read-only provider inspection)  
**Status:** Planning baseline only. Provider inspection was read-only: no app code, production routing, subscriptions, or production data have been changed.

## Current verified map

| Product/domain | Repository or deploy source | Current observed role | Production attachment observed |
|---|---|---|---|
| AkiPasa — `akipasa.com` | `elguiriashing/akipasa`, default `master` | Consumer discovery plus claims/owner tools | Worker `akipasa`; `akipasa.com`, `www.akipasa.com` |
| AkiDuermo — `akiduermo.com` | `elguiriashing/AkiDuermo`, default `main` | Independent accommodation application candidate | Worker `akiduermo`; production domain is attached. Draft PR #1 explicitly says keep draft pending hosted auth/booking acceptance. |
| AkiCoches — `akicoches.com` | `elguiriashing/AkiCoches`, default `main` | Rental discovery and booking | Worker `akicoches`; production domain is attached |
| AkiHQ — `akihq.app` | `elguiriashing/akihq`, default `main` | Current operational app (CRM, PoS/stock and related tools) | Pages project `akihq`; domains `akihq.app`, `crm.akipasa.com`; production branch `main` |
| AkiBusiness — `akibusiness.com` | `elguiriashing/AkiBusiness`, default `main` | Current listing/business management app (venue, accommodation and rental workspaces) | Worker `akibusiness-preview` is attached to production domain `akibusiness.com` |
| Auth/API gateway | `elguiriashing/akihq` integration gateway plus existing AkiPasa services | Existing shared backend and application handoffs | Worker `akihq-integration-gateway`; keep its schedules and bindings intact during the app swap |

This is already a five-repository deployment; do not create another repository split. Repository names and internal database identifiers are not public product semantics. The requested destination is a **role and domain swap**: the current management app becomes AkiHQ, and the current operations app becomes AkiBusiness. The swap must be staged so that each custom domain always points to a compatible app.

### Provider evidence captured

- GitHub lists the five repositories above and their default branches.
- Cloudflare account inspection shows active zones for all five final domains, production Worker domain bindings, and the Pages project/domain attachment described above.
- Supabase project `vhpbvcfkcteswlsdjrfl` is active and reports PostgreSQL 17.6.1. The project is named “AkiPasa Development”; an earlier owner-confirmed release note describes this same ref as production. Treat it as production data and do not reset, branch-merge, or apply schema changes without a reviewed migration.
- Read-only table counts include: `venues` 75,370; `venue_members` 7; `venue_claims` 8; `crm_workspaces` 1; `crm_workspace_members` 9; `crm_workspace_venues` 1; `billing_customers` 4; `billing_subscriptions` 4; `accommodation_units` 6; `accommodation_reservations` 0; `car_rental_companies` 2; `car_rental_vehicles` 3; `car_rental_bookings` 1; `car_rental_legacy_venue_links` 1. These are counts only, not a validated ownership mapping.
- Applied migration history includes accommodation inventory, rental companies/fleets and `independent_rental_branches` (`20261015220302`). Do not duplicate those models. Inspect the exact migration SQL, constraints, RLS and write paths before extending it.
- The open PR list includes AkiHQ #30 (canonical-domain/auth preparation), AkiDuermo #1 (draft extraction), AkiPasa #140 (Stripe webhook privilege), #133 (plan-change protection), #151 (account export), #103 (performance), and #8 (legal review). Drafts have explicit acceptance/security gates; do not merge them as a shortcut to this migration.
- The Supabase advisor reports `public.spatial_ref_sys` with RLS disabled. This is an existing PostGIS/system-table advisory. Do not blindly enable RLS without understanding extension ownership and required access.\n- The live Stripe account `AkiPasa Marketing S.L.` was inspected read-only. Four subscriptions are active and use legacy offers: two AkiPasa Business monthly at €20, one personal Premium annual at €19.99, and one Business Pro annual at €570. Preserve these contracts and current entitlements.\n- The active Stripe catalogue includes old products plus a 2026 offer family. The observed 2026 monthly prices include AkiHQ Standard €20, AkiHQ Pro €60, an AkiBusiness add-on €7.99, and AkiDuermo Premium €5.99; Enterprise €79.99/month is also present. Price records in the observed page have inclusive tax behavior; retrieved legacy subscription records have automatic tax disabled. These do not match the target sketch in full (target Standard €24.99, Plus €44.99, Pro €64.99, no separate AkiHQ offer). Do not rewrite these live prices or infer VAT policy; inspect all pages and app mappings before enabling any new checkout.

## Release principles

1. Keep the AkiPasa catalogue, public URLs, customer records and existing IDs stable.
2. Use additive compatibility changes. Never infer ownership from names, shared emails/domains or proximity.
3. Separate application role, public brand, internal capability key and Stripe offer identity. Never globally replace `AkiHQ`/`AkiBusiness`.
4. Keep legacy aliases until each destination and authentication flow is verified. Do not redirect either canonical domain wholesale to the other.
5. Do not change existing Stripe subscriptions, renewal prices, discounts, intervals, tax settings or entitlements during the new-offer rollout.
6. No customer emails, real charges, test printing, fake public listings or destructive database operations.
7. A domain binding is not proof of a correct app build. Verify repository commit/build identity and production behavior after each cutover.

## Implementation sequence and acceptance gates

### 1. Complete inventory and contracts
- Record each app's actual routes, auth callbacks, product branding, env bindings, CI, deployment source and Worker/Pages build IDs.
- Read the exact rental/accommodation migrations and relevant RLS, storage, claims, booking, billing and webhook code.
- Complete paginated inventory of Stripe products/prices/subscriptions and reconcile them to database entitlements.
- Produce a route/legacy-alias matrix and rollback map.

### 2. Data and permission compatibility
- Reuse `crm_workspaces`, membership, venue ownership and vertical-specific records where possible.
- Define organisation/location/product-listing relationship and stable IDs before creating new canonical entities.
- Backfill only via verified claim/member/foreign-key relationships. Record row counts and mapping IDs; make batches idempotent and resumable.
- Ensure organization/location membership and capability grants are server enforced in RLS, APIs, storage and jobs. Keep billing entitlements distinct from user permission.

### 3. Shared management hub (AkiHQ)
- Rebrand and route the current AkiBusiness management app to AkiHQ.
- Preserve independent venue, stay and rental management, media isolation, current reservation records and claim validation.
- Resolve company/location routing: zero businesses -> claim/add; one location -> direct workspace; multiple -> company overview and switcher.
- Keep public listings optional and AkiHQ free.

### 4. Operations app (AkiBusiness)
- Rebrand and route the current AkiHQ operational app to AkiBusiness.
- Keep PoS, tables/orders, inventory, staff, CRM, reporting and existing working modules; do not advertise blocked fiscal issuance.
- Support private businesses with no discovery listing; scope staff to their permitted workspace/location.
- Link shared profile, team and billing management back to AkiHQ rather than fork those systems.

### 5. Offers and billing
- Publish a central versioned feature/offer matrix with exact scope and readiness.
- Map old offer IDs to old entitlements explicitly. New listing upgrades scope to one listing; operations plans scope to one location; personal Premium never grants business access.
- Keep checkout disabled per offer where benefits, scope, VAT display or approved tax policy are unresolved.
- Activate paid grants only from verified, idempotent server webhook processing.

### 6. Staged routing and production acceptance
- Deploy compatible previews first, then cut domains in a coordinated window.
- Keep AkiHQ and AkiBusiness domains independently served; preserve `crm.akipasa.com` as a deliberate legacy destination until retired.
- Test Google and email auth, reset/invites, return context, English/Spanish, mobile, permissions, claims, bookings and core PoS without real external side effects.
- Confirm the deployed commit/build identifier for each domain. Retain old Worker/Pages versions and bindings until smoke tests pass.

### 7. Cleanup and handoff
- Remove old route compatibility only in a later release after access logs and acceptance confirm it is unused.
- Report migration SQL/backfill counts, plan mappings, checks, deploy IDs, production smoke results and rollback instructions.

## Current blockers and next evidence

- Complete Stripe pagination and reconcile the complete legacy catalogue to the database before changing checkout. Any new offer whose approved tax treatment or functional benefits are unresolved must remain disabled.
- The Pages/Worker bindings are confirmed, but current live build IDs and per-domain smoke behavior still need inspection.
- The independent rental schema exists, but reservation contact-field completeness and ownership/branch RLS are not established by row counts.
- AkiDuermo PR #1 and AkiHQ PR #30 describe their own draft acceptance gates. Re-evaluate each against current source and deployed builds before merging.
