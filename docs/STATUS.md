# Status

This legacy filename is retained for compatibility.

The canonical current status is [PROJECT_STATUS.md](./PROJECT_STATUS.md).
Verification procedures and historical evidence remain in
[ACCEPTANCE.md](./ACCEPTANCE.md) and [CHANGELOG.md](./CHANGELOG.md).

# Personalisation platform (2026-08-13)

Aggregate recommendation health and outcome metrics are available under the administrator Personalisation section; individual behavioural histories are not exposed.

The administrator workspace bar now supports mouse-wheel horizontal scrolling, pointer drag, touch scrolling, a visible slim scrollbar and automatic reveal of the active destination at constrained desktop widths.

Phase 1 is implemented in source: consented batch ingestion, anonymous/account profiles, impression/skip/dwell/open/quick-exit signals, saves/follows, Going, Not interested, CTA and verified check-in signals, deterministic contextual ranking, recommendation reasons/logging, diversity/exploration, privacy controls and a versioned internal API. Migration `0046_personalisation_foundation.sql` is not applied to production until isolated validation and explicit deployment approval.
