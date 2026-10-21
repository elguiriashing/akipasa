# Listing library deletion compatibility

Forward migration `20261021014000_listing_library_deletion_compatibility.sql`
requires the already-installed listing limits170415, verified uploads173552 and
standalone library233027. Do not replay those table-creating migrations.

The existing0060 owner and operator deletion RPCs remove events, then their venue.
New NO ACTION library/receipt foreign keys prevented these authorized workflows.
The regression suite executes the original function bodies, reproduces both
library blockers and the event-receipt blocker, and verifies the repair without
changing those RPCs, their confirmation/reason requirements or their grants.

Template and folder venue/workspace references become nullable with SET NULL.
Their snapshots/metadata remain archived. Existing source venue AND workspace
membership predicates exclude archived records from listing/reuse; clients cannot
reassign them or read their raw rows. Workspace deletion receives no new grant or
API. No current dedicated workspace-delete RPC was found: this change removes
only the new library blocker from reviewed operator deletion, preserving all
other existing financial/operational retention restrictions.

Upload receipts are nonfinancial upload evidence: deleting an event detaches its
receipt while preserving venue images; deleting its venue or uploading profile
removes that receipt. Profile deletion does not delete business media, objects,
other owners or template snapshots (the existing created_by link becomes NULL).
No owner transfer occurs. Quota/reuse UUID tombstones remain intact. The migration
does not delete Storage objects or change existing media cleanup policy.

Validation: seven PGlite actual-role scenarios use original0060 owner/staff RPCs,
cover unauthorized/invalid confirmations, both venue deletion paths, event
removal, inaccessible archived snapshots, workspace detachment and profile
erasure after a verified SQL receipt/media flow. Original library7, media identity4
and strict-upload prerequisite3 cases also pass. This is local SQL acceptance,
not authenticated production Storage acceptance or whole-account erasure approval.

Apply atomically after exact-head review. Existing flags remain unchanged. Parent
release coordination owns live DDL; no production mutation was performed here.
Reverting SET NULL to NOT NULL is unsafe after legitimate deletion and is not an
automatic rollback: keep this compatibility fix and disable feature gates if a
separate product issue appears. Do not restore deleted ownership or scope.
