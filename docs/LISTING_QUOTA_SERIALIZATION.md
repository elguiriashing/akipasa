# Listing quota snapshot serialization

Forward181500 targets the already-installed170415/173552/233027 contracts.
Advisory locks serialize writers but do not refresh an existing REPEATABLE READ
snapshot. Two transactions can otherwise both see a spare fourth event/eighth
image slot even after waiting for the same advisory lock.

A private per-venue/channel revision row is inserted/upserted immediately after
the existing advisory lock and before quota reads. Existing channels2(media) and
17(events) remain unchanged. REPEATABLE READ conflicts fail40001; the caller must
retry in a fresh transaction and then observe the exhausted quota. No existing
venue/profile row is touched and no backfill is needed. Scopes disappear only
with their explicit venue deletion; media, event/month history and owners remain.

The migration patches exactly six installed function anchors: event enforcement,
media insertion, legacy direct Storage allowance, private reserved-upload engine,
library media and library placement guards. It reads each actual installed body
and retains all authorization wrappers. An unknown/multiple/already-patched anchor
aborts the entire migration. OID, owner, ACL, search path, SECURITY DEFINER and
volatility are checked unchanged after replacement. New private state/helper have
RLS and no browser/service grants. No package, grandfather, date, draft or paid
access policy is replaced.

Six local cases cover refusal/rollback on unknown bodies, exact function metadata,
default-off behavior, eight-photo accounting, four Madrid-month events, existing
media preservation, every media path with a verified service receipt and helper
isolation. The existing19 listing/UUID/upload SQL cases also pass. A separate
actual PostgreSQL workflow runs RC/RR fourth/fifth publications, eighth/ninth
reservations and legacy direct Storage races (six cases), including first scope
creation from an older snapshot and fresh retry rejection. Hosted exact-head
acceptance is required; PGlite is not used to claim independent-session races.

This is separate from175000 reference deletion protection. Both guards are needed
before library activation. All flags remain untouched; no production migration or
customer data change was performed here. Apply only after exact schema/source
review. Do not replay170415/173552/233027. Safe feature rollback retains the private
scope helper and existing function bodies while disabling the relevant gates;
never erase monthly quota tombstones or weaken strict byte enforcement.
