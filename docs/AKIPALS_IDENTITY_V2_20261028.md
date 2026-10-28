# AkiPals 2.0: Be you. Go places.

Design and engineering decision, 28 October 2026.

## Product reset

AkiPals is NOT a gacha RPG or virtual pet. It is an editable human-style avatar
and wardrobe tied to a user's AkiPasa identity, real-world discoveries, and
eventually carefully controlled social activity.

Retire the old public-facing model: ten fixed mascot families, care loops,
friendship XP, Threads and Scrap grinding, levels, attributes, socketed gear,
item upgrades, stories, arcade games, randomized daily parcels, and stat boosts.
Do not repackage these mechanics under new names.

Tagline: **Be you. Go places.**

Original, accessible, stylish human illustration with urban streetwear,
AkiPasa orange accents, independent of Bitmoji or Snapchat copyrighted assets.
A Pal now represents the user, not a pet they must look after.

## First implementation (this PR)

- Private /pals identity studio replaces old mascot and game UI with the
  original administrator/invitation server authorization, CSP and noindex.
- First-party SVG renderer and 17 appearance controls: skin, face, hairstyle,
  hair colour, eyes, eye colour, brows, nose, mouth, ears, chin, neck, shoulders,
  height, body build, free top, and colour.
- Live authenticated preview, explicit save, restore last saved look.
- Owner-only Supabase table: public.pals_avatar_profiles, with RLS.
- No location tracking, personal position sharing, paid items or sponsorship.
- Old game data remains untouched; there is no destructive migration.

Deploy dependency: apply the additive SQL migration named
20261028235830_pals_human_avatar_profiles.sql before enabling the studio.
Until then the API will show a genuine unavailability error.

Legacy game APIs and state remain for safe rollback, but the studio never uses
them. Decommission the old routes before public launch. AkiPasa redesign PR #326
changes the old AkiPals surface and MUST be reconciled before either merges.

## Planned phases

1. Account identity: an optional avatar next to profile photos, shared with
   Passport, verified check-ins and community; English and Spanish.
2. Cosmetic wardrobe: tops, bottoms, shoes, outerwear, hair accessories, bags.
   Basic clothes always free; earned city and verified-visit cosmetics.
   Existing earned ownership to be migrated only with reviewed mappings.
3. Optional brand collaborations and individually priced premium outfits:
   verified purchase entitlements, refunds, age-aware commerce, no loot boxes,
   paid random drops, pay-to-win or purchasable earned prestige.
4. Where's Poppin': aggregated venue/area heatmap, never a feed of exact user
   coordinates. Suppress areas below a minimum crowd threshold, bucket and
   delay data, defend against repeated queries that could identify individuals.
5. Optional identifiable presence: separate explicit per-session consent,
   ideally share a named venue only with mutually accepted connections.
   No default sharing or background tracking. Auto-expire, delete promptly,
   pause instantly, support blocking/reporting, and disable under-18 live
   identifiable presence. Complete GDPR privacy assessment and abuse threat
   modelling before shipping.

## Release gates

- New UI has no XP, levels, gacha, slots, care or story interface.
- Existing save data survives unchanged.
- Server validation only accepts bounded enum values. No arbitrary SVG input.
- RLS, origin checks and invite access tested against actual database.
- Full repository checks, source formatting, browser UI/Android visual QA.
- Both language variants and all required profile integrations before public.
- PR #326 conflict review and source-pinned CI before any production deployment.
- Nothing in this first PR enables public map presence or checkout.
