# M3 CharacterStudio engine evaluation

Requested by Alex on 29 October 2026 after rejection of the existing avatar art.

M3 is a useful engine candidate, not a ready-made AkiPals creator. Retain its
character loading, modular trait handling and VRM support behind an AkiPasa-owned
adapter. Do not adopt its wallet application, NFT ownership, marketplace or bundled
artwork wholesale. Engine feasibility and visual acceptance are separate decisions.

## Source and implemented experiment

Upstream: [M3-org/CharacterStudio](https://github.com/M3-org/CharacterStudio),
MIT code pinned to `293182bf4a6087f4a4a7fd00e4fbdfb590029da7`.
The independent prototype is `/workspace/akipasa-m3-prototype`; it is not imported
by the application or deployed.

The selected core removes wallet, token, NFT, mint and purchasing dependencies.
It rejects unapproved catalog selections before asset loading, permits only bounded
local asset paths, fixes pending load failures and manager disposal, and defers
expensive export renderer allocation. An unused encoder that pulled an external
WASM CDN into the dependency graph was removed. The wrapper supplies EN/ES,
responsive framing, touch orbit, local fixture persistence, errors and retries.
No upstream environment files, certificates or private keys were copied or run.

The latest baseline browser proof covers 17 actual Chromium cases: four widths,
EN/ES, reduced motion, real VRM drawing, touch, local save/restore, error recovery,
context loss and repeated teardown. Bundle hashes in the receipts delimit the
proof. This does not establish private server persistence, human artwork quality
or physical Android acceptance.

The final professional-model run produced 26 real captures at 360 and 1440 px
plus four repeated loads, using bundle
`5c333bf504d12192c95ab7be3bc4a2697a7dc99cb5e2f46ea056083e0ec90266`.
Both models loaded through the unmodified license checks. Assertions verified
finite skin matrices, valid weights, original material maps, visible authored
expression changes, downward diagnostic arm movement and head/hair framing.
There were no external requests, mutation requests, page errors or GPU-context
warnings. Engineering inspection confirmed the corrected portraits and poses;
this is not Alex's visual acceptance. The prototype now pins its own Playwright
dependency and does not require a neighboring application checkout for QA.

## Artwork and licensing boundary

MIT applies to the code, not every model. Inspected M3 packs contain author-only,
noncommercial and no-redistribution assets. Removing NFT checks does not grant
rights to these assets. They are excluded from the prototype catalog.

Orion is a separately cleared CC0 technical robot fixture. It is not proposed as
human character artwork. Blender Foundation Rain and Snow are separately sourced
CC-BY-4.0 professional human rigs, with original grants, source hashes, attribution
and modification notices retained in the asset receipts. They are engineering
compatibility samples, not a completed customizable character collection.

VRM1 requires the VRM Public License URL in its license metadata. The original
experimental exports were rejected by the default loader; its checks were not
widened. Native VRM0 has a `CC_BY` enum that the official specification explicitly
links to CC BY 4.0. That representation preserves the original grant and credits
without falsely relabeling the models under a new license. Runtime deformation,
expressions and camera framing still require actual visual verification.

Neither professional model currently supplies the required wardrobe, face shape,
hair or skin-tone variants. Rain retains 376 deformation joints; Snow retains 51.
Their experimental files are approximately 11.2 MB and 13.6 MB, with estimated
uncompressed RGBA texture plus mipmap storage around 86 MB and 95 MB. These are
engineering estimates, not measured GPU allocations or approved mobile budgets.

The runtime scope audit measures the standalone minified core at approximately
1.36 MB (354 KB gzip). Optional export, screenshot, atlas and FBX modules account
for roughly 407 KB before compression. Defer those modules behind explicit export
actions for integration; this is an identified optimization boundary, not a claim
that an optimized build has already passed. Existing application Three.js code may
be shared, so the standalone size is not an incremental application measurement.

## AkiPasa integration contract

1. Keep the renderer and assets behind an owned engine interface. Load the editor
   only when needed, stop work while idle, dispose all GPU/timer/listener resources,
   and provide a useful reduced-motion/WebGL-unavailable alternative.
2. Use a reviewed, self-hosted catalog. Server wardrobe ownership remains the
   authority; client catalog flags are display information, not authorization.
   Retain owner-only profile and wardrobe boundaries and existing RLS checks.
3. Introduce an explicit versioned persisted identity with catalog/model IDs and
   supported authored choices. Validate it on the server. Never submit prototype
   DTOs to the existing strict appearance endpoint or reinterpret legacy saved
   identities. Preserve legacy restoration until a tested migration is approved.
4. Commission or curate a coherent, licensed human asset system with compatible
   skeletons, authored expressions and useful customization. Require geometry,
   texture, draw-call and memory budgets before mobile admission. Do not pretend
   a recolored robot or two fixed sample models constitute this creator.
5. Test real customization, restoration, unauthorized wardrobe access, lifecycle,
   EN/ES, themes, keyboard, reduced motion and Android WebView. Final artwork and
   physical device review remain Alex's acceptance boundary.

No crypto, wallet connection, NFT gating, random paid rewards or asset checkout is
needed for this product direction. No billing, production customer data, schema,
consent, production deployment or existing saved appearance was changed by this
experiment. PR #332 remains draft and release acceptance remains separate.
