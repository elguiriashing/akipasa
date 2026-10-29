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

## 3D engine implementation — 29 October 2026

The original flat illustrated preview has been replaced at the private /pals UI
with a genuine **self-hosted Three.js WebGL** renderer. The stage loads two
commercially usable CC0 rigged humanoid GLB bases from
public/pals/models/akipals-base-female.glb and akipals-base-male.glb,
with a model provenance notice alongside them. The files are physically stored
in the repository; no remote model CDN or avatar vendor is contacted.

- Source: src/components/pals/studio-3d.js. This drives OrbitControls,
  constrained touch/wheel zoom, drag rotation, responsive canvas sizing, 3-point
  lighting, PBR materials, soft shadows and reduced-motion handling.
- Original procedural *3D meshes* provide hair styles (including curls,
  long hair and a bun), colour palettes, free tops, trousers, sleeves,
  sneakers/boots, crossbody bags/backpacks, glasses/earrings/caps and outfit
  presets. These are physical mesh overlays, not flat sprite layers.
- The live editor updates the 3D scene locally, making appearance changes
  without an API mutation. Only pressing Save sends a validated, same-origin,
  versioned own-account appearance payload to /pals/identity. Existing RLS and
  the unmodified legacy save tables remain separate.
- Build entry: scripts/build-pals-3d.mjs, which bundles the pinned MIT Three.js
  dependency from the local npm package to
  public/pals/runtime/creator.min.js. prebuild and prebuild:cloudflare invoke
  it; no runtime external script requests.
- scripts/test-pals-identity-browser.mjs exercises actual Chromium WebGL
  rendering, save/reload/restore and screen captures across 320–1440 px.
- tests/pals-3d-assets.test.ts inspects both binary GLB files and save
  migration compatibility.

**ART-QUALITY LIMITATION:** the supplied high-end concept art is *not*
game geometry. The first 3D runtime is a functional, original wardrobe and
rendering foundation with CC0 Quaternius bodies. It is **not yet visually
equivalent** to the cinematic concept. Final public launch requires a cohesive
professionally sculpted base, fitted garments, high-resolution textured hair,
facial blend shapes, character rigging/animation, LOD meshes, licence/source
review and physical-device GPU/performance approval. Labels for facial features
not yet driven by true morph targets must not be misrepresented as complete.
Do not enable billing, community or live presence because of this engine.

**Release hold:** SQL must be independently reviewed and applied before the
private preview is tested with a real account. Reconcile with PR #326. Run
exact-head CI and actual browser/Android screenshot checks. No public merge or
Cloudflare release is approved by this implementation alone.

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
