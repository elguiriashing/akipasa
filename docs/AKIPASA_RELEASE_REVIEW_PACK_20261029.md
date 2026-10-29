# Coordinated overhaul review pack

This is a review index, not acceptance. The authoritative route records remain in
`AKIPASA_UI_ROUTE_MATRIX_20261028.json`:103 pages,90 in scope,13 excluded,
zero accepted. Six fallback boundaries have their own matrix. Never copy a pass
from an older screenshot directory or promote routes because an artifact exists.

Production Home/Login was explicitly approved and shipped through #333 as
`39cd9bb42fd858dd54bd9f0d9e79a0504b15a0f2`. That bounded exception does not waive
#332's remaining requirements. The coordinated branch reconciles that source;
see the execution ledger and PR for the latest exact candidate and CI results.

## How to review

Open the candidate's exact-head Actions run, then its named artifact. Inspect the
actual images and functional receipt, including below-fold content. Record the
source path, reviewed commit, screenshot/result URLs, state and role, actual
reviewer, decision and unresolved gap. Only then write a genuine acceptance
record under that route in the matrix. Redirect-only routes need correct HTTP
and destination evidence rather than an image of a page that does not exist.

Run `npm run release:pasa-audit` after recording real decisions. It must continue
failing while any required route lacks acceptance. Automated emulation never
establishes physical Android testing. Fixtures never establish production RLS or
real provider/customer transactions.

## Review groups and remaining proof

| Group                                                          | Evidence family                                                                              | Required remaining review                                                                                                                                     |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home, Map, Check-in, Community, Roadmap, legal and memberships | `public-ui-evidence`, public page-family specs                                               | Final-source EN/ES at360/390/820/1440, light/dark, empty/populated/error; real map provider and physical Android                                              |
| Auth, recovery, onboarding and terms                           | Public Auth specs, `onboarding-responsive-evidence`, local real-Auth receipt                 | Actual provider/domain returns, recovery delivery, protected onboarding and device returns                                                                    |
| Account and Profile                                            | `account-responsive-evidence`, `account-personal`, complete312-case fixture run              | Final-source protected reads/actions, collection/bookings history and consumer isolation                                                                      |
| Venue/event details and booking                                | `tablet-browser-evidence`, Spotlight, booking acceptance                                     | Full poster/menu inspection, two-section keyboard/pointer selection; authorized disposable inventory/capacity/error and return journeys                       |
| Passport book and places                                       | Public Passport chapter/caption specs                                                        | Every-city caption contrast, below-fold chapters and genuine earned/history states; preserve XP authority                                                     |
| Prestige                                                       | `passport-prestige-acceptance`, guest privacy boundary                                       | Actual private/member/admin routes, owner-only privacy, published/unshared/revoked certificate and hall states; programme remains gated                       |
| Creator listing/detail/studio                                  | Public listing plus new `consumer-workflow-evidence/creator-routes`                          | Actual async page/action fixture cases, safe review drafts, exact studio Auth return and caller scope; integrated Next/Auth/RLS/device proof remains distinct |
| Business/owner/claims/rentals                                  | `consumer-workflow-evidence`, `portal-home-evidence`, business mobility and booking fixtures | Real owner/member/editor boundaries and disposable actions, partial-read/error truthfulness                                                                   |
| Staff/Admin                                                    | `staff-claims-evidence`, `portal-home-evidence`, native review fixtures                      | Restricted-role real Auth, per-route authenticated layouts and audited disposable decisions                                                                   |
| Root, HQ gateway, waitlist and compatibility redirects         | Redirect, locale/attribution and waitlist evidence                                           | Exact HTTP destination, locale/query preservation, independent product identity                                                                               |
| Six shared fallback boundaries                                 | Framework and root-error fixtures                                                            | Original404/307 contracts, retry safety, product identity and final-source visual review                                                                      |
| AkiPals                                                        | Retained private identity evidence only                                                      | User-paused; no art acceptance. Preserve saved/private state; an explicit approved release boundary is still required                                         |

## Current protected-test constraints

The existing synthetic local Auth backend confirms consumer identity/profile,
terms, creator profile reads/eligibility and administrator-only Prestige denial.
The original partial local replay omitted official initial default privileges and
retains those explicit permission failures. A separate clean scoped fixture now
applies the immutable official baseline before92 unchanged source artifacts;
39 actual Auth/REST probes pass, including owner isolation and forged/reassignment/
verification/category-write rejection. No retroactive grant or feature-switch
workaround was used. This scoped fixture is not full canonical164-file parity.
Production credentials/customer rows are not test data.

Creator fixture captures import actual page exports and actions, but substitute
Next/Auth/database/media adapters inside actual AppShell. Their receipt explicitly
states that scope. Account's maintained harness also includes AppShell; neither
harness is physical Android or production authorization evidence.

## Next execution

Finish the current Creator return regressions, full integrated browser suites and
exact-head CI, preserve source-stamped Cloudflare build evidence, then use this
index for final review and device/provider acceptance. Keep #332 draft until the
strict gate and all release prerequisites actually pass. Preserve the known-good
production Worker and check automatic deployment identity before any manual path.
