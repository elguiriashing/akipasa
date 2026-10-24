# AkiSuite master mission recovery checkpoint

Verified on 22 October 2026. This documents findings, not release approval.

## Original mission boundaries

- AkiHQ is the free management hub.
- AkiBusiness is the paid operating suite.
- AkiPasa, AkiDuermo and AkiCoches remain independent discovery apps.
- Preserve existing users, subscriptions, prices, RLS, data and identity.
- Never invent commission terms, run payouts or order physical trophies.
- Do not deploy source or database features before required acceptance.

## Verified repositories

- AkiPasa (`master`): PR #271 open for private AkiPulse history export;
  PR #8 is a draft legal package pending approval.
- AkiHQ (`main`): PR #61 open for gated premium templates and media.
- AkiDuermo (`main`): no open PRs; membership PR #35 merged.
- AkiCoches (`main`): no open PRs; membership PR #39 merged.
- AkiBusiness (`main`): no open PRs; plan naming PR #39 merged.

## Shared Supabase inspection

Project `vhpbvcfkcteswlsdjrfl` was healthy. Public functions were
present for toolbox saves, rotation, staff delegation, referral attribution,
billing reconciliation, prestige and basic AkiPulse reporting.

The following signatures were absent during inspection:

- `public.akipulse_scopes_v2(text,integer,integer)`
- `public.my_pulse_management_export_page(text,integer,text)`

Check the actual function signature in AkiHQ PR #77 before making changes.
Database presence is not proof of runtime authorization or correct billing.

The newest observed migration was `20261021142454`.
Reconcile already installed listing and native SQL before deploying the eight
explicit Pulse phases and the separate own-history export migration.

## Outstanding release gates

1. Read repository contracts and inspect actual merged history.
2. Reconcile migrations and test PostgreSQL permissions and concurrency.
3. Resolve conflicts on PR #271 and PR #61 against the latest branches.
4. Keep legal PR #8 gated until counsel and cookie inventory sign-off.
5. Verify production routes, Worker source SHA and authentication.
6. Test toolbox 4/8/12, monthly swaps, staff revocation and location scope.
7. Test image quotas 8/250 and free event limits 4/month and 5 days.
8. Test verified Stripe referral facts, fraud safeguards and locked payouts.
9. Test AkiPulse permission/consent, Passport prestige and account onboarding.
10. Test EN/ES navigation and desktop/tablet/mobile layouts.
11. Verify exact-commit CI, rollback plans and live paid/free flows.

Observed Cloudflare scripts include `akipasa`, `akiduermo`, `akicoches`,
`akihq-management-preview` and `akibusiness-preview`.
Worker existence does not prove canonical production routing.

## Completion status

Parts of the toolbox, referrals, prestige, Pulse, library and membership
systems are implemented and some work is merged. Full original-mission
production acceptance is not established. PR #271 and #61 are blocked on
reconciliation and dependency checks. PR #8 remains a legal draft.

For each finished deliverable, record exact tested SHA, workflow results,
migration verification, merged SHA, deployed SHA, user-flow smoke test and
rollback plan. Continue independent safe work while blockers are resolved.
