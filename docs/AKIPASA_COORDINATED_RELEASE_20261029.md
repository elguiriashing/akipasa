# Coordinated AkiPasa engineering release — 29 October 2026

## Source and ownership

The four transferred handoffs are consolidated into one candidate based on current `master`. UI handoffs 2 and 3 are one workstream; the newer human-avatar identity direction supersedes all mascot/game presentation. Historical saves and earned ownership remain preserved.

| Workstream          | Preserved source                                  | Combined behavior                                                                                          |
| ------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| UI                  | PR #326, local `ac1cd7e0`                         | Shared consumer and operational shells; sponsored class/disclosure fix; responsive creators and navigation |
| AkiPals             | PR #327, local `d6d4edef`, `7a0e9642`             | Private EN/ES 3D identity, real controls, own-account saving and export, valid mirrored SQL                |
| Tonight             | PR #328, local `82a434bd`, `24a716e7`, `f740a7aa` | Default-off server gate; absolute Madrid night filtering; accessible localized controls                    |
| Passport            | Already merged PR #329                            | Optional own-user informational weekly milestones; no new XP/reward writes                                 |
| Independent cleanup | PR #331                                           | Original #299/#325/#304 ancestry; three-app selector; gated founder notices; patched automation Node       |

All ordinary billing, rewards, roles, consent, venue ownership, RLS and check-in authority remain server controlled. No paid campaign, cosmetic checkout, location sharing, invented event inventory or customer email activation is included.

## Independent review and repairs

Static review found and the candidate repairs invalid avatar migration dollar quoting, missing Supabase mirror, omitted avatar export, a stale mascot entrance, and a commit-message-triggered alternate deployment path. The alternate release workflow and temporary one-shot source/formatter packaging helpers are retired. The canonical manual production workflow retains its strict route gate and existing bindings/source verification.

## Evidence and limits

- The cleanup source passed full `npm run check`, 2,115 Vitest cases, optimized Next build and 12 real Chromium selector cases.
- UI source passed its full check (2,133 Vitest cases), 208 public route captures, all original 89 route-definition HTTP probes, 10 booking guest-return cases and 48 actual creator-component cases. Finite-transition screenshots and phone-label/empty-state repairs require the final combined rerun.
- Pals source passed 123 tests including actual SQL replay/role isolation; real Chromium EN/ES save/restore and reduced-motion cases at 320/390/820/1440px. The artwork remains a prototype below the approved premium visual target.
- Tonight source passed 22 focused tests, 12 Passport read-recovery and 5 weekly timezone cases. Original 10 dev-browser cases passed across two server runs; expanded 22-case responsive suite awaits the final integrated build.
- Root integration regressions passed caller-filter/order avatar export and all classified route families. A prior root check reached build while a merge was in progress and correctly failed on transient conflict markers; it is not final-source evidence.

Full combined-source check/build/browser and hosted CI receipts must be recorded after source freeze. Tests on individual worktrees do not certify the integrated commit. Fixtures are explicitly synthetic; they do not establish production authentication, device intent dispatch, live map-provider rendering, or inbox delivery.

## Current production and release holds

Cloudflare readback at coordination start: deployment `711ac10d-2d3e-431c-9854-8acbbaa83ff1`, version `0e01401f-743c-4d15-9c4a-9ffc2ff49d99`, production endpoint source `0d1fac5d09bd13dff6fa5ec44bd84146ff90d5e5`. This is a rollback/baseline receipt, not a claim that the combined redesign is live. PR #304 subsequently merged as source-only CI maintenance.

The integrated matrix inventories **103 pages: 90 in scope and 13 other-product exclusions**. No route has been mass accepted. Final responsive screenshot/functional acceptance, real authenticated journeys, Android/device return and private-avatar artwork acceptance remain mandatory. `npm run release:pasa-audit` deliberately blocks the unfinished release.

A read-only Supabase probe confirms **zero future-start scheduled occurrences**, including zero published future events. One published ongoing long-duration lunch listing is not credible nightlife launch inventory. Tonight stays default off. Business-owned genuine upcoming events must be onboarded using existing moderation workflows; no fabricated rows are introduced.

Merge order: independent verified cleanup first; then final combined source after all genuine route/device/art gates pass; then explicit canonical production workflow and deployed-source/HTTPS verification. Preserve prior Worker revision and all legacy user records on rollback.
