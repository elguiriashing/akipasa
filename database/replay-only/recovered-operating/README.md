# Recovered operating source: fresh-replay-only bundle

These three immutable project-history DDL snapshots are **source artifacts**,
not application migrations or an executable/current security baseline. Their
existence does not resolve the canonical plan's STOPs or prove schema parity.

**Do not apply this directory to production, add it to migration globs, invoke its
RPCs for screenshots, rewrite live history, or append it to either retained proof
database.** Recorded production versions already exist. There is no apply command,
database connection or migration runner in this bundle or its checker.

## Byte provenance

The protected originals were recovered through authorized read-only migration
history metadata and remain unchanged at0700(directory)/0600(files) in the local
QA evidence. Each retained snapshot is the exact corresponding raw-history SQL
statement **plus one terminal LF byte**. The raw-history byte lengths and SHA256
were freshly read by the integration owner around11:10UTC30October2026 from the
linked project. The child source-admission task independently verified the exact
byte relation locally. No customer rows or credentials were retrieved, and no recovered DDL was executed.

`PROVENANCE.json` separately pins each snapshot and raw-history hash/byte length,
version/name, one-statement mapping and the exact one-LF transform. Snapshot hashes
are deliberately **different** from raw-history hashes. No comments, whitespace,
case, encoding or other content is normalized. In particular, removing every
trailing newline would be wrong because original history itself may end in LF.
No independent original source commit or third-party license is invented: these
are reviewed recovered project DDL with explicitly recorded origin.

```sh
node scripts/check-operating-replay-sources.mjs --check
node --test scripts/check-operating-replay-sources.test.mjs
```

A successful checker exit certifies **source-byte integrity only**. Its output
continues to assert no standalone execution, mandatory current account coverage,
pristine-fixture-only use, no database capability, no fresh guard acceptance and
no full canonical parity. Apply-like flags are refused. The checker reads only
this fixed five-file package; it rejects extra SQL, traversal, symlinks, hash drift,
false readiness and modified raw-history bindings. Tests execute only Node and
synthetic filesystem mutations, never SQL.

## Dependencies and safety boundary

Preserve original order092914private location →093118organisations →093336rental
attachment. A future separately reviewed pristine baseline requires real pinned
Auth/roles/profiles, CRM0074and reviewed forwards, normal-Auth synthetic bootstrap,
and rental-company/member foundations20261014223000/20261015220302. These operating
types must exist before checkout lifecycle20261020172801. Internal no-egress,
absent provider credentials and global cron launchOFF remain mandatory.

These historical definitions create seven RLS tables and twelve empty-search-path
SECURITY DEFINER routines: ten public APIs and two private helpers. Existing public
API grants are authenticated-only; private request/audit rows and helpers deny
direct client access. Top-level statements include local PostgREST schema-reload
notifications. Intended function-body writes occur only if invoked later; source
admission is not permission to invoke them, create paid tools or test customer rows.
No embedded secret/customer literal, destructive top-level DML or provider call
was found during independent full-byte review.

**Historical verified identity/ownership checks are not current account eligibility.**
The historical bodies predate onboarding/terms/age wrappers. Keep account170448,
coverage180946 and identity190818 in the reviewed full order; verify every final
public API wrapper, trusted owner/search-path/ACL, all seven table RLS/client
denials, private helper denial and tenant/ownership/idempotency behavior before any
fixture API client can access the baseline. No conditional skipped target or later
body replacement may silently remove coverage. Do not reapply non-idempotent
coverage or drop policies in an existing proof database to obtain a green result.

Prior local replay/Auth/ACL receipts are supporting evidence; a fresh ordered
baseline, current guard tests, independent reproduction and separate release
acceptance remain incomplete. Existing production terms protection is already
applied; this bundle does not authorize another migration or security rollback.

## Scanner and deployment isolation

The inspected current sources do **not** automatically execute this directory:

- `scripts/check-canonical-replay-plan.mjs` inventories only the two migration
  roots; this package does not alter its337-path inventory or unresolved STOPs.
- `scripts/generate-system-inventory.mjs` discovers `database/migrations`, not
  this directory, and is static discovery rather than an SQL executor.
- `.github/workflows/sql-permission-audit.yml` selects only database/supabase
  migration-root SQL. Its Python auditor reads explicit arguments and cannot
  execute SQL. Passing these artifacts manually would be a read-only audit.
- Existing SQL test/install scripts use explicit named migrations/deployment
  manifests. `scripts/local-database.mjs` reads only `database/seeds/seed.sql` or
  `reset.sql`; the independent Automation Worker uses its own migration tree.
- No public application import, production workflow or migration-directory
  copy was added. A future broad `find database -name '*.sql'` executor would be
  unsafe and requires separate review; no such current path was found.

All scanners, workflows, app files, source migrations and canonical-plan flags are
unchanged by this bundle. Future admission into a reviewed fresh execution plan
requires an explicit source-node/checker change and independent guard evidence;
merely flipping a STOP or readiness boolean remains invalid.
