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

## Own-identity privacy export amendment

Migration 20261021000745 adds my_business_funnel_export(text,text,integer), a
caller-only projection with no profile-id argument and no onboarding, age, paid
entitlement or collection gate. It works for pending/restricted identities and
cannot expose another account's observations. Anonymous callers cannot execute it;
removed identities have no retained optional rows after the existing cascade.
The raw private table remains inaccessible to authenticated clients.

The account export includes stage, analytics reference, workspace/venue scope,
observation timestamp and the captured consent timestamp. Internal proof_key values
(raw provider invoice/session/event integrity references) are deliberately omitted:
they add no user-facing activity meaning and must not be confused with a claim of
payment proof in exported analytics. Billing records remain available through the
existing billing export/portal; no financial ledger is changed or purged here.

Pages have at most 500 rows in the application (RPC maximum1000). Decimal-string
cursors avoid JavaScript bigint precision loss. The first page pins an upper
watermark; later inserts are excluded. Every page repeats the fixed total and upper
watermark. Changed counts, cursor regression, transport/parser errors or an exhausted
80-request budget reject the entire export with the existing503/no-store failure
contract; no partial file is presented as complete. All successful pages are combined.
The RPC permits explicit safe continuation through p_after and p_until; it accepts
only bounded decimal identifiers. It never accepts another identity or workspace.

The existing AKISUITE_FUNNEL_READY schema/maintenance readiness flag also includes
this privacy schema. Apply both additive migrations before enabling that flag, and
keep readiness on while optional rows remain, even if database collection is off.
The identity-only RPC remains callable directly regardless of that runtime flag.
This amendment activates no collection and changes no production configuration.

Privacy amendment verification: six focused tests plus all nine capture/retention
regressions pass. The actual PostgreSQL fixture exports1201 own rows over three
pages, excludes foreign rows/later inserts/raw proof identifiers, permits pending/
known-minor privacy access, denies anonymous/raw-table access and malformed cursors,
and verifies identity-deletion cascade with rollback. Malformed/partial responses,
changed totals, repeated cursors and budget exhaustion fail without partial data.
Typecheck, scoped lint, migration permission audit and contract integrity pass.
