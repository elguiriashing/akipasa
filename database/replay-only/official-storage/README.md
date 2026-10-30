# Official Storage replay-only sources

Unmodified third-party SQL from supabase/storage commit
`96aec65e7e22573befef05728327ad4d8e7207b2`, Copyright 2019 Supabase,
Apache License 2.0. Original LICENSE retained. No upstream root NOTICE exists at
this pin (HTTP 404 observed 2026-10-30). All 17 files were compared byte-for-byte
with official pinned upstream, original local QA files and scoped95 snapshots.
No SQL modifications or whitespace/newline normalization. PROVENANCE.json records
exact paths, SHA256, byte lengths and the snapshot alias for upstream0002.

This archive is outside application migration directories. The read-only checker
executes no SQL; exit0 certifies source integrity only. No standalone execution,
production migration admission, fresh ordered guard acceptance or full parity is
implied. No credentials/customer data were retrieved and no SQL was executed for
this archive. The preserved fixtures and source originals remain unchanged.

Future pristine replay requires reviewed official platform roles/schema, genuine
Auth, native Postgres/PostGIS/pg_cron and current account-guard target closure.
Use the explicit provenance order 0002–0009, **00010**,0011–0018; lexical sorting
is wrong. Storage schema must precede application0002/0067/0070 policies.0003
produces path_tokens;0013→0014 changes bucket limits;0018 produces owner_id.

The original SQL includes real privilege/ownership changes (including postgres
membership and service bypassRLS), legacy column/FK drops, function replacements
and an unqualified0011 trigger function.0015 defines a rollback-probe INSERT
function. These bytes must never be applied blindly to an existing fixture or
production. This is an upstream historical subset, not the complete current
Storage platform. The version-index guard in0002 references later upstream
migrations which are deliberately outside this archive.

Storage HTTP API/image/version admission remains unresolved: these SQL sources do
not certify upload/download or byte-path acceptance. No StorageAPI/image pull,
provider credentials, database changes, resources or networking are supplied.
