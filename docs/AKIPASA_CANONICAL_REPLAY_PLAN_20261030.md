# Canonical replay plan: inventory and explicit stops

This is **partial planning tooling**, not a database runner, approved migration
application, current production chronology or evidence of full schema parity.
It changes no application, SQL, permissions, customer records or release gates.
The original95-path Creator and173-artifact databases remain untouched.

## Run without a database

```sh
node scripts/check-canonical-replay-plan.mjs --plan
node --test scripts/check-canonical-replay-plan.test.mjs
```

The first command exits **2** for a structurally consistent but blocked partial
plan, **1** for drift/invalid structure. It never returns successful release
readiness. No arguments also means plan-only; other flags, including `--apply`,
are refused. There is no database client, connection string, credential loading,
network request, subprocess or apply path in the checker. Its only reads are the
JSON manifest and regular SQL files in the two repository migration directories.
Tests use synthetic temporary files; their child processes invoke only Node's
plan-only CLI. No database is needed.

## What is pinned

`AKIPASA_CANONICAL_REPLAY_PLAN_20261030.json` records every current raw SQL path,
full SHA256, literal timestamp filename where present, classification, known
prerequisite edges and the explicit candidate prefix. The validator detects
added/removed/duplicate files, byte drift, invalid aliases, cycles, incorrect
order, omitted selected sources, missing stop boundaries and false completion
claims. SQL symlinks/traversal/outside paths are refused.

| Inventory classification   | Paths | Meaning                                                                                                                     |
| -------------------------- | ----: | --------------------------------------------------------------------------------------------------------------------------- |
| Reviewed candidate prefix  |    97 | 73 initial numeric application sources,22 later numeric sources and2 accommodation prerequisites; not executed by this tool |
| Unresolved                 |   151 | Must be classified/reconciled; neither omitted as unnecessary nor automatically admitted                                    |
| Exact-byte transport       |    87 | Supabase path matches a database source's full hash; not historical semantic equivalence or permission to apply twice       |
| Excluded historical bundle |     4 | Two explicitly pending/unapplied historical bundles, each present in both source trees                                      |
| Total raw paths            |   339 | 167 database-tree SQL paths plus172 Supabase-tree paths; not339 independent or eligible migrations                          |

The97-path order is only the checkpoint's known structural prefix through0102,
with both distinct0079 sources and the two accommodation sources before0085.
The0001–0073 order comes from the existing pinned Creator manifest. A sequential
prerequisite edge preserves that reviewed order; no naive timestamp/glob execution
is supplied. Later known Passport/map/booking/operating/coverage/security edges are
recorded but their unresolved sources are **not** silently appended to the prefix.

The application inventory fingerprint is
`f58a249d501697031942367be6cea23080a47c6323d8f66c3510131efb42dc63`:
sorted relative UTF8 path +NUL+binary SHA256(file), then SHA256 of the concatenation.
Both roots are independently fingerprinted. This detects inventory drift, not
policy correctness. Filename timestamps are explicitly not verified deployed
historical-version mappings.

The earlier scoped Creator evidence is **78 application SQL +17 official Storage
SQL =95 selected sources**, not95of167 canonical application migrations. The JSON
pins the scoped manifest's hash and17 external Storage snapshot names/hashes;
those snapshots are **not committed/admitted execution inputs**. The checker never
reads external QA paths. The immutable checkpoint and reconciliation artifact
hashes are provenance references, not claims that their uncommitted contents can
be reconstructed from this repository alone.

## Stops retained before any fresh reproduction

- Admit and verify the real pinned Auth/PostgreSQL/PostGIS/pg_cron/Storage
  baseline in a newly authorized pristine fixture. Keep internal no-egress,
  absent provider credentials and global `cron.launch_active_jobs=off`. Configured
  cron rows with `active=true` are not individually disabled by that setting.
- Before0074, create a new synthetic administrator through normal local Auth and
  the documented bootstrap. Do not invent a workspace, entitlement or paid state.
- Admit the three reviewed recovered operating sources with provenance and
  historical mappings before checkout lifecycle. Their recorded versions are
  20261016092914,20261016093118,20261016093336; their full immutable hashes are in
  the manifest. No recovered DDL is copied or re-executed here.
- Reconcile247 historical metadata entries:174 normalized committed matches and
  73 unresolved classifications (35investigation,29missing-source,1historical
  rollback,6transport variants,2committed successors). Normalization is not
  semantic or security equivalence. The applied historical rollback is not
  reclassified as unapplied merely because it sounds obsolete.
- Do not apply either excluded October12 suite bundle. The original173-artifact
  fixture contains them and is not clean canonical-library proof. Standalone
  library's historical-table refusal must not be weakened or bypassed.
- Place conditional account coverage only after reviewed foundations and inspect
  every required final signature/table/wrapper. Late forwards can create skipped
  targets or replace guarded bodies. Never reapply unchanged non-idempotent
  coverage to a retained proof database or delete policies to make replay pass.
- Preserve external AkiHQ/AkiBusiness ownership and source boundaries. Nine pinned
  external HQ artifacts are not verified equivalents of deployed-history bytes.
- Full final function/schema/ACL fingerprints, tenant/private-data/XP/check-in/
  booking/Auth customer journeys, independent reproduction and physical-device/
  reviewer acceptance remain separate requirements. None is asserted by a valid
  JSON inventory or successful source execution alone.

All stop records and required-verification flags intentionally remain unresolved.
The CLI is incapable of promoting them to verified complete status. A future
source-admission/reproduction change needs new review and evidence; changing
booleans in this partial plan is rejected.

## Current production boundary

The exact terms-record fix from PR335 is already applied once in production as
20261030102908; its source mirror20261029232451 remains pinned in this inventory.
This plan does not authorize reapplication, history rewriting, customer tests,
feature activation, provider messages, billing operations or another deployment.
Only a future pristine local baseline may use it after source admission and the
separate safety/acceptance conditions. Existing production protections and saved
identities/wardrobes must remain intact.

## Focused verification and limits

The focused Node suite covers real repository hashes, content/path drift,
duplicate/missing sources, excluded/unresolved/transport scheduling, false aliases,
order/cycle/unresolved prerequisites, missing bootstrap/operating stops, false
completion claims, unsafe paths/symlinks, evidence counts and CLI apply refusal.
The restricted sandbox's subprocess attempt failed without executing the suite;
the separate process-enabled run is the meaningful test result. Neither attempt
contacted a database. Root records final count/source/format/lint results in the
integration ledger; full application CI remains the integration owner's task.

## Recovered operating bytes now available for review

The three operating definitions are now immutable replay-only source artifacts in
`database/replay-only/recovered-operating/`, outside both migration roots. Their
separate checker pins retained-snapshot bytes and fresh raw-history SHA256/length
bindings with exactly one added terminalLF, no semantic normalization. The plan
inventory is now339migration paths (two new staff-gate mirrors added); this bundle is not automatically appended.
The three STOP records now reference admitted source, but resolved remainsfalse:
fresh ordering, later account guards, ACLs and pristine fixture proof are still
outstanding. Source integrity alone does not resolve those requirements. No DDL
was executed and no retained fixture or production history was changed.

## Staff claim account-boundary repair source

The new mirrored20261030114106source adds the existing central account gate to
staff's exact-claim lookup, after actualsource tests confirmed its list sibling
already denied pending/underage staff. Only the database source is a potential
execution input; its Supabase mirror is an exact-byte transport. Both are newly
inventoried, not production-applied or admitted into the97source candidate prefix.
Current totals are339migration paths:151unresolved,87byte transports,4historical
exclusions,97candidate-prefix. The plan still exits2and reports no canonical parity.
The separate recovered operating bundle remains outside these migration roots.

The read-only69DB-tail review further clarifies that coverage180946 must run once
after its intended pre-existing foundations but before representative-evidence234107,
which requires an already-wrapped capture body. Later forwards need explicit guard
closure. Never move coverage blindly after the whole tail, reapply it to a retained
proof DB, run both canonical/native historical alternatives, or treat prior fixture
passes as eligibility. Remaining source-order/exemption decisions stay unresolved.
