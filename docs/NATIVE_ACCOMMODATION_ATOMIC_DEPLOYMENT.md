# Disabled native accommodation deployment phases

This is a deployment representation of the **unchanged** canonical 001000,
002500 and 005500 migrations at `bea895b3ed1544d62aab92fa107a34aea42d45fb`.
It does not activate a product or apply SQL. The generator copies the verified
funnel SQL splitter locally with provenance; it never imports a sibling repository.
Run `node scripts/build-native-accommodation-deployment.mjs` to reproduce the
manifest and files in `database/deployments/native-accommodation`.

The 23 numbered transactions are at most 4,971 UTF-8 bytes each. Every transaction
sets local lock/statement/idle-in-transaction timeouts of 2/8/15 seconds and checks
that all installed native tables and Storage are empty and every native launch,
upload and inventory setting remains false before committing. No existing
customer, identity, billing, booking, ownership or consent row is updated.
Legacy `accommodation_private` remains untouched. Native tables/functions use
`accommodation_property_private` exclusively.

## Permission boundaries between transactions

Each table creation includes RLS and explicit PUBLIC/anon/authenticated privilege
revocation in the same transaction. Each function creation immediately includes
its canonical final execution controls, including the exact service-only receipt
boundaries. Private helper execution is revoked from PUBLIC, anon, authenticated
and service_role immediately. No changes to provider default privileges are made.
The final permitted authenticated RPCs retain their canonical disabled-feature
checks; a privileged administrator identity cannot use them while the gates are
false. The receipt functions remain service-only and have no reservations to use.

The first transaction installs a restrictive `ALL` policy on `storage.objects`
excluding `accommodation-media` for anon/authenticated, **before** the bucket can
exist. This intersects broad pre-existing permissive Storage policies for SELECT,
INSERT, UPDATE and DELETE, including attempts to move another bucket's object into
the native bucket. Other buckets retain their prior behavior. The hold is removed
only in the final transaction after all six permanent native Storage policies and
the service-upload evidence trigger are installed. The bucket stays private.

Preflight requires RLS on both Storage tables and rejects any applicable client
permissive bucket-metadata mutation policy. This avoids assuming a client cannot
change a private bucket to public. Existing Storage ACLs/policies are not rewritten.
The release manager separately confirmed the current bucket catalogue has RLS,
no bucket policies and no native bucket; that read is not a deployment receipt.

## Apply only after release-manager review

1. Verify source/mirror hashes and every phase byte count/SHA256 against
   `manifest.json`. Run the read-only `preflight.sql`. Stop for an existing native
   schema, nonempty native Storage, public bucket or unexpected bucket policy.
2. Apply **one numbered transaction per provider call**, strictly in manifest
   dependency order. Do not concatenate phases, use the old canonical migration
   as a shortcut, or independently apply canonical migrations after a partial
   phased install. The phase-specific history names are in the manifest.
3. Record the exact phase name/hash, provider migration receipt and postconditions.
   An ambiguous/hung provider response is not a failure receipt: inspect catalogue
   state and active transactions before retrying. Repeating DDL is deliberately
   not silently idempotent. A committed earlier phase remains closed when a later
   phase fails. Never drop native objects or delete unknown records to make a
   fresh-install preflight pass.
4. After all transactions, execute the read-only `readback.sql`: settings must be
   false, native tables/Storage empty, private bucket configuration correct, the
   temporary hold absent and all 26 native functions present. Check exact catalogue
   parity using the reviewed canonical contracts, not a function count alone.
5. Keep every native runtime readiness flag and database setting off. Authenticated
   owner/other-tenant acceptance, real Storage receipt behavior, hosted concurrency,
   reviewed listing entitlements and separate activation authorization remain gates.

The phase history records deployment of the canonical DDL by reviewed short
transactions; it must not falsely mark the original migration versions applied.
Do not automatically replay these files on already installed or populated schemas.
Recovery is to pause while all flags remain off and reconcile recorded receipts.
An interrupted deployment must retain its Storage hold until the final permanent
policies are verified; removing it early is not a rollback procedure.

## Local evidence and limits

The deterministic generator test verifies source/mirror integrity, every original
statement exactly once, file hashes, byte limits and transaction timeouts. Two
independent PGlite databases compare the complete final canonical versus phased
catalogues under ordinary defaults and hostile explicit PUBLIC/anon/authenticated/
service default grants. Comparisons include all 26 function definitions and ACLs,
tables/constraints/columns/RLS/ACLs, sequences, schemas, indexes, policies and triggers.

At every intermediate boundary actual anon/authenticated roles cannot read, insert,
update, delete or move native Storage objects even with an existing permissive
policy. Public native RPCs remain disabled for the existing administrator identity;
private helpers cannot be executed by client or service roles. Rollback-only probes
isolate RLS from the owner-controlled evidence trigger, then restore all objects.
An injected failure proves an entire phase rolls back. Existing legacy private
service access, old booking data and other-bucket Storage survive. Unsafe bucket
policies and unexpected native rows abort without deleting or modifying those rows.

These tests establish local SQL role/catalogue behavior, not hosted lock timing,
Supabase Storage API equivalence, real customer permission acceptance or production
activation. No linked/production database writes are performed by this change.

## Release-owner recovery observation

The release owner reported successful live phases00–20 while all native gates
remained false. The phase21 provider call returned SQLSTATE23505 for an automatically
generated migration-history version (`20261021142003`) colliding with phase20.
Readback independently showed phase21's body had committed: the explicit NULL
pagination guards were present, the Storage hold remained1 and all native gates
were false. A tool error therefore did not mean a transaction rollback.

The release owner reviewed **this exact phase21 only**: CREATE OR REPLACE of the
team reader, the same REVOKE/GRANT/NOTIFY and disabled/empty checks are idempotent.
A delayed replay can record an ordinary provider receipt after time advances;
no migration-history DML or fabricated repair receipt is used. An additional local
regression repeats exactly phase21, compares the unchanged catalogue, retains the
Storage hold, then finishes phase22 and matches canonical catalogue parity. It also
proves phase00 cannot be blindly replayed on an installed native schema. This
observation never authorizes retries of CREATE TABLE/schema/index or data-insert
phases. Final application and feature activation remain separate release gates.

## Completed disabled installation receipt

The release owner completed all23 transactions. Exact provider history versions,
manifest phase names/full SHA256 hashes and the independently queried final
readback are archived in
[the deployment receipt](receipts/NATIVE_ACCOMMODATION_20261021.json). The history
query returned exactly one matching receipt per manifest phase; phase21's reviewed
replay receipt is20261021142045 and the final phase22 receipt is20261021142249.
No migration-history repair or customer data update was performed.

An independent read-only query confirms all three database activation settings are
false, the12 business/receipt tables are empty (plus the single settings table),
26 native functions exist, the bucket is private with10MiB JPEG/PNG/WebP controls,
there are zero native Storage objects and the temporary hold is absent. The release
owner separately supplied unchanged legacy definition/owner/ACL fingerprint and
retained media/event/legacy-booking counts; those are labelled as release-owner
evidence rather than as observations from the independent readback query. This
is a disabled schema installation receipt, not feature activation or authenticated
production owner/other-tenant, Storage API or booking acceptance.
