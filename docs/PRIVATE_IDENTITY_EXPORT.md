# Referral and prestige own-identity export

Status: implemented and tested source, not deployed or applied by this task.
No account enrollment, financial programme, address intake, fulfilment, payout,
retention period or production configuration is activated.

## Concrete audit findings

The existing account export already validates authentication directly and preserves
privacy access for pending/underage accounts. Prestige's existing export action is
also correctly before its product/account lock, and shipping/physical requests
already cascade with their owning award/profile. These paths are reused.

Missing coverage required an additive change: referral select-star exports exposed
reviewer/approver identifiers and snapshots, suspended representatives lost authored
lead records through normal operational RLS, and own financial audit/review evidence
was absent. Prestige export built unbounded JSON, omitted its own audit projection,
and excluded expired shipping addresses that were still actually retained pending
purge. This patch replaces those optional exports after schema readiness. It does
not duplicate product dashboards, change legal retention or delete financial history.

## Caller-only bounded projection

Migration `20261021001138_own_referral_prestige_export.sql` requires the existing
referral foundation170421/review180654 and prestige170436 tables. A single stable
SECURITY DEFINER page RPC accepts only an allowlisted section, cursor and page size.
Identity comes only from `auth.uid()`. There is no supplied account ID, global admin
branch, service credential, active representative requirement or product/cohort gate.
Anonymous and service execution are revoked. No raw-table privileges are added.

Twelve explicit sections cover owned codes, own attribution/representative state,
authored lead/case metadata, payer/referrer-specific invoice facts, safe referral
audit/review history, own awards, all retained own shipping, own physical requests
and safe prestige audit history. Explicit field allowlists avoid future columns
silently leaking into exports. A payer sees only their own customer/subscription/
invoice references and paid amount, not the other referrer's proposed commission.
A referrer sees their proposed commission and an opaque invoice reference, not
another customer's identity/provider IDs/paid amount. Audit/review exports omit
other actors, raw snapshots, document references and free-form internal notes.
Third-party lead names/contact/notes and case free text are excluded; an export
projection descriptor discloses that this is personal-data access, not a third-party
CRM or raw audit backup. A broader rights request involving mixed third-party/free-
text records needs appropriately scoped professional review, not an unfiltered dump.

Shipping is returned only through an owned award and includes a retained address
even after its purge deadline. Export does not extend/delete/reset retention. Direct
shipping table access remains denied. Nothing is sent to analytics or fulfilment.

Server pages are at most500 rows, with exact subject counts and deterministic C
collation keysets; numeric audit IDs are padded for correct numeric ordering. JSON
is built only for the bounded page, not the entire history. Subject indexes support
billing/audit/review lookups. The server has no caller-selectable source SQL.
The reader accepts at most10,000 rows per section and100 RPC reads across all
sections. It checks count stability, unique increasing keys, matching final cursor
and complete row totals. Backend/transport/schema/limit failures make the entire
HTTP export503 with private/no-store and no partial data. There is no silent
truncation or invented empty success. These limits require a separately reviewed
assisted export for larger records; the reader does not promise an unlimited archive
or a single cross-request database snapshot.

## Identity deletion without financial history destruction

The review ledger's NOT NULL reviewer FK previously blocked deletion of any profile
that had authored a review. The narrow forward migration drops that FK only. The
immutable actor UUID, review/audit rows, snapshots and financial facts remain intact,
matching the existing referral audit's unconstrained historical actor UUID model.
Application review writes still derive the actor from the authenticated administrator
and have no browser/service raw write grants. Historical actor UUIDs are
**pseudonymous, not anonymous**. This patch does not decide lawful financial/audit
retention, anonymisation or retention periods; those policies require review.
Deleting an actual reviewer profile is tested to retain the original review UUID,
and deleting a member retains existing award/address/request cascade behavior.

The existing account-deletion request workflow remains the reviewed operator path.
No production user, financial row or account is deleted by this work. Do not restore
the blocking FK after retained actor profiles no longer exist, or delete financial
records to make the constraint fit.

## Integration and rollout

The route preserves the independent trusted-funnel privacy hook from243 and the
actuala974 central notification recovery while merging its dependency. A one-line
inherited malformed-argument test spread was made explicit for TypeScript; production
funnel behavior is unchanged. Onboarding receipts, baseline export,401/503/no-store
and attachment behavior remain intact.

New `AKISUITE_PRIVATE_IDENTITY_EXPORTS_READY` defaults off until the new RPC is applied
and accepted. It is independent of referral acquisition, prestige gameplay, physical
intake and onboarding cohort gates. When enabled, old raw referral readers and the
unbounded prestige aggregate are skipped; the twelve new sections are included even
with acquisition/gameplay disabled. Existing legacy readers remain compatible before
schema readiness. Enable this privacy readiness before introducing corresponding
live optional data. Keep it enabled while retained rows exist; rollback must retain
compatible privacy readers, not hide history by disabling an acquisition flag.

Validate exact-head CI and the correct project; apply the new migration once with
one canonical mirror. It changes only the new read RPC, lookup indexes and blocking
FK, never rows or prior migration history. Actual hosted own/foreign role and retained
shipping reads remain separate acceptance; no large live QA rollback is required or
performed by this task. Financial and physical operations remain disabled.

## Executed evidence

22 new cases pass:7 full-foundation PostgreSQL/PGlite role tests,11 reader/budget/
malformed-page cases and4 authenticated HTTP401/503/no-store/pending/underage cases.
They exercise1,202 database rows and1,201 reader rows beyond REST's common page cap,
foreign/suspended/admin isolation, own payer versus referrer redaction, retained
expired shipping, reviewer deletion with immutable history and member shipping
cascade. The account-lock helper is false in database fixtures, proving this read
is an explicit privacy exception. Existing regression coverage passes37 combined
private/funnel cases,6 legacy prestige-export cases and10 account-export/permission
cases; these counts overlap and are not summed as independent suites.
TypeScript/scoped ESLint, mirrored SQL audit and contract integrity pass. Final
hosted full checks/build and integrated release/provider acceptance remain required.
