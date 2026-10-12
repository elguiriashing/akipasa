# AkiPals playground release — 12 October 2026

## Requested outcome and observed starting point

Alex requested six specialist workstreams for `/pals`: interface, character and
clothing themes, game systems/retention, playable minigames, integration
supervision, and testing/polish. The release is explicitly authorized to merge
to `master` and deploy for his playtest after verification.

The starting commit is public-site `master` at
`554aeca23724e5049b4def403c48119e4f8b8f35`, isolated on
`feature/akipals-playground-overhaul`. Live browser inspection returned the
expected private-preview sign-in page, not authenticated gameplay. The existing
source is a standalone nonce-protected HTML/CSS/JavaScript preview, ten original
families, 61 legacy-compatible designs, schema-1 saved equipment/wardrobe,
banked daily parcels, ten three-scene adventures, achievement rewards, and an
existing own-account opt-in map companion.

## Dependency and ownership trace before implementation

- `src/app/pals/route.ts` -> protected `previewAccess()` -> nonce-protected
  `previewHtml` from `src/components/pals/preview.ts`, `styles.ts`, `client.ts`.
- `GET /pals/api` authorizes the user, initializes only a missing own save, then
  `src/lib/pals/view.ts` serializes engine state, derived values and catalogue.
- `POST /pals/api` verifies origin/body/schema and account access, checks save
  version and existing command IDs, applies server-time domain actions, and
  commits through `pals_commit`. The database owns the row lock, version and
  idempotency ledger. The client never supplies final balances or rewards.
- State is `pals_states.state` JSONB; command history is `pals_commands`.
  Protected administrator role or unexpired own preview invitation controls
  access. Schema-1 extension fields must be optional for historical saves.
- `engine.ts`/`catalogue-legacy.ts` -> existing catalogue/reward/entitlement
  boundaries -> `art.ts` and `render-snapshot.ts`. Existing design identifiers,
  item ownership, earned-only prestige and all ten families must survive.
- Achievement sync reads verified `my_achievement_progress`; no arbitrary
  achievement claim is accepted. Preview analytics remains the existing
  non-blocking, allowlisted private endpoint; no new external tracking.
- The existing map consumer and portrait endpoint consume the renderer. Art
  changes must preserve compact rendering and unique SVG IDs. No new map,
  location, public profile or social-sharing integration is requested.
- Other portals, claims, bookings, email, payments, public discovery, sitemap,
  authentication/session permissions and loyalty data are outside this change.
  `/pals` remains unlisted, noindex, private/no-store and authorized server-side.

## Workstreams

1. Interface: responsive collector studio, coherent navigation and usable touch
   targets, dialogs, focus and reduced-motion/light/dark treatment.
2. Art: stronger family expressions, garment silhouettes and curated looks
   through the existing original vector renderer and stable catalogue IDs.
3. Systems: non-decaying bond progression, care interactions and explicit
   server-authoritative daily/weekly goals, with backward-compatible saves.
4. Minigames: interactive play integrated with the same navigation and save
   boundaries: Memory Mix (six matching pairs) and Trail Finder (a five-by-five
   route through three stars to a flag).
5. Supervisor: independent review of integration, contracts and release risks.
6. QA: real-rendering interaction and device coverage plus regression checks.

Only four agents can be active including the coordinator, so these six roles
run in waves with explicit file ownership. They do not independently merge.

## Implemented release

The responsive collector studio uses a navy/orange dark theme and cream light
theme, stored as a device preference. Its Hideout puts the Pal, bond progress,
care and goals together. Desktop has a navigation rail; smaller screens have
Hideout, Wardrobe, Stories, Arcade and More. Wardrobe, workshop and shop have
working name, slot and family-signature filters. All ten families retain their
identities and compatible wardrobe while gaining distinct expressions, garment
silhouettes, original details and collectable four-piece signature looks.

| Activity                                          | Reward and limit                                                                       |
| ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Snack, Play, Chill                                | 5 XP per activity per UTC day; repeats remain available without further XP.            |
| Daily care/style/play checklist                   | 25 Threads, 10 Scrap, 15 XP per completed day.                                         |
| Three distinct stories in a UTC Monday-based week | 70 Threads, 30 Scrap, 40 XP; practice stories count.                                   |
| Memory Mix or Trail Finder                        | 20 Threads, 8 Scrap, 10 XP once per game per UTC day; further games are free practice. |

Bond ranks use existing permanent XP and never decay. Completed checklist and
weekly bonuses wait across resets until collected. Arcade interactions are
local; start and finish use the account API. The server replays at most 128
cell indices against its saved UUID/board, computes scores, consumes completed
runs and grants rewards atomically. Moves survive same-tab refreshes through
session storage; another device resumes the board with fresh local moves.

The new journey/arcade fields are optional schema-1 extensions. No migration,
new dependency, paid feature, public/social surface or entitlement reset is
introduced. The English-only private-preview label remains explicit.

## Independent supervisor findings and resolutions

- Fixed the existing story-card string precedence error that could omit the
  story text and Start button.
- Namespaced repeated family SVG artwork in each arcade card/cell to keep
  gradient and clipping IDs unique within the document.
- Restored equivalent focused controls after equipment modal saves and the
  equivalent opener after close/Escape. A separate browser probe reproduced
  the defect and verified module-selector, keyboard Upgrade and opener focus.
- Let passive toast content pass clicks through while preserving interactive
  Retry controls. Browser acceptance reproduced the blocked phone savings-goal
  click before the fix and passed it afterward.

The supervisor independently reviewed save compatibility, command replay,
reward limits, access boundaries and responsive screenshots. No remaining
blocking source issue was identified; release gates remain the coordinator's
responsibility.

## Acceptance and rollback

Test small phones (including 360 px), tablets in both orientations, split/short
viewports and desktop; dark/light, keyboard, reduced motion, loading/offline,
failed/ambiguous writes, successful actions and preserved progress. Preserve
the existing localized public AkiPasa site and preview auth destination.

Required gates: focused engine/art/integration tests, playable browser
acceptance, `npm run check`, affected end-to-end tests, Cloudflare packaging,
current-master integration and CI. Record actual pass/fail/blocked evidence
below before merging; never describe local mocked gameplay as authenticated
production verification.

Rollback is an application revert that retains preview saves, entitlements,
commands and cosmetics. Do not delete production data or weaken the preview
gate to make testing easier. No migration is currently planned.

## Verification record

- `npm run check` passed: formatting, ESLint, TypeScript, 603 automated tests
  across the application/Pals/database-conflict/automation suites, local
  database safety, automation Worker dry-run and Next production build.
- The Pals portion contains 93 tests across eight suites. Fifteen exercise the
  actual GET/POST route with a disposable account/storage adapter, including
  access denial, strict schemas, forged rewards/scores, version conflicts and
  response-loss retry after committed care and arcade rewards.
- Four tests apply the existing preview SQL migration to disposable PGlite.
  They check own-row RLS, denied direct writes/commit execution, real atomic
  version increments, duplicate UUID replay, stale-version rejection and
  rollback. These local transactions do not touch production data.
- Read-only inspection of the linked deployment database found two schema-1
  saves and confirmed the deployed commit function/row lock, RLS and grants:
  anon/authenticated cannot update saves or execute `pals_commit`; the service
  role can. No production save, invitation, identity or migration was changed.
- The real Chromium Pals harness uses actual preview HTML/CSS/client, renderer,
  engine and payload with loopback-only disposable HTTP/storage. It is not an
  authenticated production test. All 15 final scenarios passed, including both
  games at 360×800, 390×844, 820×1180, 1180×820, 640×400 and 1440×900 in both
  themes. The run completed 32 games and 298 mutation requests with 297 commits
  (one safely replayed UUID), zero JS/adapter errors, duplicate SVG IDs or
  horizontal overflow. It covers care, goals, stories, filters, inventory,
  module/appearance/merge/scrap, export/reload, keyboard and interrupted saves.
- Final focus/toast/arcade-resume changes passed scoped formatting, ESLint and
  full TypeScript checks, an independent focus probe and the complete browser
  matrix. GitHub's public-app check repeats the full gate on the proposed head.
- Cloudflare OpenNext packaging and `wrangler deploy --dry-run` passed in an
  isolated source snapshot with its own lockfile installation. All 562 runtime,
  configuration and dependency-source files match the proposed release. An
  earlier attempt using a shared dependency symlink failed to externalize
  native Sharp; installing the unchanged lockfile inside the build root
  resolved it without changing source, dependencies or build rules.
- The general `npm run test:e2e` suite is **not green** in this environment.
  Its initial run could not start without Supabase configuration. A rerun
  using the repository's disposable fixture/loopback settings reaches the
  tests but reports missing catalogue data and existing selector/expectation
  failures. The supervisor reproduced two failures on untouched `master` at
  the starting SHA, with byte-identical error details: the discovery test
  expects the obsolete “What's happening?” heading; the Passport test's
  non-exact “Open passport” locator also matches “Open passport menu”. Those
  two baseline results do not establish the cause of every other failure.
  No unrelated site tests or gates were weakened. The PR records the complete
  broad-suite outcome and CI status alongside the passing scoped acceptance.

Release marker: `X-AkiPals-Release: 2026-10-12-playground-r1`. The live smoke
workflow waits for this marker before accepting private page/API/portrait
responses, rejected forged preference/cross-site/anonymous writes, public EN/ES
homepages and sitemap exclusion. Deployment and authenticated live gameplay
are not implied by local checks. The final PR release record carries the
observed live result after the authorized merge.
