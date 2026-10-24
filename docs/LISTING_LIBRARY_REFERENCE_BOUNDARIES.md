# Standalone library reference boundaries

Forward `20261021175000_listing_library_reference_boundaries.sql` targets the
installed standalone library233027. It does not replay the historical Premium
bundle, create ownership, change quota/entitlements or activate any feature.

Two actual-role regressions reproduced the prior behavior: anonymous discovery
could not read explicitly selected artwork owned by an unpublished source venue;
the source owner could directly delete its shared object or media row despite the
application's preliminary usage check.

The additional media/Storage SELECT policies use the existing selected-artwork
contract from the historical bundle: published destination venue slots with an
empty target, the stay header gallery, and selected event slots whose event is
published and belongs to that destination. Private bins, draft events, arbitrary
targets and other source images are excluded. Public reads are added only while
library_enabled is true; existing own/public source policies are preserved.

Before direct media/object deletion, server-owned triggers reject live placements.
Placement INSERT/UPDATE touches unchanged media sort_order and stored object name.
Bytes, paths and ownership do not change; provider metadata timestamps may advance.
The row writes serialize READ COMMITTED deletion and invalidate older REPEATABLE
READ snapshots, which fail with serialization error instead of missing a new
placement. An object/media deletion that committed first makes the placement fail;
a new placement that wrote first makes deletion wait, then reject. This covers direct
SQL/PostgREST/Storage callers, without relying on a client-side usage check.
Strict upload enforcement remains the prerequisite that denies browser byte/path
updates. All trigger helpers reject direct browser execution.

The existing explicit whole-venue deletion remains intentional: once its parent
venue was deleted, its media FK cascade may remove owned media and placements.
It does not delete Storage objects or transfer ownership to another business.
Archived library metadata, unrelated venue/event records and UUID tombstones
remain governed by014000 and the existing lifecycle. Ordinary source-media
removal requires first detaching its placements explicitly.

Seven local PGlite cases reproduce both failures before repair and cover public
scope, draft/bin exclusion, both direct deletion APIs, deleted-object placement,
helper grants and the exact existing owner venue-delete RPC. All28 focused SQL
cases (these7 plus existing21) pass. A separate hosted PostgreSQL job runs eight
races with independent connections and explicit READ COMMITTED / REPEATABLE READ
snapshots, asserting actual row-lock waits and safe errors for both operation
orderings of media/object deletion versus placement. That job must pass
on the exact source; PGlite alone is not claimed as concurrency acceptance.
Real authenticated provider byte-path acceptance remains separate and gated.

Canonical prerequisites:170415,173552,233027,003500,004500 and014000. Root owns
production DDL review/application. No live SQL, flags, data or deployment changed
here. Keep library_enabled false until strict provider acceptance and release
checks pass. Safe feature rollback disables the library while preserving all
rows/policies; do not replay table creation or erase retained quota history.

The still-unapplied175000 copy in this child replaces the initial262 KEY SHARE-only
approach. The old commit remains immutable; apply only the corrected child SQL.
The existing strict SQL receipt→service completion→owner media/placement fixture
also loads175000 with170415/173552/003500/004500 to exercise all installed guards
without weakening receipt, identity or Storage write enforcement.
