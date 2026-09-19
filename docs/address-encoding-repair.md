# Venue address country-label repair

The 19 September 2026 production audit found 74,990 venue addresses containing
`EspaÒ±a`, versus 377 containing `España`. Street accents in the reported record
were valid UTF-8. The malformed literal was already stored in Postgres; this was
not a font or browser decoding problem.

The migration replaces only that exact literal in venue addresses. The existing
administrator-only CRM publishing RPC normalizes the same literal before
matching duplicates and inserting venues, protecting against the separate legacy
gateway still sending it. Existing role checks and grants are preserved. Raw CRM
import records and historical backups are not rewritten.

Public repository reads and map popup details also normalize that literal.
Directions now prefer finite, in-range venue coordinates. Missing coordinates,
the repository's 0,0 sentinel, or invalid numbers fall back to the repaired address.
Google Maps URL parameters remain encoded by URLSearchParams. No transport mode
is forced: Google can offer modes suitable for the destination.

## Verification

Run `npm run check`. Spanish-address tests cover preserved accents, URL encoding,
valid coordinates, missing/out-of-range/non-finite coordinates and zero axes.
After applying the migration, check that no venue address contains `EspaÒ±a`,
that the publisher still rejects non-administrators, and inspect the reported
La Gondola venue's live page, popup API and directions destination.

## Rollback

The application commit can be reverted independently. Restore the publishing
function body from migration 0060 to undo its normalization, retaining its grants
and administrator guard. Keep repaired data: deliberately restoring a corrupted
country label is not necessary for a code rollback. No venues, slugs, ownership,
coordinates or CRM links are deleted or reassigned by this repair.
