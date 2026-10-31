# AkiPals restricted live test candidate

User authorization: Alex requested live testing on 31 October 2026.

## Isolation

Base: 76cb96df21bf9404d50db373cf57bb0287fd9a80. Prototype source: 125a38db785ce8bbb5ad228e8e5e3c63c850c599.
Only AkiPals source/assets/tests, its build lifecycle, its scoped private HTTP
headers and additive documentation are changed. No #332 merge, public navigation
change, DB migration execution, new resources, paid services or customer mail.
The existing avatar table was installed by the earlier avatar work; deployment
must verify it read-only, not reapply its migration. World: /pals/world. Wardrobe: /pals.

## Validation

The release workflow runs complete npm check, existing playground tests, genuine
3D Wardrobe and World browser fixtures, and Cloudflare packaging. Screenshots
and test receipts must be reviewed before merging. All failures remain visible.
Actual physical GPS/Android and signed-in production saves are owner playtest
items; do not misrepresent fixture verification as those acceptances.

## Privacy and limits

Existing administrator or active invitation authorization is mandatory. No new
public entry links are introduced. This repository is public and the current
administrator gate includes existing administrators, not an Alex-only secret.
GPS runs only on request and stops on hiding the tab. No recording, camera use,
AR, spatial capture, automatic check-in, XP, reward or real-time friend sharing
is activated. No fake event/activity data. The world character has preliminary
motion rather than a final skeletal walk cycle.

## Rollout

Merge only a validated exact candidate after inspection, observe the existing
automatic Cloudflare master build, then verify exact release SHA and private
route/asset responses over HTTPS. Do not run a competing manual deployment.
Rollback uses the previous Worker version/source, retaining all user data.

## Mobile map clearance correction

Real Chromium testing exposed the mobile information card intercepting
nearby venue-pin clicks. The map now keeps its own viewport height,
reserves camera padding above the card and prevents its decorative
avatar from intercepting map input. Touch actions retain 44px targets.
These are real source fixes; the click assertions are not bypassed.

The standalone browser harness now uses the same compile-time browser
environment definitions as the existing Next component harnesses.
Generated, ignored Three.js bundle output is excluded from source lint
and source formatting; the authored renderer and build script remain
checked. No authentication, database, data-retention or reward changes.
Exact-source checks and deployment verification remain mandatory.
