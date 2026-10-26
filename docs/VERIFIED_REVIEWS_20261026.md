# Verified adult and experience review policy — 26 October 2026

## Status and release hold

Provider-neutral foundation, not a launched review feature. Alex confirmed no age
verification provider is connected. Both AKISUITE_AGE_ASSURANCE_SCHEMA_READY and
AKISUITE_AGE_ASSURANCE_ENFORCED remain unset/false. No provider signup, paid
resource, live SQL, existing account backfill or rollout activation is performed.
Do not merge/deploy as a completed reviews/privacy rollout. Existing account,
tracking and check-in behavior is preserved until coordinated acceptance.

## Shared rule contract

verified-review-policy.ts is identical in Pasa, Duermo and Coches. Unknown age
and self-declared adulthood never equal verified_adult. Optional tracking needs
verified adulthood AND independent consent. Adult-content access and check-ins
require verified adulthood; check-ins additionally intersect account eligibility.
Reviews require an eligible complete profile, verified adulthood, no known
conflict of interest and caller/listing/product-matched server evidence. Pasa
needs an accepted visit, Duermo a completed stay, Coches a completed rental.
Cancelled/pending/revoked, future, malformed, wrong-user and wrong-listing evidence
fails closed. Submission is allowed before, but not at, 7 x 24 hours after the
visit or completed experience. UI must never supply authoritative policy inputs.
This is eligibility, not 2FA and not proof that an opinion is truthful.

## Backend and ownership

Only AkiPasa owns shared migrations. The new private attestation registry stores
an opaque provider proof reference, verified/expiry/revocation timestamps and
profile identity. It stores no ID image, DOB, document number or biometrics.
A provider adapter MUST authenticate its webhook, bind a previously created
session to the current profile, validate threshold/outcome, deduplicate events,
reject replay/reassignment and implement revocation before writing attestations.
No generic public endpoint accepts a client-submitted verified flag.

my_age_assurance() reads only auth.uid() and returns a boolean. Missing schema,
disabled rollout, expired/future/revoked proof and deleted identity never grant
verification. Private RLS/ACL denies browser reads/writes and operator settings.
The disabled check-in trigger adds verification without replacing geofence,
credential, cooldown, account, transactional XP or idempotency rules. Existing
historical records remain intact; account deletion cascades attestations.

This age proof does NOT implement person uniqueness. Provider proof-reference
uniqueness prevents reuse of that proof, not fresh checks by the same person.

## Required next implementation before activation

Select provider, confirm Spain/international document coverage, lawful basis,
DPIA/proportionality, retention/deletion and biometrics terms. Configure sandbox
only after selection; no production provider flag or fee is authorized here.
Implement signed provider flow, privacy export of own attestation metadata and
revocation/deletion lifecycle, independent verification UI and accessible appeal.
Keep avatars/bio optional; never demand unnecessary fields for completion.

Wire the same authoritative age result into ALL optional collection: anonymous
and authenticated API ingestion, client queues and identifiers, server trusted
behavior, personalization/ranking, ads/GA4 and revocation across open sessions.
The existing account helper and root GA loader have a staged enforcement branch;
that branch alone is NOT exhaustive privacy coverage. Default-off flags do not
change current analytics. Unknown-age visitors must get protected defaults once
this complete rollout is activated; verification never grants tracking consent.

Add classified restricted-content filtering to search/map/counts/direct pages
and APIs without arbitrary category censorship. Preserve privacy/export/deletion,
recovery, legal and sign-out routes for restricted users. Resolve minimum signup
age/parental-consent flows independently of the 18+ review rule.

Implement server-owned evidence adapters and review persistence with atomic
one-active-review-per-account/listing rules, edit history, rate/brigading controls,
conflict policy, neutral moderation, reports, business replies and appeal.
Owners cannot veto negative reviews; payment never removes a negative review.
External completed stays/rentals need an independently moderated evidence route.
No owner-supplied completion is automatically claimed as independent visit proof.

Require full source/CI/build and EN/ES mobile/desktop sandbox acceptance, direct
RPC/RLS bypass tests, provider failure/replay/revocation and exact-source release
checks across all three products before enabling BOTH app and database gates.
Never activate only one layer or infer provider acceptance from unit fixtures.
Rollback before activation is a source revert; retain the private empty schema.
After activation preserve verification restrictions and evidence; do not erase
customer records or disable guards as a shortcut.
