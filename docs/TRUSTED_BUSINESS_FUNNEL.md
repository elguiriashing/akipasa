# Trusted tenant commercial stages

Status: implemented behind disabled database collection; not production activated.
Source baseline: AkiPasa master 8390836. Migration 20261020234414 is additive and
mirrored in database/migrations and supabase/migrations. Shared identity/onboarding,
referral foundation and verified operations billing migrations must already exist.

## Evidence and scope

The existing analytics_events infrastructure stores the reserved suite_business_stage
action. Its private proof ledger deduplicates (stage, proof_key); generic analytics
RPC calls cannot manufacture this action. Private proof/customer/provider identifiers
are never returned in the bounded manager aggregate or public event metadata.

| Stage                  | Trusted evidence                                                                                 | Meaning                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| claim_completed        | moderator/admin decided approval plus persisted owner membership, same transaction               | Approved listing claim, venue scoped                      |
| hq_activated           | authenticated owner creates active/trial workspace plus owner membership                         | Management workspace creation, not first HQ visit         |
| checkout_started       | service-recorded Stripe checkout session on owned workspace                                      | Provider checkout created, not a button click/reservation |
| payment_verified       | durable subscription binding, current toolbox revision, unique same-transaction invoice evidence | Verified paid invoice, not unique customer                |
| subscription_upgraded  | same paid evidence and tier increase                                                             | Paid package improvement                                  |
| subscription_cancelled | authoritative effective canceled transition                                                      | Actual cancellation, not future cancellation request      |

Deferred triggers see the complete trusted transaction. Missing/ambiguous billing
proof is skipped. Retries and duplicate invoices cannot count twice. Failed payments
cannot create payment/upgrade stages. Optional measurement exceptions roll back only
the measurement subtransaction; capture_failures and SQLSTATE-only last_error expose
operational health without aborting a verified payment or claim.

There is no historical backfill, client completion API, invented conversion rate,
sitewide Google attribution or inferred contact-email join. Legacy profile-only
billing, listing subscriptions without workspace bindings, first HQ site activation,
private accommodation/fleet scope and organisation-wide deduplicated acquisition
remain unavailable until legitimate adapters exist. Claims require explicit source
venue linkage before appearing in a workspace report. Stage counts represent
consented observations of different facts, not a connected unique-customer funnel.

## Consent, age and privacy

Capture requires the existing website personalisation_settings analytics_enabled AND
marketing_enabled choices, recorded no later than capture, plus a real profile and
no incomplete/restricted onboarding record. Existing birth_year values indicating a
minor suppress collection; unknown age is not represented as verified age. CRM email
campaign consent is a different purpose and is not reused as website consent.

Consent/age/onboarding writes and capture share a subject transaction advisory lock.
Withdrawal, consent deletion, a new restricted onboarding status or known-minor age
removes only this new optional proof and its reserved linked analytics event. Profile
deletion cascades the same optional data; business and financial records remain.
Unrelated historical analytics_events are untouched. No optional cookies or Google
destinations are introduced. Business/claim/billing transactions remain authoritative
independently of optional measurement.

## Activation and retention gates

Collection settings default enabled=false, retention_days=NULL and
retention_approval_ref=NULL. A reviewed retention decision and its reference are
mandatory before enabling capture; 90 days in fixtures is TEST ONLY, not a production
legal policy. The configurable 1..3650-day schema validation is an engineering bound,
not retention approval. The manager query range is bounded to 1..90 days and the
approved retention interval. Operators must review actual purpose/legal text and
existing consent sufficiency before activation; engineering supplies no legal signoff.

AkiPasa scheduled maintenance is independently gated by AKISUITE_FUNNEL_READY=true
and performs at most 500 deletions of new linked optional rows per cron execution.
It returns zero without an approved retention configuration. Keep maintenance ready
after capture is disabled while rows require retention cleanup. Monitor failures and
remaining eligible rows; missed runs retry, without assuming an exact cron second.
No production flag/value or retention decision is set by this change.

Order: install shared schema prerequisites, apply this migration, deploy scheduler and
HQ projection/UI, validate private test fixtures/permissions, approve purpose and
retention, then deliberately enable collection. Rollback: disable collection first;
retain maintenance for approved cleanup, revert consumers/scheduler only after
handling existing optional rows. Do not drop historic analytics or financial data.

## Verification

Nine focused PGlite/adapter tests cover gate prerequisites, forged approval/action,
deferred real approval/owner provisioning, checkout provider session, paid/failed/
upgrade/cancel lifecycle, retries, manager/tenant isolation, consent withdrawal,
known minors, onboarding restrictions, profile deletion with rollback, approved
bounded retention and preservation of unrelated historical analytics. Typecheck,
scoped lint and SQL permission audit are required. Multi-connection live concurrency,
provider sandbox event replay, actual consent journey and production activation remain
release acceptance gates; local fixtures do not prove them.
