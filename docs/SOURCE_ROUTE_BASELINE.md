# Source-verified route inventory: baseline 2026-10-09
This is a **GitHub master tree listing**, not confirmation of runtime behavior, permissions or deployment.

- Repository tree: **839 blob files**, **100** `src/app/**/(page|route).(ts|tsx|js|jsx)` route-entry files.
- Note domain counts overlap, because e.g. `admin/business-applications` belongs to both business and admin path filters; never sum category counts into totals.
- The static inventory scanner in `scripts/generate-system-inventory.mjs` produces per-file JSX tag, handler and integration references when run in CI; its output is an **artifact**, not yet an exhaustive semantic or runtime map.

## Verified representative route file groups
| Group | Source routes observed | Downstream risks |
| --- | --- | --- |
| Consumer / Account | `src/app/[locale]/account/page.tsx`, `profile/page.tsx`, `subscription/page.tsx`, `saved/page.tsx`, `privacy/page.tsx` | Supabase sessions, billing, roles, consent, saved catalogue |
| Auth | `src/app/[locale]/auth/page.tsx`, `auth/callback/route.ts`, `auth/recover/page.tsx` | Google OAuth, password accounts, redirect, conversions |
| AkiBusiness | `src/app/[locale]/business/page.tsx`, `business/apply/page.tsx`, `business/venue/[id]/page.tsx`, `src/app/api/business/claim-search/route.ts`, `claim-map/route.ts`, `map-tile/[z]/[x]/[y]/route.ts` | Claim flow, coordinate selection, permissions, ownership, tile and venue status |
| Admin / Staff | `src/app/[locale]/admin/catalogue/page.tsx`, `admin/users/page.tsx`, `admin/achievements/page.tsx`, `admin/passports/awards/page.tsx`, `admin/business-applications/page.tsx` | Server gate, audit, grants, moderation |
| Passport | `src/app/[locale]/passports/page.tsx`, `passports/places/page.tsx` | Achievements, city ranks, rewards, navigation |
| Pals | `src/app/pals/route.ts`, `pals/api/route.ts`, `pals/marker/route.ts`, `pals/analytics/route.ts` | Ownership, inventory, analytics and privacy; verify actual HTTP behavior |
| AkiDuermo | `src/app/akiduermo/page.tsx`, `akiduermo/stays/[slug]/page.tsx` | Host routing, translated listing display, map/booking |

## Required link tracing per feature
For each entry point, record: render tree; imported components; UI text/dictionary; control target; server action/API; validation and auth; Supabase RLS/RPC, cache and storage; events and analytics; tests and versioned migration. A route's existence is not proof that it is usable. All links must be confirmed from actual code; missing links are recorded as **unverified**, not guessed.

## Current CI evidence and limitations
- First contract gate workflow concluded **success** (GitHub Actions run 37866635750).
- First full public app verification concluded **failure** (run 37866635748), because `prettier --check .` rejected six newly added/edited files. No claims are made about tests after that failed formatting stage.
- A follow-on formatting workflow was added to the PR; verify its result and the subsequent full check before merge.
- This snapshot comes from the master tree as read on October 9; compare PR HEAD and live host deployment independently.
