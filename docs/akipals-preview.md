# AkiPals restricted preview

## Access and discovery

The entry point is `/pals`. It is deliberately absent from public navigation,
search, sitemap entries, onboarding, notifications and marketing. Anonymous
requests receive a neutral sign-in page (401); signed-in users without preview
access receive 404. Access requires a protected `profiles.app_role` of
`administrator` or an unexpired own-account `pals_preview_access` invitation.
No invitation is granted automatically to ordinary users.

The document, JSON API and portrait endpoint are private/no-store and noindex.
The standalone document does not include the public site's analytics scripts.
It uses a per-response CSP nonce and self-origin API calls. This is access
control, not just an unlisted URL. The GitHub source repository is public;
this restriction does not make committed source confidential.

## Playable scope

- Ten original character families, with interchangeable equipment and an
  official master-outfit gallery. Family changes are free in the preview.
  Each family also has an original expression, accent palette and four-piece
  signature collection assembled from existing, collectable design IDs.
- Sixty-one current legacy-compatible designs, including expanded family signature
  drops, three achievement trophies and six original city jackets. The new
  catalogue-v2 adapter exposes them as collection-aware cosmetic items. No
  licensed kits or club crests.
- Head/body/back/held equipment, levels 1–10, one to three sockets, +2 attribute
  modules and a six-active-module loadout cap. Appearance changes are separate
  from equipment stats. Scrapping and merging preserve collected appearances
  and return spare modules. Merging retains maximum level and socket count.
- One free parcel per UTC day, up to three banked. Every parcel gives 40
  Threads, 15 Scrap, a module and equipment. All parcel designs are equally
  likely. Socket probabilities are 51% one, 34% two and 15% three. Inventory
  overflow preserves the appearance and converts the equipment to 16 Scrap.
- Ten three-scene adventures with visible requirements, loadout snapshots,
  fallback results and bonus approaches. Rewards are once per story per UTC
  day, with free practice replays. Basic equipment can complete every story.
- Snack, Play and Chill care actions each give 5 XP once per UTC day. Repeating
  them is free and does not grant further rewards. Existing permanent XP maps
  to ten bond ranks; inactivity never reduces it.
- A daily checklist rewards care, an actual outfit/loadout change and a
  completed story or arcade game. Its claim gives 25 Threads, 10 Scrap and
  15 XP. Completing three distinct stories in a UTC Monday-based week gives
  70 Threads, 30 Scrap and 40 XP. Practice stories count toward that goal.
  Completed bonuses bank across period changes until explicitly collected.
- Memory Mix is a six-pair matching game; Trail Finder is a five-by-five
  routing puzzle with three stars and a finish flag. Each game gives
  20 Threads, 8 Scrap and 10 XP once per UTC day. Further games are free
  practice with personal-best scores. Boards are saved on start, interactions
  run locally, and the server replays bounded move transcripts on completion.
- Verified achievement synchronization now resolves through the universal
  AkiPals reward-rule engine: one/five/ten unlocked-achievement trophies and
  city-scoped rewards for Fuengirola, Málaga, Marbella, Granada, Sevilla and
  Madrid. Passport/event/campaign rules use the same condition/reward model.
- An opt-in own-account map companion, account saves, export snapshots,
  keyboard-accessible dialogs and reduced-motion support.
- A responsive Hideout, Wardrobe, Stories, Arcade and More navigation system,
  persistent light/dark preference, and name/slot/signature-collection filters
  for wardrobe, workshop and shop. The private preview remains English-only.

## Economy and integrity

Threads are earned in-game only. No real-money Checkout sessions, Stripe
products, charges, purchased virtual currency or paid random rewards exist in
this preview. Achievement trophies cannot be bought. Prices and balance are
provisional for playtesting, not a commercial launch.

Only authenticated, authorised server handlers can write game state. They
validate actions with a strict Zod schema, use server time and cryptographic
randomness, reject cross-origin writes, bound request bodies and rate-limit
mutations. A row lock, expected save version and unique command identifier
commit state and idempotency records in one database transaction. Ambiguous
client network failures retain the same command identifier for a safe retry.

The API never accepts client-supplied balances, reward results, arcade scores,
inventory, user identifiers or achievement claims. Arcade runs have a
server-created UUID and accept at most 128 move indices; a successful finish
consumes the run inside the same atomic save as its reward. Care, checklist and
arcade state are optional schema-1 extensions, so historical saves require no
migration. Saves are separate from the existing
passport and loyalty tables. No location coordinates are stored in Pal state.

## Map boundary

The server renders the companion only when the HttpOnly preview preference
cookie is present, the account is still authorised and the saved preference is
on. Ordinary map visitors do not perform preview authorisation or save reads.
A preview service failure falls back to the original map. Opted-in map
responses are private/no-store. The companion decorates the existing
MapLibre location marker; it does not request location or create a social
location-sharing channel. The existing accuracy indicator stays in place.

The first preview uses one full miniature at all zoom levels; a wider-zoom
simplified portrait and more sophisticated collision handling remain future
work. Physical-device GPS and the signed-in production journey still require
human acceptance after deployment.

## Database changes

Applied/repository migrations:

- `20261003213755_akipals_restricted_preview.sql`
- `20261003220529_akipals_command_rate_index.sql`
- `20261005123000_akipals_product_foundations.sql` (additive catalogue,
  collection, campaign, entitlement, reward-rule and analytics foundation)
- `20261005131500_akipals_unlock_rule_constraints.sql` (persisted unlock-rule
  references and earned-item non-sale constraints)

The three original preview tables have RLS enabled. Authenticated users may read only their
own invitation and save, and cannot write state or execute `pals_commit`.
The commit function is SECURITY INVOKER and executable only by service_role.
Account deletion cascades to preview state, invitations and command records.

Operational rollback: revert the application release, retain these isolated
tables to preserve saves, and clear the preview preference cookie if needed.
Do not drop the tables during a code rollback. Permanent data deletion is a
separate explicitly approved operation. Revoking an invitation or removing
an administrator role blocks the next authorised request; client cookies do
not grant access by themselves.

## Verification record

The October 12 playground changes and current release checks are recorded in
`docs/AKIPALS_RELEASE_20261012.md`. The paragraphs below describe the earlier
restricted-preview baseline, not evidence that the newer release has deployed.

Before production publication, the isolated engine was strictly compiled and
29 rule/art/privacy tests passed in a local Node assertion harness. Chromium
interaction checks covered adoption, rename, family changes, daily rewards,
shop purchase, equipment upgrades, sockets, modules, appearance preservation,
scrapping, merging, adventures, settings and a simulated committed purchase
whose response failed to decode. Retrying did not spend twice. Eight screens
were inspected at widths 320, 390, 820 and 1440 without horizontal overflow
or JavaScript errors. Those browser tests used the real game engine with a
mock transport, not a signed-in production account.

Real-database checks verified that anon/authenticated cannot write saves or
execute the commit function. A rollback-only transaction verified version
increment, duplicate-command replay and stale-version rejection; all test
writes were rolled back. Repository-wide checks and the Cloudflare build are
separate release gates, not implied by the isolated tests.

The application is an English-language private preview. The product-foundation
architecture is documented in `docs/akipals-product-architecture.md`. Full
localisation, licensed collaborations, real-money commerce and public social
features are not enabled.
