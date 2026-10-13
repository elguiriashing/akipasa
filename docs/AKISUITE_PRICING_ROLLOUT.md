# AkiSuite rollout — implementation and release gates

The approved merchant account now displays **AkiPasa Marketing S.L.** (previously Alex Ashing LTD), `acct_1SVLH2GfzDhsgsQZ`. Account use is authorised; this is distinct from confirming its legal invoicing identity and VAT treatment. The seven existing products and fourteen live recurring prices were retrieved and verified, with no duplicates created. `docs/akisuite-live-price-audit.json` records non-secret IDs, amounts, currency, cadence and metadata. Wrangler retains every legacy price and configures the fourteen new IDs with all five activation flags **false**.

| Plan                       | Monthly EUR | Annual EUR |
| -------------------------- | ----------: | ---------: |
| AkiPasa Premium            |        1.99 |      19.10 |
| AkiBusiness Premium        |       14.99 |     143.90 |
| AkiDuermo Premium          |        5.99 |      57.50 |
| AkiHQ Standard             |       20.00 |     192.00 |
| AkiHQ Pro                  |       60.00 |     576.00 |
| Business add-on for HQ Pro |        7.99 |      76.70 |
| Aki Enterprise             |       79.99 |     767.90 |

Annual amounts are rounded cents of monthly × 12 × 0.8. Enterprise includes personal AkiPasa Premium for its payer and Business/Duermo Premium plus HQ Pro for its authorised workspace. HQ Pro includes Standard tools. Employees inherit workspace tools through their existing membership and role template, never the owner's personal Premium or access to unrelated organisations.

## Shared catalogue

The public and account membership pages always render all seven plans, Enterprise first. Monthly/yearly controls, actual annual savings, origin-app highlight, current access and EN/ES copy use one component. Root and localised `membership(s)` and account `membership(s)/subscription` aliases on AkiPasa, Business and Duermo lead to canonical AkiPasa membership/account routes. Companion HQ navigation includes `from=akihq`. Checkout activation never controls catalogue visibility. Current workplace access is displayed separately from payer invoices and owner verification.

Superseded checkout server actions redirect to the catalogue. Legacy subscriptions keep their price IDs, webhook reconciliation, renewals, grants and Customer Portal access. Free verified venue management remains independent from billing.

## Workspace features and migration

Two pending migrations, mirrored byte-for-byte in `database/migrations` and `supabase/migrations`, implement the additive subscription ledger and Premium workspace features. Neither is applied to production at this checkpoint.

- Service-only subscription sync, immutable payer/customer/workspace, event chronology, terminal-state protection and payer-only invoice RLS.
- Durable checkout reservations, server and Stripe overlap checks, same-workspace paid, active, non-ending Pro add-on eligibility and owner checks. Delinquent/paused/incomplete subscriptions block replacement Checkout.
- Same-scope subscription changes use Stripe's hosted update confirmation and replace an existing item; unsupported personal/workspace scope changes or multi-subscription consolidation are refused. A dedicated allowlisted Customer Portal configuration and sandbox acceptance are required.
- Free media allowance: 15 images and 150 MiB shared across a linked workspace. Premium: 250 images and 1 GiB; 10 MiB per file. Storage metadata is authoritative. Restrictive Storage INSERT/UPDATE policies also count stored objects, including unregistered uploads, and reserve the existing 10 MiB object cap against the byte allowance. Storage DELETE and placement locks protect cross-venue references. Public reads retain selected artwork and the existing own-venue fallback while keeping the remaining bin private. All these guards remain inactive until the private launch flag is enabled. Updates cannot forge storage accounting or move assets between tenants. Larger pre-existing libraries are preserved.
- Shared media/templates require explicit workspace membership in addition to venue permissions. Shared searchable media, folders and existing surface selection; borrowed assets cannot be deleted through another venue. Existing published placements are retained after downgrade. No automatic media or content deletion occurs; over-quota customers can remove their own files and continue editing published content.
- Recurrence uses civil time plus validated IANA timezone, bounded daily/weekly schedules, DST gap rejection, exceptions, persistent cancelled individual dates, timezone updates, advisory locks and unique occurrence constraints. Existing individual events remain free.
- Duplication and template snapshots produce drafts in authorised workspace venues. Scheduled publication requires previously approved content or drafts from already-verified venues; changes invalidate its approval fingerprint. A bounded service cron runs every five minutes. Approval fingerprints use SHA-256. Cancelling publication keeps a draft and does not publish it. Drafts from unverified venues require normal moderation.
- Growth reports compare actual AkiPasa interactions by action and event, current/prior periods and listing-readiness checks. No Google ranking promises or invented data.
- AkiDuermo Premium includes accommodation night/request comparisons, exportable reports, and expanded shared property media/folders. Quotes are not treated as collected revenue. Existing room-night inventory and booking transactions stay authoritative.
- HQ Standard core operations and Pro modules use workspace entitlements plus existing role-template permissions. Platform AI/admin tools remain excluded. Legacy paid/manual/staff tool access remains valid.
- Authenticated users can prepare a named workspace for HQ without a venue; venue permissions still require authorised ownership/membership. Staff grants and trialing Pro access never qualify for the discounted purchase. Conditional add-on access stops when its paid Pro subscription is unavailable. A gated service reconciliation stops add-on future renewal when Pro is ending/unavailable; it does not refund, delete content or create charges. Stripe renewal-boundary races still require sandbox acceptance before activation.

## Payment blockers observed

Read-only revalidation on October 13 confirms that the connected live account has no Stripe Tax registrations. All fourteen approved prices now use `inclusive` tax behaviour. AkiPasa Premium's product uses `txcd_10103000`; the six other products use `txcd_10103001`. The account display name is AkiPasa Marketing S.L. These technical settings do not establish legal invoicing identity, classification suitability, VAT registration or merchant readiness. Do not change the shared account's legal identity or register taxes without confirming the authorised business configuration. The audit records observed configuration, not legal approval.

Required confirmation: legal invoice name, registered address, VAT/tax ID and registration jurisdiction, customer-facing descriptor/support details, appropriate product tax classification and whether approved prices include VAT. Consumer and business supply-location/reverse-charge/OSS treatment must match that configuration. Reference: [AEAT electronic services and place-of-supply rules](https://sede.agenciatributaria.gob.es/Sede/no-residentes/iva-empresarios-profesionales-no-establecidos/iva-telecomunicaciones-servicios-electronicos.html?faqId=4717cab0aff90710VgnVCM100000dc381e0aRCRD), [AEAT OSS regimes](https://sede.agenciatributaria.gob.es/Sede/iva/iva-comercio-electronico/cuestiones-generales.html?faqId=943b790496d78710VgnVCM100000dc381e0aRCRD), and [European Commission persons liable for VAT](https://taxation-customs.ec.europa.eu/taxation/vat/vat-directive/persons-liable-vat_en). These rules require the actual establishment/customer/registration facts; they do not establish this merchant's tax position. Existence of products is not payment readiness.

The CLI could not provision an isolated Stripe sandbox without authentication; no sandbox account, keys or test checkout was created. Do not test with live charges. Test prices must be isolated from the verified live ID allowlist.

## Activation sequence

1. Complete disposable full-schema PostgreSQL migration compatibility and Supabase permission/advisor tests, including legacy subscription and staff-grant fixtures. PGlite executes both actual migrations with a bounded production-shaped schema, not a full production clone. Live preflight found zero legacy recurrence rules. The connected migration role is a non-superuser `postgres`, while `storage.objects` belongs to `supabase_storage_admin` and the role is not a member of that owner; validate hosted Storage policy-management permissions in the disposable environment before production DDL.
2. Validate sandbox checkout, signatures, retries, failures, renewal boundaries, cancellation, plan switches, add-on lifecycle and hosted proration confirmation. Configure the dedicated update portal with only approved products and supported updates, plus a management portal permitting cancellation/payment updates without general plan switching.
3. Confirm legal/tax configuration and verify merchant, active registration, product tax codes and price tax behaviour. Revalidate the existing inclusive prices and configured product tax codes against the approved legal treatment; the previously required one-time update of unspecified tax behaviour is no longer outstanding. Never change legacy subscription prices or create duplicate products.
4. Apply tested additive migrations through the authorised integration. Keep private `akisuite_private.launch_settings.enabled=false` initially. Check advisors and role permissions after application.
5. Configure runtime flags: `AKISUITE_SUBSCRIPTIONS_READY`, `AKISUITE_FEATURES_READY`, `AKISUITE_BILLING_VERIFIED`, `AKISUITE_TAX_READY`, `AKISUITE_CHECKOUT_ENABLED`. Enable checkout last after both database and application readiness. Configure `AKISUITE_TAX_REGISTRATION_ID`, `AKISUITE_TAX_BEHAVIOR`, per-plan `AKISUITE_TAX_CODE_<PLAN>` and `STRIPE_AKISUITE_PORTAL_CONFIGURATION_ID` and `STRIPE_AKISUITE_MANAGEMENT_CONFIGURATION_ID` from verified configuration. Never infer tax IDs or tax codes.
6. Verify the exact production commit/deployment and `/api/bookings/release` catalogue marker, CityDiscovery, every alias/portal, EN/ES light/dark, desktop/tablet/mobile, authenticated account access, existing subscriptions and real permitted test transactions. A merge alone is not deployment evidence.

## Validation checkpoint

- Focused AkiSuite suite: 84 tests passed (catalogue, routes, component rendering, checkout guards, price validation, signed-webhook source contracts, replacement rules, mocked conditional renewal, disposable SQL/RLS and features).
- AkiHQ full check: 340 passed, one existing environment-gated skip. Companion PR #26 merged at `21843db608932eea46d1e83d82b8481ee19b5767`; production serves bundle v36/cache v110 with the origin-aware membership link. Authenticated navigation remains separate.
- The preceding full AkiPasa check and Cloudflare package passed. Current changes are being revalidated; exact outcomes are recorded in the release PR.
- Local Chrome browser acceptance is blocked by OS `socket()` denial at ProcessSingleton startup. The preceding CI head passed account/public, booking and Pals acceptance; its tablet workflow and the final compatibility head still require completion. Earlier CI account clipping was a genuine visually-hidden legend assertion; the legend is now visible. Earlier pricing failures expected removed legacy tabs/widgets and have been rewritten for the approved catalogue. `action_required` CI runs are not passes.
- Historical pre-#125 baseline showed legacy tabs/prices and Business/Duermo plural alias 404s. PR #125 subsequently recorded a merged catalogue release and public alias smoke checks; PRs #128–130 are merged presentation follow-ups. Those recorded public checks do not establish authenticated acceptance or payment readiness.
- Authenticated production access and Stripe sandbox checkout remain unverified. Catalogue responsive acceptance passed in remote CI; final-head CI and production smoke checks remain required. No production migration or new payment is claimed. Deployment and public smoke evidence recorded by the release PR must be distinguished from authenticated portal and billing acceptance.

Rollback: disable checkout first, then private launch and feature flags. Revert presentation code if needed; retain ledger/media/occurrences and all Stripe prices. Once any new subscription exists, preserve its webhook adapter and billing reconciliation jobs through rollback. Never roll back by deleting customer data or replaying invoices/webhooks.

## Backlog recovery validation (2026-10-13)

The checked-in audit was parsed and compared with fresh read-only live Stripe responses: all fourteen price IDs, amounts, currencies, recurring intervals and inclusive tax behaviours match, as do all seven product tax codes (zero mismatches). The linked Supabase project `vhpbvcfkcteswlsdjrfl` returned false for both `to_regclass('public.akisuite_billing_subscriptions') is not null` and `to_regclass('akisuite_private.launch_settings') is not null`. This confirms the canonical new ledger and launch settings are absent, rather than inferring migration status from a historical handoff. No production mutation was performed. Required CI and real payment/portal acceptance remain distinct pending gates; approval-required CI runs are not successful checks.
