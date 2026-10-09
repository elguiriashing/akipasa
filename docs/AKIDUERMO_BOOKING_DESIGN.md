# AkiDuermo and universal AkiBusiness reservations: implementation contract

Status: design / incremental implementation candidate, NOT a statement of production readiness.
Owner: AkiSuite. Last updated: 2026-10-09.

## Primary requirement

One AkiBusiness booking workbench supports seven deliberately different booking templates without pretending they have identical inventory:

1. Dining: tables, service periods, cover capacities, party-size constraints.
2. Experiences: departure sessions, guides, group capacity.
3. Resources: courts, equipment, vehicles, concurrent allocation.
4. Appointments: staff calendar, service durations, blackout periods.
5. Events: dated performances, ticket/seat classes, controlled capacity.
6. Classes: recurring sessions, enrollment caps.
7. Stays: accommodation units/room types, exclusive inventory per night, date ranges, guest counts, policies and nightly prices.

Public booking modes stay **External**, **Via AkiPasa**, **Disabled**. External is exactly a URL; it must not require inventory setup. Disabled hides direct public booking. Via AkiPasa activates only actually supported booking semantics. AkiDuermo must NEVER inherit a timed-slot booking form and imply it has hotel overnight availability.

## Product identity and ownership

- Public AkiDuermo: https://akiduermo.akipasa.com/stays/[slug] with a dedicated accommodation listing, never displayed as a regular AkiPasa venue.
- Management: business.akipasa.com, same login and verified owner/manager permissions as AkiBusiness.
- Data: current implementation identifies accommodations through venues.discovery_vertical = 'accommodation'. This is an internal shared storage abstraction, **not** permission to show them as regular venues. Verify existing claim and RLS conventions before changing schema.
- Test property: AkiDuermo HQ, Calle Capitán 8, 2º A, Fuengirola 29640, Spain, assigned to alex@akipasa.com by earlier fixture/seed work. Must remain non-discoverable and non-bookable by ordinary customers until explicit enablement. Do not insert a duplicate property.
- AkiHQ remains a distinct suite; reuse shared identity, not CRM booking records as the canonical accommodation source.

## Interaction structure: AkiBusiness / Accommodation

Dashboard cards: Upcoming check-ins; Current guests; Check-outs; Pending requests; occupancy over chosen date window. No fabricated occupancy if inventory not configured.

Tabbed workbench (responsive and persistent URL state):

- **Reservations**: searchable/paginated list, upcoming/in-house/past/cancelled status filters, guest name or confirmation query, sort and date range. List/grid adapts to width, keeps actions accessible in split-screen. Click opens details drawer with audit events.
- **Calendar**: property/room-type/unit occupancy timeline; horizontal day scroll within a bounded region, mobile agenda fallback, per-day availability, maintenance blocks, range selection. No global page horizontal overflow.
- **Rooms & units**: list room types, individually managed units, capacities, beds, amenities, accessible characteristics, photos and active/inactive. Unit IDs are stable. Inventory per physical unit, avoid counting both type and unit capacity.
- **Rates & rules**: per-night EUR base pricing, date overrides, min/max nights, guest capacity, check-in/out windows, lead time, cutoff, local holidays, manual blocks, cancellation terms. Taxes/fees displayed transparently. Do not invent a full tax or payment collection system.
- **Settings**: External / Via AkiPasa / Disabled with safe validation and public-preview link, owner notification email, default check-in/out, timezone Europe/Madrid, locale, booking policy. Inactive booking never surfaces booking CTA.

Customer booking: select check-in and check-out on one range calendar, choose room/unit and guest counts within capacity, show live per-night total and explicit fees, add minimal contact details, review policy, request/confirm based on approved merchant mode. EN/ES parity, keyboard accessible touch targets, clear pending vs confirmed states, responsive tablet portrait/landscape/split-screen.

## Hotel inventory cannot reuse timed slots unchanged

Schema proposal (names subject to existing migration review):

- accommodation_room_types (id, accommodation_id, name, occupancy, beds, amenities, active)
- accommodation_units (id, accommodation_id, type_id, unit_name, active)
- accommodation_rate_rules (id, accommodation_id, type_id, valid_from, valid_to, price_cents, min_nights, max_nights, weekend/season rules)
- accommodation_blocks (id, unit_id, begins_on, ends_on_exclusive, reason, created_by)
- accommodation_reservations (id, accommodation_id, unit_id, check_in, check_out_exclusive, guests, status, customer identity, idempotency_key, quoted_total_cents, quote_snapshot, timestamps)
- accommodation_booking_audit (reservation_id, actor_id, action, old/new status, happened_at)
- durable confirmation outbox integrated with existing queue only after reservation transaction commits.

Do not use a new schema until checked against current migrations, indexes and retention policies. All columns require venue/accommodation-level RLS, verified owner/admin authorization, localized date rendering and data-export/deletion support.

A reservation occupies every civil night in [check_in, check_out). Guard non-overlap at database level for active/pending holds and confirmed reservations; cancellations release occupancy atomically. Validate check_out > check_in, adults/children totals, eligible inventory and monetary quote server-side. Checkout never blocks its own checkout date. Concurrent requests for the last unit must never both succeed. Rate quotes need version/snapshot and explicit expiry. Implement Europe/Madrid date arithmetic rather than converting local nights into fixed 24h UTC slots; DST changes must not shift dates.

## Existing foundations

- PR #74: resource booking and recurring timed slots; does NOT provide overnight inventory.
- PR #75: customer timed-slot wizard, AkiBusiness booking inbox, account booking history, email queue; do NOT present it as complete hotel reservations.
- PR #78: accommodation claim and AkiDuermo HQ management foundation; check live seeded state before using test account.
- PR #79: tablet and split-window layout baseline.
- Current booking UI: src/components/BookingManager.tsx
- Current property dashboard: src/app/[locale]/business/venue/[id]/page.tsx; contains accommodation-specific disclosure.
- Current public stay routing: src/lib/akiduermo-routing.ts.

## Rollout and verification gates

Phase 1: property-aware dashboard and safe notices, dedicated editor tabs and navigation; test no accidental publication/booking.
Phase 2: additive room/unit/rate/range-inventory schema and owner actions, with disposable PostgreSQL tests and reversible migration.
Phase 3: AkiDuermo property listing display of verified room inventory, true range-calendar quote/reservation, guest tracking, access/export.
Phase 4: confirmation notifications, cancellations/rebooking and operational reports.
Phase 5: production migration, staged property playtest, actual authenticated E2E then rollout.

Required matrix: ES/EN, light/dark, signed out/owner/other-owner/staff, 360/390/600/768/820/1024/1280 CSS px, landscape, portrait and split-screen, Chrome PWA/browser, empty/inactive/full/loading/error/success, keyboard, physical tablet. Include two concurrent booking requests, DST/week boundary, min nights, partial unit block, rate changes, external link, disabled booking, cross-tenant RLS, email dedupe, Stripe untouched. Run npm run check, PostgreSQL acceptance, browser E2E, Cloudflare build. Do not merge code affecting customer reservations if tests are blocked, and never equate GitHub merge with verified edge deployment.

## Explicit non-goals unless separately approved

No payment capture/deposit processing, channel manager/OTA sync, travel platform commissions, tourist-tax accounting, passport data collection, room cleaning workforce assignment, or third-party property management integration in the initial implementation. No fake reservation availability or booking success confirmation.

## Implementation update: isolated room-night database foundation (2026-10-09)

The candidate migration `supabase/migrations/20261009220000_accommodation_inventory_foundation.sql` introduces property-owned room types, physical units, nightly rate ranges, reservation records and maintenance blocks. Active reservation date ranges exclude one another per unit. Blocks and reservations use a common per-unit lock to serialize overlap checks. Guest reservation writes remain denied; this **does not enable public or private booking**. It needs an explicit server-validated quote and booking RPC, capacity/active-state checks, audit/outbox, cancellation permissions, retention/export and authenticated UI.

The accompanying static contract test remains a fast guard. `scripts/test-accommodation-sql.mjs` now exercises the candidate migration and rollback against a disposable PostgreSQL 16 database with real roles/RLS, two-way block/reservation races, repeatable-read snapshots, last-unit booking concurrency, quote expiry/revalidation, idempotency, status authorization and outbox leasing. CI provisions its own isolated PostgreSQL service. Production migration and authenticated live acceptance are still separate gates.

## Implementation update: complete request-booking candidate (2026-10-09)

- Properties explicitly select Disabled, External HTTPS, or AkiDuermo request mode. Importing or claiming never enables booking.
- Public availability exposes only aggregate room-type inventory. Authenticated quotes cover every civil night, snapshot rates/policy for 15 minutes and are revalidated inside the booking transaction.
- `accommodation_request_booking` locks an available physical unit, enforces an idempotency key and prevents concurrent last-room double booking. No payment is collected; displayed totals include taxes and state pay-at-property.
- Owners/managers can confirm, decline, cancel, check in and complete valid transitions. Customers can view their own stays and cancel future requested/confirmed stays. Audit and durable confirmation outbox rows are private and tenant-scoped.
- The existing Resend dispatcher supports accommodation confirmations with separate provider idempotency keys. GDPR export includes stay reservations and quotes; profile deletion cascades them.
- Public and management UI is bilingual and responsive, but physical-device/PWA and authenticated production smoke checks remain mandatory after migration/release.
