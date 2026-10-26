# AkiSelector: future-use animation engine

Status: private administrator playground plus owner-authorized login workspace adapter.
The lab route remains private; the reusable engine now also powers the five-product
public sign-in chooser.

The selector recreates the interaction mechanics from the reference clip:
centred cards, themed energy effects and animated selection. It has no concept
of venues, map filters, rewards, locations, analytics or subscription status.

## Hidden playground

Authenticated administrators can visit /en/admin/selector-lab or
/es/admin/selector-lab. The route is unlinked and noindex, but access control
is a real server-side administrator profile check, not a secret URL. Changes
made in the preview are not stored and reset on refresh.

## Reuse

Import AkiSelector from @/components/aki-selector/AkiSelector in any client
component. Pass an array of items containing stable unique id, label, symbol,
optional effect, subtitle and disabled values. Provide an ariaLabel.

Example, in TSX:
<AkiSelector ariaLabel="Pick a theme" options={[
{ id: "night", label: "Nightlife", symbol: "☾", effect: "aurora" },
{ id: "music", label: "Music", symbol: "♫", effect: "ember" }
]} value={selected} onValueChange={(id) => setSelected(id)} />

Controlled API: value and onValueChange. Uncontrolled API: defaultValue.
The host decides what selection means; the engine performs no network calls.
Effects: ember, solar, bloom, breeze, aurora, quiet.
Intensity: subtle, balanced, cinematic. Motion: auto, off.

## Acceptance and safeguards

- Role-radiogroup semantics, keyboard arrows/Home/End, adjacent-card click
  and 44px previous/next touch controls.
- Phone pointer-swipe gestures preserve vertical scroll.
- CSS-only gradients and shapes, no Canvas/WebGL/assets/third-party packages.
- Reduced-motion system settings and explicit motion-off prevent animation.
- Automated checks:
  npx vitest run --config vitest.akisuite.config.ts tests/akisuite-selector-engine.test.tsx
  npm run check
- Review EN/ES signed-in admin at desktop, tablet and phone sizes, confirm
  keyboard/touch accessibility and low-end Android frame-rate before any
  public integration. Hosted CI and production-SHA deployment remain separate.
- The lab has no public navigation or sitemap addition; login adoption adds no feature flag activation,
  no prices, no event hooks, no backend writes, no cross-product release.

Future adopters should define actual labels, outcomes, analytics consent and
rollout strategy before connecting this to discovery or user rewards.

## Cinematic materials (26 October 2026)

The existing effect IDs now render distinct inline SVG masks: flame tongues,
liquid ribbons, diagonal aero wakes, precision gimbals and spectral curtains.
No image/provider requests are added. An energy state is independent of the
selected value: mouse hover previews material without relocating the link or
firing onValueChange; leaving restores selected energy. Keyboard/pointer-down
clear hover. Touch and pen retain the existing swipe/direct-link behavior.

Artwork remains mounted while opacity decays over 650ms. Activation ramps in
over 280ms, with a one-shot lens flare, expanding wave and glass reflection;
card travel eases over 680ms. Rapid interruptions use native CSS interpolation,
without queued timers or JavaScript animation frames. Ten deterministic particles
per card have material-specific trajectories; inactive loops pause. Reduced
motion and motion=off remove loops, flare and transitions.

The shared browser runner tests interpolated incoming/outgoing opacity, rapid
interruption, stable hover geometry and reduced motion alongside its 12-case
EN/ES × light/dark × phone/tablet/desktop matrix. The static AkiBusiness adapter
uses identical CSS and equivalent DOM state. Login link semantics and the
administrator-only lab remain unchanged. Physical Android performance and
production source acceptance are separate from local browser evidence.

## Product opening stories

Options may set arrival to pasa, duermo, coches, hq or business independently
from their generic effect. A decorative three-layer opening runs once whenever
the card becomes energized, followed by its continuously looping material.
The login adapters opt in; generic lab examples do not inherit product meanings.
CSS cancels interrupted openings and restarts on re-entry, without queued timers,
requestAnimationFrame loops, new dependencies or navigation delays. Native reduced
motion and motion=off hide the opening. Browser acceptance samples each actor
above zero opacity, confirms a single iteration and then zero actor/full idle
opacity. The same masks and timelines serve the static Business adapter.
