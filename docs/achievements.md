# Activity achievements

Administrators: **Admin → Achievements / Logros** (`/en/admin/achievements`,
`/es/admin/achievements`). Members: **Account → Rewards** or **Passports → Badges**.

## Catalogue and conditions

502 initial achievements: the original three XP badges plus 499 new milestones.
There are six city tiers (1, 5, 10, 25, 50, 100 distinct places) for the 66 major
cities in `city-photos.json` plus Fuengirola. Category families cover restaurants,
cafés, bars/tapas, nightlife, arts/culture, shopping, sport, wellness, family
activities and outdoors (1, 5, 10, 25, 50 places). General milestones cover
unique venues, accepted check-ins, cities, category variety, active days,
repeat visits to one venue, weekend days and XP. Both languages are seeded.

The editor supports a condition type and integer target; distinct-place rules
can optionally combine a city and category. New custom achievements start as
drafts. Search, condition filters and incremental display keep the admin and
member catalogues compact. Members see progress bars and can filter by city,
interests and earned/pending status. Existing earned achievements stay earned
when their condition changes. Hiding/deleting a definition removes it from the
visible collection without changing XP or deleting the award identity.

## Reliable activity and categories

Only accepted check-ins count. The existing geofence, cooldown, rate limit,
premium XP and idempotency checks remain unchanged. Distinct-place conditions
use venue IDs, so repeat visits cannot inflate them. Local venue time zones
are used for distinct active days and weekend days. Canonical city aliases
merge duplicate city rows and Fuengirola's Los Boliches/Carvajal neighbourhoods.
City conditions remain available before that city has participating venues.

Venues previously had no authoritative category. **Achievements → Classify
venues** lets administrators assign verified categories; no names or event
categories are guessed. Category achievements require these assignments, and
past accepted visits count once a venue is classified. Existing venues still
need their categories reviewed by an administrator. City/general milestones
work immediately without categorisation.

`achievement_unlocks` stores one award per user and achievement key. An XP-ledger
insert triggers automatic awards in the same transaction. The authenticated
`my_achievement_progress()` RPC also reconciles past visits and newly published
conditions when users open their collection. Advisory locking plus a composite
primary key prevents duplicate awards. Definitions are data, never executable
conditions. Achievements do not mint additional XP; existing check-in XP rules
are preserved. Successful check-ins show badges earned on that check-in.

## Deployment and security

Apply `20260916115126_activity_achievements.sql` after the managed-achievements
migration and before deploying this frontend. All 502 definitions are live.
The seed temporarily suspends the user-edit audit trigger inside the migration
transaction; it is restored before commit. Migration history records the seed.
All subsequent admin edits and category assignments are audited transactionally.

Every exposed table has RLS and explicit grants. Only administrators can change
definitions/categories; only owners can read their unlocks. Clients cannot insert
awards, supply another profile to the progress RPC, or execute internal award
helpers. Privileged functions are private with fixed search paths. Category
replacement is atomic and rejects stale submissions. Definition edits retain
revision checks. No service key is used by these routes or actions.

Rollback: restore the previous UI first and disable the `achievement_xp_award`
trigger if needed. Preserve XP, award history and custom definitions. Do not drop
those tables as a routine rollback.

## Verification

`database/tests/activity-achievements.sql` runs rollback-only fixtures against
real database grants, triggers and RLS: distinct visits, duplicate city aliases,
category milestones, accepted states only, repeat visits, days/weekends,
transactional and idempotent unlocks, own-account isolation, denied self-awards,
admin category writes/stale edits, permanent unlocks and unchanged XP.
Unit/component tests cover condition validation, admin editing and collection
filters. Run `npm run check` and browser acceptance before release.

The full app check passed (formatting, lint, TypeScript, 160 application tests,
41 automation tests, database safety and production build). Two additional
collection tests subsequently passed, bringing application coverage to 162 tests.
Rollback-only database acceptance passed, including real insert-trigger awards
and category removal. Security advisors reported no new findings for this feature.
Chromium installation timed out in this environment; browser visual acceptance
is therefore still limited. HTTP and component checks are used where available.
