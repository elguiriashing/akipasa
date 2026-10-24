# AkiSelector: future-use animation engine

Status: feature branch / admin-only demo. Not a public AkiPasa feature.

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
- No public navigation, no sitemap addition, no feature flag activation,
  no prices, no event hooks, no backend writes, no cross-product release.

Future adopters should define actual labels, outcomes, analytics consent and
rollout strategy before connecting this to discovery or user rewards.
