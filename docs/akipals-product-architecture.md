# AkiPals product architecture

AkiPals is being evolved from a restricted game preview into a reusable identity,
collection and rewards platform inside AkiPasa. The existing ten Pal families,
layered vector rendering, equipment gameplay and schema-1 saves remain the
compatibility layer while catalogue, rewards and ownership move to data-driven
systems.

## Architectural layers

### Catalogue

`src/lib/pals/catalogue.ts` defines the long-term item, collection, brand and
campaign contracts. Items carry collection, slot/effect, rarity, renderer data,
family compatibility, source, availability, unlock-rule, commerce and
city/event/venue/brand/campaign metadata.

`catalogue-legacy.ts` adapts the current `Design[]` catalogue into that model.
This means the preview can keep working while new content migrates to database
rows instead of requiring a rewrite.

Prestigious earned items are explicitly non-purchasable in both application
validation and the database schema. Real-money is a modelled future currency,
not an enabled payment path.

### Collections, brands and campaigns

Collections are first-class objects rather than naming conventions. A normal
AkiPasa set, a city drop, an event collection and a sponsored collaboration use
the same structure.

Brands and campaigns are generic infrastructure. Campaigns can reference
collections, active dates, regions/cities, unlock rules, commerce URLs and
analytics identifiers. No licensed brand or payment integration is enabled by
this groundwork.

### Entitlements and provenance

`entitlements.ts` models ownership separately from equipment inventory. Every
grant records the item, time, acquisition route, source type/source ID, expiry,
quantity, status and metadata.

Schema-1 saves remain compatible. Existing `wardrobe[]` entries are lazily
represented as legacy entitlements on the next mutation. New starter, parcel,
shop and achievement grants write provenance immediately while `wardrobe[]`
continues as a current-UI compatibility cache.

The persistent target is `pals_entitlements`, where ownership can later be
revoked, refunded or expired without rewriting game saves.

### Universal rewards

`rewards.ts` defines generic conditions and grants. Conditions currently cover
achievement unlock/count/city, Passport tier, venue-visit counts, adventure
completion, event participation and campaign requirements.

Rewards can grant cosmetics, collection items, Threads/Scrap, effects, titles
or badges.

The existing 1/5/10 achievement keepsakes and city keepsakes now use this rules
engine through `reward-catalogue.ts`. Future Passport, event, adventure and
campaign rewards should add data/rules rather than bespoke action handlers.

### Effects

Effects are a separate cosmetic slot in the catalogue and renderer contract.
The model supports glow, particles, holographic shimmer, flames, snow, leaves,
electricity and trails. No complex effect renderer is enabled yet.

### Rendering

`render-snapshot.ts` produces a UI-independent `PalRenderSnapshot`: family,
display name, equipped layers, collections and future effects. The restricted
preview still renders through the existing vector engine, but Passport,
profiles, Community and future map/social surfaces can eventually consume this
snapshot rather than rebuilding Pal state themselves.

`style-guide.ts` defines ten family palettes, expression/theme descriptions and
curated four-piece signature looks using existing design IDs. It also supplies
the wardrobe categories and collection filter metadata. These looks are
presentation recipes, not automatic ownership grants. The original SVG renderer
keeps unique IDs and layer order while giving coats, jackets, robes, bags and
city keepsakes clearer silhouettes and original detailing.

### Companion journey and arcade

`journey.ts` owns server-time care rewards, bond labels derived from permanent
XP, daily task progress and distinct-story weekly progress. Completed unclaimed
bonuses bank when a period advances; missed days do not remove earned progress.
Only successful, meaningful actions record progress. Read summaries are pure,
and mutations persist an optional version-1 `journey` value inside schema-1
state through the existing `pals_commit` transaction.

`arcade.ts` owns Memory Mix and Trail Finder. Starting creates a server-random
board and UUID. The client plays locally, then submits that UUID and a bounded
transcript of integer cell indices. The server reconstructs completion, derives
the score and consumes the active run together with the once-per-game/UTC-day
reward. Trail generation and shortest-route scoring search at most 200
cell/star states. No transcript history or user-supplied score is stored.

The optional version-1 `arcade` save contains one active board and fixed-size
best-score, play-count, daily-earning and last-result summaries. Daily earning
periods never move backwards with server clock corrections. Validated arcade
completion can satisfy the daily play task; the weekly goal remains three
distinct story adventures. No new table, migration, paid currency or external
service is required.

The HTML client integrates the arcade fragment inside its existing scope so
navigation, command locking, ambiguous-response retry and focus handling share
one implementation. Main navigation, touch targets, themes and filters stay in
the UI layer; balance changes stay in the domain/API layers.

### Analytics

`analytics.ts` defines whitelisted product events:
collection/item views, unlock/equip/unequip, soft-currency purchase, reward
claim, adventure reward and campaign reward.

Mutation events are derived server-side only after an atomic save. Item and
collection views go through the private `/pals/analytics` endpoint. Analytics
is best-effort and cannot block gameplay.

Do not include coordinates, email, names, addresses, IP-derived data or
free-form personal payloads in AkiPals analytics.

## Database foundation

`20261005123000_akipals_product_foundations.sql` adds the core tables, and
`20261005131500_akipals_unlock_rule_constraints.sql` adds persisted unlock-rule
references plus database enforcement for earned non-purchasable items.

Core tables:

- `pals_brands`
- `pals_campaigns`
- `pals_collections`
- `pals_items`
- `pals_reward_rules`
- `pals_entitlements`
- `pals_campaign_collections`
- `pals_analytics_events`

The migration is additive. It does not replace `pals_states` or invalidate
existing preview saves. RLS is enabled. Content and telemetry writes are
service-role only; authenticated users may read only their own entitlements.

## Migration strategy

1. Keep the legacy catalogue adapter as the current preview source of truth.
2. Seed existing items/collections into the new catalogue tables.
3. Read new catalogue rows alongside legacy items behind a compatibility
   repository.
4. Backfill persistent entitlements from schema-1 save provenance.
5. Move reward definitions from source files to managed database rows.
6. Retain legacy `wardrobe[]` and `claimed[]` until all consumer surfaces use
   entitlement/reward repositories.
7. Only then consider a save-schema version bump.

This staged approach avoids turning a foundation refactor into a user-facing
reset.

## Product boundaries preserved

- `/pals` remains restricted, private/no-store and noindex.
- No public Pal location/social presence is added.
- No real-money checkout or purchased random reward is enabled.
- Current server-authoritative save/version/idempotency protections remain.
- Achievement and city prestige items remain non-purchasable.
- Existing layered SVG art and all ten Pal families remain supported.
