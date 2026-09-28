# Compact consumer UI — September 2026

## Layout plan and review

Keep the green/orange visual identity and the existing bottom navigation. Use a
50px mobile top bar, a 64px bottom bar plus device safe areas, 44px controls,
12px section spacing and restrained typography. Scope these changes to consumer
screens so the business tools retain their existing layout.

- Explore: two city tiles in each swipeable row, compact venue rows and short
  empty states. Keep photo credits reachable and pagination intact.
- Search: one shared search/filter popover, two-column filters and collapsed
  advanced options. Map searches stay on the map route.
- Map: remaining viewport is the map. No duplicate hero or filter form. Place
  layer controls and the list button over the map; expand the legend on demand.
  A native modal right drawer contains paginated nearby results. Its heading
  identifies the selected locality: these lists represent search filters, not
  the current dragged map bounds. Preserve nationwide map browsing.
  Full-screen maps allow one-finger panning and normal wheel zoom; embedded
  maps retain cooperative gestures so users can scroll their containing page.
- Community directory: compact introduction/action row, search, category chips,
  then smaller creator cards. Avoid repeated titles.
- Creator editor: Profile, Images and Events tabs; keep panels mounted to retain
  unsaved input. Short paired fields, compact category chips, optional English
  translation and URL fields in disclosures. Expand invalid collapsed fields.
  Keep save accessible above the bottom navigation.
- Public creator profiles: shorter cover, single name, horizontal stats,
  condensed gallery, FAQ and contact sections.
- Venue and event detail pages: one shared compact surface, identity shown once,
  short optional cover, facts and primary actions before longer content.
  Venue address appears once; omit empty events headings and unknown-access
  placeholder rows. Keep follow/save/share visible, group claim/report/calendar
  and trip-planning links in a native “More options” disclosure. Preserve all
  booking eligibility, authentication return URLs and engagement forms.
  Venue galleries scroll horizontally; event descriptions start expanded.
  Use 44px actions, paired mobile facts/actions and three columns on desktop.

Review improvements: do not force long content into one fixed screen. Only the
map has fixed viewport height. Forms and descriptions scroll naturally, with
44px tap targets and 16px input text. Use native dialog focus management and
Escape dismissal; editor tabs support arrow keys, Home and End.

## Membership

The membership route uses Personal, Business and Pro tabs with keyboard navigation.
Only one plan is visible at a time; monthly and annual prices remain side by side.
Keep existing plan/authentication destinations and prices. Business and Pro hash
links select their respective panels. Free venue claiming stays visible; the full
business-tool explorer, availability notes and conditions are in a disclosure.
The core selector targets one mobile screen, allowing natural scroll for expanded
information, smaller screens and larger accessibility text. Footer and privacy
controls follow content with bottom-navigation clearance only at the end.

## Release

Public source is master. Validate formatting, lint, types, tests and build;
inspect mobile layouts and verify the deployed map and CityDiscovery homepage.
Authenticated save/upload checks require a signed-in account and are separate
from local component tests; do not alter a real profile for visual testing.

## Account subscription

Signed-in billing now shares the membership tabs, honoring the incoming plan query.
The account identity hero is omitted on this route. Current access and portal management
stay above the picker; raw subscription and grant records expand on demand.
Each plan has a single checkout form with native monthly/annual radio cards, explicit
prices and annual savings, one business-category selector and one Continue action.
Server checkout validation, access grants, billing portal and processing notices are preserved.
Scoped mobile spacing removes the footer gap and leaves navigation clearance after
privacy controls. Small screens and enlarged text retain natural scrolling.
