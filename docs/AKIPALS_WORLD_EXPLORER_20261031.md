# AkiPals World: real-world social exploration prototype

**Status:** Restricted prototype, not released or linked publicly. Initiated 31 October 2026.
**Branch:** feature/akipals-world-explorer-20261031
**Product owner:** AkiPasa, separately from the consumer redesign release train.

## Product definition

AkiPals 3D character creator becomes **Wardrobe**; the same user's saved avatar
is reusable as their visible walking character inside **World**. Around that core,
build a city-adventure system inspired by the _interaction pattern_ of
location-based exploration games, **without copying protected assets or game UI**.

The real-world loop:

1. Create your character in Wardrobe.
2. Open World to explore a tilted, colorful map and nearby real venues.
3. Optionally enable position tracking, visible only on your own device.
4. Discover venue/event highlights, create a plan and head out with friends.
5. Future: verified visits, photo/video Moments, AR Hunts, shared crew challenges
   and Passport collections, with server-authoritative rewards only.
6. Future: separate optional AR mapping contributions improve venue 3D twins.

**Gameplay must reward experiences and community, not paid spending, alcohol
consumption or unsafe venue-hopping.** No daily streak punishment, simulated
popularity, fake live crowd activity, strangers' exact locations, or loot boxes.

## Work implemented here

- New server-restricted /pals/world page with private, unlinked, noindex presentation.
- MapLibre tilted world view, highlighted real venue records and mobile controls.
- Reuse existing authenticated /pals/identity appearance and first-party Three.js
  GLB character runtime in low-power small-canvas world mode; no duplicate
  avatar profile or identity service. Wardrobe remains existing /pals.
- GPS is off by default and only starts after a direct click. In-app position
  is rendered locally; watch stops when hidden, closed or explicitly stopped.
  The player marker starts at a **labelled demo center** until opted in.
- Current coarse map center (two decimal places) is sent to an
  authorized /pals/world/venues read-only endpoint for nearby public listing
  discovery. Precise coordinates are never sent to that endpoint. Normal public
  venue listing visibility applies. The map tile provider sees requested
  map tile areas as in existing AkiPasa discovery.
- Stated as prototype: no server check-ins, AR claims, spatial recording,
  upload, XP, tokens, vouchers, push, ad tracking, friend location or crowds.

## Existing dependencies and cross-product contract

- **Authoritative avatar:** src/lib/pals/avatar-v2.ts, /pals/identity route, existing
  RLS-isolated pals_avatar_profiles, existing GLBs and src/components/pals/studio-3d.js.
- **Preview authorization:** src/lib/pals/server.ts::previewAccess, server-side,
  administrator/approved invitation only. Public guests receive login redirect,
  unauthorized signed-in users receive 404; read endpoint returns 401/404.
- **Venue source:** src/lib/unclaimed-venues.ts::nearbyVenuePage calling existing
  public_nearby_venue_page RPC; any filtering claims must match current public
  listing visibility. No new query endpoint can expose hidden/proprietary venue
  data. No new schema/migration.
- **Maps:** src/lib/config.ts::config.mapStyleUrl, MapLibre 5 and existing tile
  source; do not touch ProductionMap or any public map styling. Proper tile
  attribution must remain visible.
- **Privacy:** browser-only precise geolocation after explicit tap; coarse
  per-query map cell sent to first-party server; no persistent user traces.
  Viewing public street maps may still cause requests to tile hosts.
- **Billing/teams:** entirely unchanged, no Stripe/entitlements/crews/API changes.
- **Other products:** AkiHQ, AkiBusiness, AkiCoches and AkiDuermo untouched.
- **Routing:** Private /pals/world is a separate page; /pals creator links to it.
  No changes to the main AkiPasa consumer navigation or #332 release PR.
- **Locales:** The private playtest currently uses English UI; public rollout
  requires EN/ES, screen-reader, reduced-motion, keyboard and Android acceptance.

## Future build sequence (not implemented)

### P1: real-world map v2

Game-art world styling; performant marker clustering and emphasis based on actual
venue categories/real events; real event data, live/soon distinctions based on
published schedules and timezone; accessible venue cards and intent filters.
True rigged walk cycles, quality tiers for low-end Android phones, WebGL fallback.
AkiCrews planning UI with private membership and no default presence.

### P2: proof-of-experience and collectibles

Venue permission and location-accuracy heuristics; verified check-ins via an
additional strong proof for commercial rewards, no GPS-only payout.
Server-owned idempotent reward ledger and fraud checks; soft progression for
exploration, weekly/seasonal collections, avatar cosmetics, non-alcohol-based
venue perks. AkiMoments with in-app capture, moderation, bystander protections,
short expiry and independently controlled sharing consent.

### P3: AR Hunts, then AkiWorld mapping

ARCore/platform-capability abstraction with image/feature/anchor tracking,
venue-approved safe and accessible item placements, offline fallback.
Separate explicit **spatial-contribution opt-in**, apart from T&C acceptance,
with visual notice while capturing, limited retention and venue-level approval.
Do not store scans by default merely because AR is open.
Only upload useful reconstruction keyframes/depth/poses after consent,
redaction and quality checks. Select next-best safe camera viewpoints from
coverage/uncertainty, never ask users to trespass or crawl into hazardous
spaces. Assess relocalisation across devices, moving crowds, lighting,
scene change, and Gaussian-splat quality in controlled pilots first.

## Security and release gates

1. Confirm test:pals (including pals-world and pals-world-route) and build pass.
2. Playwright on phone/desktop, degraded WebGL/GPS, dark/light, reduced-motion,
   permission denied, background/restart behavior, keyboard and screen readers.
3. Validate provider attribution, MapLibre style load, tile costs and 3D
   character 3G/network performance. Check that public venue API errors do
   not cause empty/fake content or private profile disclosure.
4. Verify existing preview access / RLS; no preview data for ordinary guests.
5. Rebase/reconcile against public master and active coordinated release #332.
   This branch forked from the private 3D avatar feature branch, **not** master.
6. Do not merge, deploy, publish preview, run DB migrations or activate
   spatial collection without an explicit release decision.

The repository is **public**. Unlinked branch means not in the product; it is
not secret from anyone with GitHub access. If true confidentiality is needed,
the feature must be moved to a private repository with appropriate access
controls before a wider collaboration/reveal.

## Test evidence

Unit route and helper tests are added in this branch; as of authorship, a
complete npm check, live browser session and Android device validation have
**not yet been run**. Presence of tests is not evidence of a passing gate.
