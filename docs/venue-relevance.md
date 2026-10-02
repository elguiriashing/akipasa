# Venue catalogue relevance

The October 2026 full audit covered 75,367 published venues. It proposed 1,960
chain/general-fitness downranks and five town-hall discovery/search exclusions.
Another 2,018 records require review and 11 have historical closure signals.
There were zero source-confirmed accommodation moves. No venues are deleted,
archived, merged or moved merely because their names suggest an irrelevant use.

## Effective behaviour

`venue_relevance` is an admin-controlled feature flag, defaulting to false until
proposals and tests have been loaded. When enabled, approved `discovery_enabled`
and `search_enabled` values control lists, map markers and discovery candidates.
Chains remain searchable; direct published venue pages remain accessible.
Recommendation weight affects nearby order before pagination and personalized
organic scores. Weights never pretend to measure popularity. Sponsorship stays
separately labelled. Accommodation membership and routing are unchanged.

Private `catalogue_relevance` tables store runs, proposals, brand rules,
approval metadata and append-only decisions/before-images. RLS is enabled and
anonymous/authenticated roles have no schema/table access. Public venue columns
contain only effective policy metadata. A trigger prevents venue owners from
editing these admin projections. Service-only RPCs check the administrator's
profile role independently of the web endpoint's authenticated role check.
Mutations require same-origin requests, a reason and an unchanged fingerprint.

Admin review is at `/en/admin/venue-relevance` or `/es/admin/venue-relevance`.
Keep, lower-priority and hide decisions preserve URLs and log before-images.
The screen does not delete/archive venues or blindly move hotel restaurants.
Manual overrides are protected from subsequent bulk classifier applications.
New/edited venues and CRM venue links generate versioned proposals through a
private trigger; imports cannot silently overwrite approved classifications.
The incremental policy is intentionally more conservative than the full audit.
Unknown sources, sports offerings and hotel/restaurant conflicts await review.

## Audit and apply

The standard-library classifier lives in `scripts/venue-relevance/`. It consumes
an authorized snapshot and produces explainable dry-run CSVs; it never writes
to production. Extraction templates are provided alongside it. Do not commit
production snapshots or per-venue apply payloads to Git.

A full-run apply checks the original name/address/updated_at before staging and
the venue fingerprint, approved subset, manual overrides and current ownership
before applying. All modifications append before/after images. Only KEEP,
DOWNRANK and HIDE proposals from an explicitly approved full run are applied;
REVIEW, CLOSED/ARCHIVE CANDIDATE and accommodation conflicts stay unchanged.

Coordinate clusters and duplicate candidates are evidence for later investigation,
not instructions to merge branches or overwrite pins. Source categories and
brand names can themselves be wrong. No current closures were independently
verified. The 253 accommodation-name conflicts may be hotel restaurants.

## Rollback

Disable `venue_relevance` in admin settings first. Query paths then ignore the
stored policy; direct URLs and classification history remain available. Map
caches may retain older policy markers until their normal refresh. A new map
cache namespace isolates this rollout from the previous marker dataset.
`database/operations/rollback-venue-relevance-queries.sql` restores previous RPC
bodies if needed. For a data rollback, restore only before-images whose current
projection still matches the batch after-image; never overwrite a later manual
review or an owner edit. Keep audit history. Do not drop venues or dependent data.

## Rollout validation

The approved full run stores all 75,367 proposals and 73,338 reversible
classification decisions: 71,373 KEEP, 1,960 DOWNRANK and five HIDE. The 2,018
REVIEW and 11 closure candidates remain unchanged and pending. All venue input
fingerprints match the audit snapshot; all 21,000 accommodation records remain.

`npm run check`, the 15 Python classifier tests and the two focused Playwright
relevance checks passed. The broad browser suite contains existing failures
against older homepage/navigation/passport contracts and local-environment
expectations; it is not a green release-wide browser certification. The focused
checks cover the new admin gate/API protection and current discovery, map,
accommodation toggle and passport navigation. Credentialed administrator browser
acceptance requires a disposable QA account; database administrator decisions,
stale checks and manual-override protections are covered by integration tests.
