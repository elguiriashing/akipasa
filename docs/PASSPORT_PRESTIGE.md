# Passport prestige delivery checkpoint

Status: Implemented, tested and merged through PR #229 into master `8390836b8f8a03b213e873ae3c4e84ef68fe2f23` (tested tree `47f461f544f13de57ffb0a0bd624778cc9be2b8d`). Required exact-head CI passed. Production deployment/activation verification remains open; no live reward grants or physical fulfilment are claimed. See `docs/AKISUITE_MISSION_INTEGRATION.md` for the dated release checkpoint.

## Dependency and impact trace before edits

Existing `private.achievement_counts` derives accepted visits and XP; `achievement_unlocks`
records natural unlocks, while `passport_manual_awards` is a separate admin/test layer.
Prestige must use current natural counts and never manual/test tiers. Existing Passport,
loyalty, XP, Pals and manual awards remain untouched. New private tables are accessible
only through narrowly granted RPCs with independent actor checks. EN/ES private member,
admin and opt-in public certificate/Hall surfaces are separate from auth/navigation.
No billing, analytics, Storage, cross-product or provider integration is required.
Gameplay UI defaults off through AKIPASA_PRESTIGE_ENABLED; database launch defaults
off too. Independent identity-only privacy controls at `/[locale]/privacy/prestige`
remain available after schema readiness, even when gameplay or onboarding is locked.
Physical intake and manual delivery tracking have separate closed DB settings; no
public/admin action activates those settings, purchases or requests a shipment.
Rollback: set both gates off or revert source; retain additive records/migration.

## Difficulty: existing rules, not a promised completion time

Category city stamps require 1/5/10/25/50 distinct venues for Bronze/Silver/Gold/Platinum/
Holographic. There are ten categories; city ranks require 1/5/10/25/50/100 distinct
venues. Completing all ten holographic category families requires at least 50 and at
most 500 distinct venues, depending on category overlap. A city rank adds a 100-place
floor if included. The current check-in engine allows at most 20 accepted visits per
rolling 24 hours, with a six-hour same-venue cooldown. Those limits imply theoretical
activity lower bounds only; travel, opening times, credentials, classification and
available venue coverage dominate realistic completion. Existing eligible availability
requires published + verified + location + active check-in credentials.

No two-to-three-year claim is supported by these rules. The studio should configure
and leave candidate Holographic City Master (all ten 50-place local category keys plus
city 100-place key) inactive until actual coverage is checked. Regional and Legend
thresholds require decisions and are not silently seeded. Member progress includes
current natural counts; coverage gaps are documented here, with no invented completion date.
There are 67 configured city scopes × 10 categories. The 1,000-key programme bound
can represent all 737 city/category master requirements if a national rule is approved.

## Remaining acceptance

Exact-head hosted CI; shared-schema/advisor preflight; authenticated multi-account
acceptance; deploy with gates off; approve milestone definitions and coverage before
digital launch. Physical intake/delivery activation additionally requires approved
budget, criteria, privacy notice, retention duration and a validated service-only
purge schedule. These block activation, not the completed intake/status infrastructure.
No provider, purchase or automatic order integration is included or required to record
eligibility, private addresses and manually reported delivery status.

## Read-only hosted coverage check (20 October 2026)

On shared project `vhpbvcfkcteswlsdjrfl`, the existing Passport eligibility query
returned **2 eligible venues in 1 city**, with **zero classified eligible category/city
families** and **zero cities with all ten holographic categories at capacity**.
This is a point-in-time infrastructure coverage snapshot, not a count of all published
venues or a user progression metric. Therefore a Holographic City Master is currently
unattainable through the actual available credential/category network. No prestige
programme is seeded or activated. Next action: onboard credential-enabled participating
venues, classify them and rerun coverage before approving milestone requirements.
The 2–3 year estimate cannot be justified and is not shown to users.

## Privacy and activation controls

After the additive migration is validated, set `AKIPASA_PRESTIGE_SCHEMA_READY=true`
to include the caller-only prestige export in the existing account JSON export, even
while digital launch is off. Then approve programme definitions and separately enable
`AKIPASA_PRESTIGE_ENABLED=true` and the private DB launch setting. Closing launch does
not block data portability. Award/interest rows cascade on account deletion; audit
actor references null on profile deletion. Shipping addresses use a strict-private
deny-all table, with caller-owned intake/read/delete, expiry filtering, narrow audited
admin reads and a bounded service-only purge RPC. No address appears in the public
projection, generic admin list, audit payload or analytics. The intake and delivery
settings remain false; retention days remain NULL and purge readiness false until
reviewed configuration is supplied. The migration does not collect any shipping PII.
For physical activation: configure approved retention days, schedule/test
`public.purge_prestige_shipping(100)` with service authorization, confirm
`address_purge_ready`, then separately authorize intake and delivery settings.
Manual delivery transitions use an expected prior status and recheck eligibility
before preparation/dispatch. They never call a vendor or order anything.
The scoped audit retention policy still requires operational review before launch.

## Delivery status matrix

| Deliverable                                 | Implementation                                                                                                     | Local verification                                      | Release                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------ |
| Versioned configurable programmes           | Implemented; inactive by default                                                                                   | PostgreSQL definitions/role tests                       | Not merged or deployed                                             |
| Natural server-verified digital awards      | Implemented; member lock, unique serial, evidence, test/manual exclusion                                           | SQL retries/isolation/definition-drift/revoke tests     | Launch gated                                                       |
| Holographic animated trophy and certificate | Implemented EN/ES, reduced motion, print styling                                                                   | Component/type tests                                    | 64 component browser cases passed                                  |
| Share cards                                 | Implemented 1200×630 SVG and local PNG download                                                                    | Escaping, route, canvas and privacy tests               | 64 component browser cases passed                                  |
| Voluntary Hall                              | Implemented; 24-row pages, alias, independent opt-in                                                               | SQL publication/withdrawal tests                        | Launch gated                                                       |
| Physical eligibility/interest/review        | Implemented; rechecks natural criteria on review                                                                   | SQL disabled-fulfilment/role tests                      | No fulfilment enabled                                              |
| Shipping intake and delivery states         | Implemented strict-private address path, expiry/purge, audited single-record reads, concurrency-safe manual states | SQL isolation/expiry/disabled gates plus browser forms  | Intake/delivery flags off; no approved retention or purge schedule |
| Purchasing and delivery provider            | No automatic provider calls or orders                                                                              | No live customer/financial effects                      | Requires separate explicit fulfilment authorization                |
| Public member-profile badge placement       | No public member-profile route currently exists; certificate/Hall provide public distinctions                      | Route inventory                                         | Integrate when a public member-profile surface is specified        |
| Data portability/deletion                   | Caller-only export survives closed launch; award/interest cascade; audit actor nulled                              | SQL isolation and HTTP export failure tests             | Separate schema-ready flag                                         |
| Difficulty and thresholds                   | Actual source rules + read-only hosted coverage analysed                                                           | 2 eligible venues, zero classified families at snapshot | No impossible milestone activated                                  |

## Verification evidence

- `npx vitest run --config vitest.prestige.config.ts`: **40 passed** (14 SQL lifecycle/security,
  11 component/PNG/privacy/intake, 9 server boundaries, 4 export, 2 privacy identity).
- `npx tsc --noEmit`, scoped ESLint, Prettier and `git diff --check`: passed.
- Full `npm run check` passed the initial digital candidate, including production Next build.
  Final broad local shipping validation encountered six timeouts in unchanged tests under
  concurrent load. All six pass unchanged in focused reruns (32 cases across seven files).
  Final source TypeScript, scoped lint/format, the 40-test feature suite and 64 browser
  cases pass; hosted exact-head full CI remains required. No timeout/assertion was changed.
- Real Chromium 143: **64/64** EN/ES × light/dark × phone/tablet/desktop ×
  member/admin/intake/delivery component cases pass. This includes actual 1200×630 PNG
  downloads, keyboard, reduced motion, explicit address submission/deletion and audited
  admin address-read/hide/status controls with disposable adapters. Screenshot inspection
  caught and fixed the light-theme trophy title contrast; that color now has a regression.
  These fixtures establish component acceptance, not live authentication or shipping.
- Hosted read-only preflight confirms the natural counts engine, test registry and
  achievement catalogue exist; prestige tables do **not** yet exist.
- Hosted CI, full shared-schema/advisors and authenticated acceptance remain required.
