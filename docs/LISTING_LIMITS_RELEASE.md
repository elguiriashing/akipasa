# Listing allowance release

Candidate only. No production migration or gate activation is claimed.

## Independent dependencies

Apply only `20261020170415_listing_entitlement_limits.sql`, not the huge pending
`20261012180000`/`20261012201529` historical suite migrations. It uses existing
profiles, venues, venue_members, events, event_occurrences, recurrence_rules,
venue_media, billing_subscriptions, staff_billing_grants, crm_workspaces,
crm_workspace_venues, storage.objects and the installed duplicate_owned_event RPC.
Read-only hosted inspection confirmed the key columns and legacy functions exist.
No subscription row, price or plan identifier is rewritten by this migration.

The private premium resolver preserves active/trial legacy business/business_pro
subscriptions and staff grants, with period boundaries. If an independently
installed `akisuite_private.plan_active(uuid,text,text)` exists, it supports that
optional ledger. A future replacement billing ledger must explicitly adapt this
resolver before moving customers; do not treat the legacy resolver as permanent
new-plan configuration. Administrator override is derived from profiles, never
user-editable JWT metadata. Service publication does not require an owner JWT.

## Activation sequence

1. Pass exact-head hosted CI, product build, SQL privilege audit and browser owner
   acceptance. Verify the independent AkiHQ management owner UI has compatible
   error/upgrade handling; AkiBusiness remains the paid operations product.
2. Record counts of existing media, events, subscriptions and published event-month
   history. Inventory >8 free-media listings and >5-day existing free events;
   preserve those records. No blanket customer data rewrite is needed.
3. Apply this single additive migration while its new gate remains false. Verify
   expected triggers/policies/RPC grants, compare counts and run advisors.
4. On a disposable PostgreSQL environment, use simultaneous independent
   transactions to race the fourth/fifth event and eighth/ninth upload. PGlite
   tests validate SQL paths but cannot establish real multi-connection acceptance.
5. In a controlled owner-session acceptance test, enable the private gate in a
   rollback-only transaction and exercise own/foreign listing paths, direct RPCs,
   duplicates, recurrence, cancelled/draft transitions and retained data. Ensure no
   outbound queue is dispatched from test records.
6. After acceptance, activate the authoritative gate:
   `update akisuite_listing_private.launch_settings set enabled=true where singleton;`
   The database immediately enforces limits across all applications and APIs.
7. Enable server `AKISUITE_LISTING_LIMITS_READY=true` in each compatible management
   deployment so `listing_limits_info` confirms current premium/allowance state.
   Verify EN/ES owner counts/errors/upgrade CTA and retained drafts after rejection.

## Resolution remains independently gated

Leave `AKISUITE_LISTING_RESOLUTION_READY` off. Browser preparation supports free
1920px quality0.8 and Premium3840px quality0.9; the upload action can inspect
PNG/JPEG/WebP headers and reject oversized images. Header inspection is not image
decoding/re-encoding, and direct authenticated Supabase Storage writes bypass it.
A server-owned authorized upload/reservation plus trusted decoding/processing path
must replace every venue/event upload path in all management apps before this
resolution feature is accepted. Do not activate it as a frontend-only control.
No new paid image service was provisioned. Media count quotas do not depend on it.

## Rollback

Disable only `akisuite_listing_private.launch_settings.enabled` and its matching
UI flag, then roll source back as needed. Keep media, event-month ledger, review
signals and customer records. Do not drop historical rows or replay old migrations.
A forward migration is required to replace installed policies/functions safely.
