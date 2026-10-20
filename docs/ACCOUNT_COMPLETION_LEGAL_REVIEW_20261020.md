# Account completion and age declaration — engineering review

Reviewed 20 October 2026. Implementation candidate; no legal approval or
production activation is represented. Read with `docs/LEGAL_REVIEW.md` and the
unapproved legal-suite PR. Existing public terms version remains unchanged.

## Verified requirements and limits

- The [current BOE consolidated LOPDGDD, Article 7](https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673#a7)
  retains the fourteen-year threshold for a minor's own data-processing consent;
  below that threshold consent-based processing requires a parent/guardian.
  This is distinct from AkiPasa's proposed adult-only account policy and does
  not make every processing purpose consent-based. A proposed sixteen-year
  rule must not be treated as enacted solely because a news article reports it.
- [GDPR Articles 5, 6, 7, 8, 12 and 25](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
  require purpose-specific lawful bases, minimisation, suitable notices and
  safeguards. An 18+ declaration is not verified age, legal compliance, or
  consent to unrelated analytics/advertising.
- The [AEPD age-assurance principles](https://www.aepd.es/guias/decalogo-principios-verificacion-edad-proteccion-menores.pdf)
  favour anonymous proof of authorised access for inappropriate content and
  warn against identifying, tracking or profiling minors. This candidate
  collects no identity document, exact birthdate or age range. The private
  negative declaration is minimal eligibility state, never a public profile
  distinction or an analytics attribute. Its legal basis and retention require
  review; it must not become a tracking identifier.
- The [EDPB Statement 1/2025](https://www.edpb.europa.eu/documents/statement/statement-12025-on-age-assurance_en)
  requires a proportionate, privacy-preserving approach. For genuinely
  restricted content, evaluate an unlinkable over-threshold credential with
  a DPIA and accessibility/appeal process; do not substitute document uploads.
- [DSA Article 28](https://eur-lex.europa.eu/eli/reg/2022/2065/oj)
  addresses accessible-to-minors platforms and prohibits profiling-based ads
  when a platform knows with reasonable certainty a recipient is a minor.
  [Commission guidelines](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52025XC05519)
  explain why an adult-only policy alone does not establish effective exclusion.
  Applicable platform classification, Article 19 exemptions and specific
  high-risk listing/content controls need a qualified assessment.
- The [AEPD cookie guide](https://www.aepd.es/guias/guia-cookies.pdf)
  informs prior consent and withdrawal for nonessential tracking. Acceptance
  of terms remains separate from optional privacy choices. Existing cookie
  settings are not silently changed by account completion.
- [Google consent settings](https://support.google.com/analytics/answer/14275483?hl=en),
  [Google Signals](https://support.google.com/analytics/answer/9445345?hl=en), and
  [Google advertising privacy protections](https://safety.google/safety/ads-data/)
  must be assessed separately: Google disables personalised ads for known
  under-18s; consent signals must precede relevant configuration. Existing GA4
  Google Signals/ad-personalisation flags remain off. Restricted-account
  Google tags and server behaviour/conversion ingestion are suppressed even
  if browser consent cookies were previously granted. No identity/age evidence
  is transmitted to Google.

## Implemented candidate safeguards

Shared identity is retained. Private SQL cohort enrolment is based on trusted
profile creation and operator configuration, not editable user metadata. Existing
accounts are not backfilled or classified as adults. Mandatory steps are username,
adult declaration and approved-version terms; avatar and bio are optional. SQL
serialises completion and persists a negative declaration across retries/sessions.
The protected server guard and listed legacy account-activity database mutations
require completion. Privacy choices, export, deletion request, legal notices,
password recovery and sign-out remain available through separate safety routes.

This does not prevent someone creating another account or lying about age, and
does not restrict anonymous discovery of inappropriate content. No claim of
verified age or comprehensive account/DSA compliance is made.

## Activation gates and outstanding professional decisions

Keep `account_private.onboarding_rollout.starts_at` and its approved terms null.
Keep `AKISUITE_ONBOARDING_SCHEMA_READY` unset until migration, five-app compatibility
and authenticated acceptance pass. Activating the schema-read flag alone enrols
nobody; rollout must be enabled only after every product can consume the shared
eligibility contract and provide a working completion/safety destination.

Counsel must approve adult-only terms/age policy, the account and negative-state
lawful basis and retention/deletion process, underage support/appeal handling,
DSA classification, public restricted-content moderation, cookie inventory and
processor transfers. Define support ownership and a tested privacy-preserving
manual correction process before activation. Staff/admin exemptions must be
explicitly assessed; current existing staff remain exempt without a backfill.

A full cross-product audit must extend `account_features_allowed()` to every
remaining privileged feature/legacy RPC and audit direct API reads; the candidate
migration lists covered mutation tables rather than claiming universal coverage.
Do not turn on enrolment until that coverage and all independent app guards are
accepted. No monetary incentive, paid service or live legal acceptance change is
part of this candidate.

Existing optional birth-year data also suppresses tracking where the year alone
unambiguously indicates under 18. It does not change legacy account/paid access
or transmit that year to analytics. A self-edited demographic remains unreliable
for age verification; the terminal negative-declaration state is independent.
