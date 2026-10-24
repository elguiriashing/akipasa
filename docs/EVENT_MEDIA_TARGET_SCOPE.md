# Event artwork target scope

A confirmed preexisting integrity bypass works while listing/library gates are off:
an ordinary owner can INSERT a placement using their own venue/media but another
business's public event UUID as target_key. Existing0090 RLS authorizes the venue
field only. Discovery previously requested placements by event UUID and trusted
the target without intersecting its venue; a late sort_order could replace the
other business's event artwork. The event detail reader already filters venue.

Forward184000 validates every new/edited event\_\* placement against its actual
UUID event and venue, retaining ordinary venue-member/staff authorization and
privileged service handling. Draft event bins and normal matching slots remain
valid. Non-event slots are unchanged. The trigger has no browser/service EXECUTE
grant. This structural security fix is independent of Premium activation.

Discovery additionally intersects each placement with the authoritative venue of
its specific event before using/signing artwork. Checking only the overall list
of visible venues would not suffice when both businesses appear in one result.
Historical mismatches remain stored and can be cleaned up by their authorized
owner; discovery ignores them. No events/media/objects, ownership or paid access
are deleted or reassigned. Existing event relocation behavior is unchanged; stale
associations cannot supply artwork to a different venue's current event.

Five PGlite cases execute the actual0002/0090 policies, reproduce the original
non-owner insertion/public lookup and verify the forward guard, historical-row
preservation/cleanup, valid draft bins/seven slot kinds, malformed targets and
helper/destination isolation. Two actual Supabase SDK discovery regressions cover
foreign artwork with/without a legitimate selection while both venues are visible.
The existing60 repository cases pass. The new SDK cases join the normal test command.
Hosted exact-head CI and root schema/release review remain required.

Apply only new184000 after review; no prior listing migration is replayed. No live
schema, flags, customer data, provider API or primary branch was changed here.
Keep the narrow reader intersection on any source rollback; removing it restores
the confirmed public integrity issue. This fix does not activate the shared library.
