# Retained media identity guard

The Premium shared library retains exact cross-venue placements through downgrade.
Its original retained-grant key referred to a media UUID, while the media update
guards protected venue/path but omitted the primary key. An authenticated owner
could delete placements and media, insert a different stored asset with the old
UUID, and regain a grandfathered cross-venue placement without Premium. A valid
new strict upload receipt did not bind the chosen media UUID either.

The actual-role regression first reproduces that delete/recreate/placement sequence
before applying the forward-only `20261021003500` guard. Once library enforcement
is enabled, every media primary-key change is rejected and an INSERT of any UUID
retained in the private reuse ledger is rejected, including upserts. The indexed
ledger remains intact when media are deleted. New UUID uploads, ordinary metadata
updates and restoration of the exact existing retained image remain supported.
No existing media, placement, receipt, permission or paid entitlement is changed.

The regression also enables strict uploads, verifies authenticated Storage UPDATE
cannot change the old object's metadata, and denies direct authenticated INSERT.
It obtains a valid new service-verified receipt and demonstrates that INSERT with
the old retained media UUID is still rejected without consuming that receipt.
The server adapter only writes generated reserved paths with upsert:false and
checks downloaded byte hashes; service credentials are never available to owners.
The fixture does not claim actual provider Storage overwrite acceptance.

Validation:4 actual-role forward-guard cases plus7 original library cases pass;
SQL permission audit0 findings. Apply only after the standalone library schema233027
is installed default-off. Deploy and verify both consumers, apply this forward
guard, then complete controlled actual Storage/owner acceptance before enabling
the library. Keep count and strict upload acceptance requirements independent.
Rollback disables the library flag before consumer rollback and preserves the
ledger, media and guard. Never resurrect deleted UUIDs or delete historical data.
