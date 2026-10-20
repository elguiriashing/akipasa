# Account completion release checkpoint

## Candidate contracts

- `my_account_onboarding()` returns the caller's private eligibility receipt:
  `exempt`, `pending`, `complete`, or `underage`, plus their own timestamps and
  terms version where present. It accepts no arbitrary identity parameter.
- `complete_account_onboarding()` locks the caller's cohort row, validates the
  exact operator-approved terms version and writes profile/completion atomically.
  A negative declaration cannot be self-service reversed.
- `account_features_allowed()` is the shared database guard. Existing accounts
  with no cohort row stay eligible; no historic profile is declared adult.
- `AKISUITE_ONBOARDING_SCHEMA_READY=true` enables application reads after the
  migration. The database cohort remains disabled until trusted operator
  configuration supplies a future start and an approved terms version.
- `/en/onboarding` and `/es/onboarding` serve completion; `/onboarding/privacy`
  under either locale preserves privacy, export, deletion request and sign-out.
  Legal routes and password recovery do not depend on completion.

## Release gates

The additive migration is mirrored under database and supabase. Do not replay
old migrations or activate the cohort as part of applying this candidate. Confirm
all referenced existing tables, profile grants, private schema exposure settings
and advisors in the correct Supabase project. Run rollback-only role tests and
concurrent completion requests against a disposable real PostgreSQL instance.
PGlite tests validate SQL/ACL/transaction semantics but do not establish hosted
PostgREST, network or cross-connection acceptance.

Five independent products must read the same state and safely route pending users
without relying on third-party cookies. Cover direct RPC reads/mutations beyond
the explicitly protected activity tables. Complete email and OAuth signup,
restricted privacy/export/deletion, avatar upload, support review and member role
journeys using a disposable account in a nonproduction acceptance environment.
Test EN/ES at 360px, tablet portrait/landscape, desktop, keyboard, light/dark and
provider failures. Professional legal review must resolve the memo's open items.

## Rollback

Before cohort activation a source revert is sufficient; keep the empty additive
schema. After users are enrolled do not simply disable source guards or delete
negative declarations: retain an eligibility-compatible app build, stop new
cohort enrolment with a reviewed operator change, and investigate the fault.
Never erase customer media, progress, acceptance receipts or account data as a
rollback. The privacy export includes the caller's onboarding receipt once
schema readiness is enabled.

## Status

Implemented candidate. The dedicated onboarding suite passes 24 tests: pure
validation/redirects, server guards and email/OAuth callbacks, rendered EN/ES
controls, denied Google consent signals, direct analytics refusal and PGlite
private ACL/legacy-definer mutation protection. Existing auth-security (7) and
privacy-consent (21) focused tests also pass.

Full `npm run check` passed 31 vendor/source tests, repository-wide formatting,
lint and TypeScript before entering the broad application suite. The run was
stopped to avoid contention with simultaneous mission checks after an existing
Spanish-integrity case exceeded its five-second timeout under load; this is not
a full passing check. Rerun with bounded resources/hosted CI on the final head.
The initial `playwright install chromium` downloads were truncated. A subsequently
available local Chromium binary ran 32 actual-component/CSS responsive fixture
cases: EN/ES, pending/restricted, light/dark and 360×800, 800×1280, 1280×800,
1440×900. Horizontal overflow, declaration visibility, reachable sign-out and
keyboard focus passed; phone/desktop screenshots were inspected. Identity and
actions are explicitly disposable adapters, so this is presentation evidence,
not live signup/OAuth, provider delivery or full-shell acceptance. Hosted CI now
runs the same reproducible fixture and uploads screenshots/evidence.

Broad core suite results were 633/635 passing with two existing five-second
cases timing out under simultaneous mission load (map IndexedDB and Spanish
integrity). A bounded retry passed all 10 map cases; the Spanish PGlite case
still exceeded five seconds. No timeout or test contract was relaxed.

Not applied, merged, production verified or activated. No live data or
configuration changed.
