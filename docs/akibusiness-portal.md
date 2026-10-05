# AkiBusiness portal architecture

## Product split

AkiPasa now treats the three signed-in product surfaces as separate experiences that share one identity and one source of truth:

- `akipasa.com`: consumer discovery, Map, Passport, AkiPals, creators, staff and administration.
- `business.akipasa.com`: AkiBusiness, for venue owners and managers to maintain their public presence, events, loyalty, promotion, claims and analytics.
- `crm.akipasa.com`: AkiHQ, for private operating tools such as CRM, PoS, inventory and staff workflows.

The products use the same Supabase project, profile identity, venue memberships, business applications and entitlements. There is deliberately no second copy of business data to synchronise.

## Routing

Requests for `/{locale}/business/**` on the primary host are redirected to the same path on `business.akipasa.com`.

The AkiBusiness host accepts business routes, authentication routes and the APIs needed by those tools. Consumer-only pages are redirected back to `akipasa.com`.

The AkiBusiness host does not render the consumer AppShell, discovery rail, Passport navigation or map navigation. Business routes keep their own focused workspace navigation.

## Authentication

AkiBusiness uses the existing Supabase user account and role/entitlement checks. A user signs in with the same email or Google identity but receives a session for the business host.

Before enabling Google, magic-link or email-confirmation callbacks in production, add these redirect patterns to the Supabase Auth redirect allow-list:

- `https://business.akipasa.com/es/auth/callback**`
- `https://business.akipasa.com/en/auth/callback**`

The normal AkiPasa login screen links directly to AkiBusiness and AkiHQ. The AkiBusiness login screen also links back to the consumer app.

## Data ownership

Existing tables and policies remain authoritative. Do not migrate rows into a second business database merely because the UI moved to another hostname.

Relevant existing records include, among others:

- `profiles`
- `business_applications`
- `venue_members`
- `venues`
- `venue_claims`
- `events` and `event_occurrences`
- `loyalty_programs` and `reward_redemptions`
- `promotion_requests`
- subscription/entitlement records
- existing CRM workspace tables used by AkiHQ

This keeps identity, ownership and entitlements consistent across all products while allowing each product to have its own UX.

## Product boundary

AkiBusiness owns public-facing business management. AkiHQ owns private day-to-day operations. The old embedded AkiHQ CRM block has been removed from the AkiBusiness venue landing page; AkiHQ is reached as a separate product from the AkiBusiness top bar or login portal.

## Deployment

The Cloudflare Worker is configured with `business.akipasa.com` as a custom domain. The public deployment still comes from `master`.

Before merging/deploying, verify:

1. `business.akipasa.com/` redirects to `/es/business`.
2. An unauthenticated business route goes to the AkiBusiness login page.
3. Existing business users see the same managed venues and events as before.
4. `akipasa.com/es/business` redirects to the business host.
5. Consumer navigation no longer embeds business application or CRM shortcuts.
6. OAuth/magic-link callbacks return to the business host.
7. AkiHQ continues to open independently at `crm.akipasa.com`.
