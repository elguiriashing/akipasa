# Costa Events Platform — Codex Build Handoff

Status: product definition ready for implementation  
Working title: `Costa Radar` (placeholder; all branding must remain easy to rename)  
Initial launch area: Fuengirola, Los Boliches, Torreblanca/Carvajal and nearby Mijas  
Initial languages: Spanish and English

## 1. How Alex should use this handoff

Create or open an empty project folder on the PC, save this file in the folder as `CODEX_HANDOFF.md`, open Codex in that folder, switch to Plan mode, and paste:

```text
Read CODEX_HANDOFF.md completely. Treat it as the product specification and implementation contract.

Begin in Plan mode. Inspect the current folder and local development environment. If the folder is empty, propose the smallest sensible setup that satisfies the handoff. If code already exists, preserve working behavior and adapt the plan to it.

Before coding:
1. Restate the product in no more than 10 bullets.
2. Identify genuinely blocking decisions or credentials. Do not ask about choices that can safely use the defaults in the handoff.
3. Produce a phased execution plan with verification criteria.
4. Create the repository guidance and project documentation specified in this handoff.

Then implement the MVP phase by phase. Continue autonomously between phases unless an action would incur cost, create an external account, deploy publicly, modify external data, require credentials, or make a destructive change. In those cases, stop and ask first.

For every phase: implement, run the relevant tests/checks, inspect the result, fix failures, update the project documentation, and report what is now demonstrably working. Do not claim completion based only on files existing.
```

Codex should not attempt to build every future feature in one enormous pass. The MVP phases below are ordered intentionally.

## 2. Product in one sentence

A mobile-first, location-based marketplace where people discover what is happening nearby, venues publish and promote their own events and offers, and check-ins, loyalty stamps and themed passports reward local exploration.

The useful analogy is **Just Eat or Glovo for local experiences**, but it must have its own identity and must not copy another product's protected branding or interface.

## 3. Product thesis

The platform connects four activities that are currently fragmented:

1. **Discovery:** residents and visitors find relevant nearby plans quickly.
2. **Venue tools:** businesses control their venue pages, events, recurring schedules and offers.
3. **Loyalty:** customers check in, earn venue stamps, gain platform XP and complete themed passports.
4. **Agency services:** organisers can request photography, social content, paid promotion or full campaign support.

The marketplace is primarily operated by its participants:

- Verified businesses maintain their own listings.
- Consumers can suggest missing events, save/follow places, check in and report inaccurate information.
- Moderators verify businesses, review early submissions, resolve reports and manage featured content.
- Administrators manage categories, passports, permissions and platform settings.

“User-run” does not mean unmoderated. Trust, freshness and accurate event information are core product requirements.

## 4. People and primary jobs

### Guest consumer

- Find something suitable happening now, tonight, tomorrow or this weekend.
- Search near current location or a manually selected area.
- Filter by radius, category, price and accessibility-relevant attributes.
- View directions, booking/contact links and share an event without registering.

### Registered consumer

- Save events and follow venues.
- Check in at participating venues.
- Collect venue loyalty stamps.
- Earn non-monetary platform XP and badges.
- Join and complete themed passports.
- Submit missing events and report changes or cancellations.

### Business owner or staff member

- Claim or create a venue.
- Manage venue information and staff access.
- Publish one-off and recurring events.
- Publish time-limited offers.
- Create a simple venue loyalty programme.
- See useful, privacy-respecting analytics.
- Request promotional or agency support.

### Moderator

- Verify venue claims.
- Approve first-time or flagged content.
- Merge duplicates.
- review reports and suspicious check-ins.
- Mark events cancelled, postponed or sold out.

### Administrator

- Manage roles, categories, cities, feature flags and platform content.
- Create and sponsor platform passports.
- Feature events and venues with a transparent audit trail.
- Review operational metrics and moderation history.

## 5. Experience principles

- **Useful before signup:** discovery must work without an account.
- **Location with consent:** never demand location access; always offer manual location selection.
- **Time first:** “Now”, “Tonight”, “Tomorrow” and “This weekend” matter more than a generic calendar.
- **Fresh by design:** expired occurrences disappear automatically; cancellations remain clearly labelled where useful.
- **Bilingual from the foundation:** interface and content data must support Spanish and English without duplicating application logic.
- **Mobile first:** optimise for someone standing outside asking what to do next.
- **Low-friction publishing:** recurring events and duplication are essential for small venues.
- **Trust is visible:** distinguish verified venue content, community submissions and sponsored placement.
- **No fake popularity:** do not invent attendees, views, scarcity or recommendations.
- **Accessible and fast:** keyboard support, semantic HTML, readable contrast, alt text, reduced-motion support and strong mobile performance.

## 6. MVP boundaries

### Included

- Installable responsive web app/PWA.
- Spanish and English UI.
- Public list and map discovery.
- Current-location or selected-location search.
- Radius filters such as 1 km, 5 km, 15 km and 30 km.
- Time filters: now, tonight, tomorrow, weekend and custom date.
- Category, free/paid and price filters.
- SEO-friendly event and venue pages.
- External ticket, reservation, WhatsApp, phone and directions actions.
- Consumer accounts for saves, follows, check-ins, XP, stamps and passports.
- Business accounts, venue claiming and staff membership.
- One-off and recurring event creation.
- Time-limited offers.
- Flyer/poster upload with manual entry of accessible event information.
- Venue-specific stamp programmes.
- Platform-created passports.
- QR-based check-ins with basic anti-abuse limits.
- Community submissions and reports.
- Moderation/admin interface.
- Basic product analytics and business-facing aggregate analytics.
- “Promote this event”/agency enquiry workflow.
- Seed/demo data for Fuengirola-area venues and events that is clearly fictional unless sourced with permission.

### Explicitly excluded from MVP

- Native iOS or Android applications.
- A proprietary ticketing/payment system.
- Cash-equivalent, transferable or cross-venue reward currency.
- Automated ad purchasing or posting to external social accounts.
- Public reviews and star ratings.
- Direct messaging or a social feed.
- Artist/supplier marketplace.
- Real-time capacity claims unless a venue supplies them.
- Fully automatic AI copywriting or translation.
- Province-wide launch.
- Scraping sites whose terms or access controls do not permit it.

External booking links are sufficient for MVP. Payment and ticket commission can be added behind a provider interface later.

## 7. Recommended technical direction

Codex must inspect the local environment and choose currently supported, mutually compatible stable package versions. Avoid unnecessary version pinning in this handoff.

Preferred default architecture:

- TypeScript throughout.
- A modern React framework with server rendering and strong SEO support; Next.js App Router is the default unless the existing repository provides a better-supported equivalent.
- PostgreSQL as the source of truth.
- PostGIS/geography support for reliable radius searches.
- Supabase is an acceptable MVP provider for hosted PostgreSQL, authentication, row-level security and object storage.
- A provider-abstracted map component using MapLibre or another production-suitable mapping service. Do not depend directly on a public OpenStreetMap tile endpoint for production traffic.
- Component styling with an accessible utility/design-system approach; the exact library should remain replaceable.
- Schema-validated forms and server inputs.
- Database migrations and deterministic seed scripts.
- Unit/integration tests plus a small set of critical browser end-to-end tests.
- Deployment configuration should be provider-neutral where practical.

If credentials are unavailable, implement adapters and local/mock development modes. Do not block the entire build on maps, email, storage or analytics accounts.

The Codex subscription is used to build the software. It does not supply runtime AI API usage for the finished application. Any future AI translation, flyer extraction or copy-generation feature must use a separately configured provider/API and remain optional.

## 8. Proposed application structure

The exact structure may follow the chosen framework, but responsibilities should be clear:

```text
app/
  public discovery routes
  authentication routes
  consumer account routes
  business dashboard routes
  moderator/admin routes
components/
  discovery/
  events/
  venues/
  loyalty/
  maps/
  forms/
lib/
  auth/
  database/
  geo/
  permissions/
  moderation/
  checkins/
  analytics/
  providers/
messages/
  es/
  en/
database/
  migrations/
  seeds/
tests/
docs/
```

Keep business rules out of visual components. Provider integrations must be behind small interfaces so maps, email, storage, analytics and future ticketing can be replaced.

## 9. Core data model

Names may change to match conventions, but the concepts and relationships should remain.

### Identity and permissions

- `profiles`: application profile linked to authentication identity.
- `roles` or role claims: consumer, organiser, moderator and administrator.
- `venue_members`: connects a profile to a venue with owner/manager/editor roles.
- All privileged actions must be enforced server-side and, where applicable, through database row-level security—not just hidden in the UI.

### Places

- `cities`: launch areas and future expansion areas.
- `venues`: name, slug, description translations, address, geography point, contacts, opening data, accessibility attributes, verification status and owner state.
- `venue_claims`: claimant, evidence/status, moderator decision and timestamps.
- `venue_media`: owned/authorised image metadata, alt text and sort order.

### Events

- `events`: canonical event information, organiser/venue, translated fields, category, price model, age restrictions, booking/contact actions, visibility and moderation state.
- `event_occurrences`: start/end timestamps for one-off or recurring dates, status, cancellation/postponement metadata and optional occurrence-specific booking URL.
- `recurrence_rules`: structured recurrence information or a standards-compatible rule with safeguards.
- `categories` and event-category relationships.
- `offers`: venue-linked, time-bounded offers with clear terms.
- `event_submissions`: community-suggested events awaiting verification or venue claim.
- Separate event identity from occurrences. A weekly quiz should be one event with many occurrences, not dozens of unrelated records.

### Consumer actions

- `saved_events`.
- `venue_follows`.
- `reports`: target type/id, reason, details, state and resolution.
- `analytics_events`: privacy-minimised first-party events such as detail view, directions click, booking click, share and agency enquiry.

### Loyalty and passports

- `loyalty_programs`: venue-owned stamp rules and reward terms.
- `check_ins`: consumer, venue, optional occurrence, source, timestamps and risk flags.
- `loyalty_progress`: stamps and redemptions with an append-only ledger or equivalent auditable history.
- `passports`: platform or sponsor-created campaign, validity, area, rules and published state.
- `passport_steps`: required venue/category/action.
- `passport_progress`: consumer completion state.
- `xp_ledger`: non-transferable, non-cash platform XP with reason and idempotency key.
- `rewards`: descriptive reward and fulfilment terms; MVP redemption may be staff-confirmed.

### Operations

- `promotion_requests`: venue/event, requested service, message and lead status.
- `moderation_actions`: actor, action, target, reason and timestamps.
- `feature_slots` or promotions: date-bounded featured placement with a sponsored flag.

Use UTC in storage and render using the venue's time zone. Default launch time zone is `Europe/Madrid`.

## 10. Discovery and ranking behaviour

Search inputs:

- Latitude/longitude supplied temporarily by the browser after consent, or coordinates of a selected locality.
- Radius.
- Time window.
- Categories.
- Free/paid and optional price bounds.

Default ordering should be explainable:

1. Occurrences that are currently active.
2. Soonest relevant start time.
3. Distance.
4. Clearly labelled sponsored/featured treatment in dedicated slots, not secretly mixed into organic ranking.

Rules:

- Do not persist precise consumer location by default.
- Exclude drafts, rejected content and expired occurrences.
- Include cancelled/postponed occurrences only when directly visited or saved, with an unmistakable status.
- Handle events crossing midnight correctly.
- “Tonight” must use local time and extend past midnight by a documented cutoff.
- Deduplicate repeated submissions and recurring event instances.
- Return useful results when location permission is denied.

## 11. Publishing and moderation workflow

1. A business registers and creates or claims a venue.
2. The venue claim enters review unless automatically verifiable through an approved method.
3. A new/unverified publisher's first events enter moderation.
4. A trusted verified venue may publish directly.
5. Material edits to sensitive details such as venue, time, ticket link or age restriction are audited and may re-enter review.
6. Community submissions remain labelled and enter review before public publication.
7. Users and venues can report cancellations, duplicate content, scams or incorrect details.
8. Events expire automatically after their final occurrence.

Every moderation decision should record who acted, what changed, why and when. Admin actions must not be anonymous database mutations.

## 12. Loyalty and passport rules

### MVP check-in

- Each venue can display a QR code representing a check-in route/token.
- Authentication is required to record a check-in.
- Enforce idempotency and a configurable cooldown, initially one accepted check-in per user and venue within six hours.
- Apply server-side rate limits.
- Store enough metadata to investigate abuse without collecting unnecessary personal location history.
- A check-in can award one venue stamp, XP and eligible passport-step progress in one atomic operation.
- The operation must be safe to retry without duplicate rewards.

A static QR is acceptable for the private alpha if its limitations are documented. Design the service so rotating signed QR tokens and optional proximity checks can replace it later.

### Rewards

- Venue stamps belong to that venue's programme.
- Platform XP has no cash value, cannot be transferred and cannot be purchased in MVP.
- Passport rewards must state the sponsor/venue, availability, expiry and redemption method.
- All grants and redemptions need an auditable ledger.
- Reward rules must be snapshot or version aware so changing a programme does not silently rewrite earned progress.

## 13. Core screens

### Public/mobile navigation

- **Discover:** time-led cards, category chips and location/radius control.
- **Map:** clustered nearby occurrences with an accessible list alternative.
- **Passports:** available campaigns and progress for signed-in users.
- **Saved/Profile:** saved events, followed venues, stamps, XP and settings.

### Event detail

- Status, title, venue, local date/time, distance, category, price, age/access information and description.
- Directions, booking/contact, save, share and report actions.
- Source/organiser and sponsored status.
- Structured event metadata for search engines.

### Venue detail

- Venue information, verification state, directions/contact and authorised media.
- Happening now/upcoming occurrences.
- Offers.
- Loyalty programme and passport participation.
- Follow and report actions.

### Business dashboard

- Onboarding and claim status.
- Venue editor.
- Event list/calendar and create/duplicate/recurrence workflows.
- Offers and loyalty configuration.
- QR/check-in materials.
- Aggregate views, directions clicks, booking clicks and check-ins.
- Promotion request form.
- Staff and permissions.

### Moderator/admin

- Review queues.
- Venue claims.
- Reports and duplicates.
- Event/venue status controls.
- Passport editor.
- Feature/sponsorship controls.
- Moderation audit trail.

## 14. Visual direction

- Energetic Mediterranean/Costa del Sol character without tourist-brochure clichés.
- Functional inspiration may come from delivery and discovery apps: large location control, obvious filters, visual cards and quick actions.
- Do not copy Just Eat, Glovo, Fever or another competitor's layout, icons, brand colours or microcopy.
- Use a renameable theme and design tokens because the final name and identity are undecided.
- Prioritise clear event imagery, time, distance and category over decoration.
- Design 360 px-wide mobile layouts first, then tablet and desktop.

Use placeholder brand variables such as `PRODUCT_NAME`, `primary`, `accent` and logo assets. Do not scatter the working title through the codebase.

## 15. Privacy, security and legal guardrails

- Apply data minimisation and privacy-by-default.
- Request browser location only in response to a clear user action and explain the benefit.
- Browsing must work without tracking consent or an account.
- Provide account deletion and data export paths or documented operational placeholders for alpha.
- Protect authentication, role changes, business claims, uploads and check-ins server-side.
- Validate file type/size and store uploads outside executable paths.
- Rate-limit authentication-sensitive, submission, report and check-in endpoints.
- Escape/sanitise user content and prevent unsafe URL schemes.
- Use secure secret handling and include only placeholders in `.env.example`.
- No real personal information or copyrighted event artwork in seed data.
- Record consent/terms acceptance versions where legally relevant.
- Clearly label advertising and sponsored placement.
- Do not represent the MVP as legally reviewed; create a `docs/LEGAL_REVIEW.md` checklist for professional review before public launch.

Areas for later legal review include GDPR notices and data-subject rights, platform terms, business verification, user-generated content/takedowns, promotions and prize terms, ticket/payment obligations, consumer law, image rights and any age-restricted venue/event categories.

## 16. Analytics

MVP analytics should answer:

- Are people finding relevant nearby events?
- Which filters and time windows are used?
- Which venue/event pages generate directions, booking or WhatsApp actions?
- Are businesses publishing consistently?
- Which passports and loyalty programmes generate valid check-ins?
- How quickly are reports and venue claims resolved?
- Do promotion enquiries convert into agency leads?

Business analytics must be aggregated and scoped to venues the business can manage. Do not expose consumer identities or precise location histories.

Suggested initial events:

- discovery search performed
- event detail viewed
- venue detail viewed
- directions clicked
- external booking clicked
- share initiated
- event saved
- venue followed
- check-in accepted/rejected
- passport step completed
- promotion requested

Document event names and properties in `docs/ANALYTICS.md` before instrumenting them.

## 17. Delivery phases

### Phase 0 — Decisions, repository and contract

Deliver:

- Repository setup and dependency choices.
- `AGENTS.md` with concise repo layout, commands, conventions, safety constraints and definition of done.
- `README.md` with local setup.
- `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md` and `docs/LEGAL_REVIEW.md`.
- `.env.example` with no secrets.
- Formatter, linter, type checker and test commands.

Done when a new developer can install dependencies, run the app and run checks from documented commands.

### Phase 1 — Foundation and demo discovery

Deliver:

- Database schema/migrations for identity, venues, events and occurrences.
- Deterministic fictional seed data around the launch area.
- Spanish/English application shell.
- Public responsive discovery feed and event/venue pages.
- Manual locality selection, time/category/price filters and correct timezone handling.
- Basic map adapter with a fallback list when no map credentials exist.
- SEO metadata, event structured data and sitemap foundations.

Done when a guest can find seeded nearby events without signing in and all tests/checks pass.

### Phase 2 — Accounts and venue self-service

Deliver:

- Authentication and profiles.
- Role/permission enforcement and row-level rules where supported.
- Venue create/claim flow and staff roles.
- Event create/edit/duplicate, occurrence and recurrence flows.
- Offers and media metadata/uploads through a provider adapter.
- Business dashboard.

Done when a venue owner can maintain only their own venues/events and an unauthorised user is rejected server-side in automated tests.

### Phase 3 — Community and moderation

Deliver:

- Event suggestion and reporting.
- Verification/moderation queues.
- Duplicate and status handling.
- Trusted-publisher workflow.
- Audit log.
- Automatic expiry/status jobs with a locally runnable alternative.

Done when first-time content follows review rules, trusted venues can publish, reports can be resolved, and actions are auditable.

### Phase 4 — Check-ins, loyalty and passports

Deliver:

- QR generation and check-in route.
- Atomic/idempotent reward service.
- Venue stamp programme and progress.
- XP ledger.
- Passport creation, steps, eligibility and progress.
- Staff-confirmed reward redemption.
- Rate limits, cooldowns and abuse flags.

Done when repeated requests cannot duplicate rewards and the critical earn/redeem flows have integration and browser tests.

### Phase 5 — Agency funnel and analytics

Deliver:

- “Promote this event” workflow.
- Agency lead dashboard/status.
- Documented first-party analytics taxonomy.
- Business aggregate analytics.
- Sponsored/featured slots with clear labels and time bounds.

Done when a venue can submit a promotion request and an authorised operator can manage it without accessing unrelated business data.

### Phase 6 — Hardening and release candidate

Deliver:

- PWA manifest/icons/offline-safe shell where appropriate.
- Accessibility audit and fixes.
- Performance review, image optimisation and query/index review.
- Security/permission review.
- Responsive browser checks.
- Backup/migration/rollback documentation.
- Production deployment runbook, but no deployment without approval.
- Complete demo script and acceptance checklist.

Done when lint, formatting, type checks, unit/integration tests and critical end-to-end tests pass, and remaining known issues are recorded rather than hidden.

## 18. Required acceptance scenarios

Codex must automate these where practical and document any manual checks.

1. Guest selects Fuengirola and sees only published, relevant occurrences in the selected time window.
2. Denying browser location does not break discovery.
3. An event spanning midnight appears correctly in “Tonight”.
4. A recurring weekly event displays separate occurrences but one canonical event page.
5. Spanish/English switching preserves the current route and has sensible fallback content.
6. A consumer cannot access organiser or admin operations.
7. An organiser cannot edit another organiser's venue or event, including through direct API calls.
8. A verified venue can create and publish according to its trust state.
9. A community submission enters moderation and is not silently treated as verified business content.
10. Cancelled events are visibly labelled and removed from normal active discovery.
11. Expired occurrences disappear from normal results automatically.
12. One check-in awards the correct stamp, XP and passport progress.
13. Retrying the same check-in cannot award rewards twice.
14. Cooldown and rate limits reject obvious repeated abuse.
15. Reward redemption is auditable and cannot produce a negative or duplicated balance.
16. Venue analytics contain only that venue's aggregate data.
17. Sponsored placement is labelled.
18. Unsafe links, oversized/invalid uploads and untrusted HTML are rejected.
19. All primary mobile flows are keyboard accessible and usable at 360 px width.
20. Seed/reset commands produce deterministic demo state without touching production data.

## 19. Engineering rules for Codex

- Start with a plan and keep it updated.
- Prefer the smallest architecture that satisfies the current phase.
- Do not fabricate credentials, legal approval, real partners, user numbers or market traction.
- Do not create paid resources, external accounts, public deployments or external messages without approval.
- Do not commit secrets or personal data.
- Keep migrations reversible where practical and document destructive migrations.
- Use transactions for check-ins, reward grants and redemptions.
- Use idempotency keys for reward-producing actions.
- Enforce permissions in tests, not merely in visual inspection.
- Treat geospatial and timezone edge cases as first-class requirements.
- Maintain fixtures/factories instead of brittle hard-coded test state.
- Add dependencies only when their value exceeds their maintenance cost.
- Do not build excluded features “while here”. Record future ideas in `docs/ROADMAP.md`.
- After each phase, run formatter, lint, types, tests and the relevant build command.
- Review the resulting diff for regressions and update documentation that has become false.
- If a test cannot run because of the environment, state the exact reason and provide the command Alex should run.

## 20. Decisions Codex may make without asking

Codex may choose:

- Exact compatible package versions.
- Folder/module names that fit framework conventions.
- Accessible component primitives.
- Testing tools compatible with the stack.
- Local mock adapters and fictional seed data.
- Sensible default spacing, typography and temporary theme tokens.
- Whether an implementation detail is a table, enum or validated configuration when behaviour remains equivalent.

Codex must ask before:

- Buying or provisioning paid services.
- Deploying publicly or connecting a real domain.
- Sending emails/messages or posting externally.
- Enabling real payments/ticket sales.
- Using real venue/customer data.
- Choosing the final brand/name.
- Making the reward system cash-equivalent or transferable.
- Substantially expanding beyond the MVP or launch geography.
- Performing destructive operations that could remove existing work or data.

## 21. Future roadmap, not current scope

- AI-assisted flyer extraction with human confirmation.
- AI-assisted Spanish/English translation and promotional copy.
- Rotating signed QR codes and optional privacy-preserving proximity validation.
- Native applications if usage justifies them.
- Integrated ticketing and provider commission.
- Artist, performer, photographer and equipment marketplace.
- Group planning and friend invitations.
- Hotel/concierge portals.
- White-label council, hotel or shopping-centre calendars.
- Sponsor-funded city passports.
- Benalmádena, Torremolinos, Málaga city and wider Costa del Sol expansion.
- Additional languages based on measured demand.

## 22. Product validation alongside development

Software does not prove the business. During the build, the founders should independently validate:

- Interview at least 15 venues/promoters.
- Secure 5–10 founding venues willing to maintain listings.
- Manually collect enough permissioned event data to make one area useful.
- Test a “Tonight in Fuengirola” Instagram/WhatsApp distribution loop.
- Measure event-detail, directions, booking and share actions.
- Test willingness to pay for self-service, boosted visibility and managed promotion separately.
- Learn whether users respond more strongly to events, offers, passports or loyalty.

The product should make these experiments measurable without pretending early metrics are statistically conclusive.

## 23. MVP success indicators

These are hypotheses to validate, not promises:

- A reliable weekly supply of current events from participating venues.
- Repeat discovery usage rather than one-off visits.
- Meaningful directions/booking/contact conversion from event pages.
- Businesses returning to publish without being chased every week.
- Valid check-ins and passport completions without high abuse/support burden.
- Several businesses willing to pay for tools or promotional help after an introductory period.

## 24. Final handoff expectation

At the end of every Codex working session, leave the repository in a recoverable state and report:

- What works now.
- What was verified and with which commands.
- What remains incomplete.
- Any assumptions or known risks.
- The next smallest useful task.

The definition of done is working, tested behaviour that matches this product contract—not a pile of attractive components and optimistic comments.
