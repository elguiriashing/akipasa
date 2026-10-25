# Human-reviewed shared-account deletion

Candidate implementation; not evidence of deployment or a completed customer request.
Source baseline: master642641822541381a09eb81da9d1abddf3f837d6f.

Read-only production preflight: root verified the public unauthenticated
`https://akipasa.supabase.co/auth/v1/health` response header
`sb-project-ref=vhpbvcfkcteswlsdjrfl` (HTTP401, no key supplied). This confirms
the configured vanity host maps to the intended shared project; it is not
authorization to delete any real account or inspect customer records.

## Operating contract

Public EN/ES instructions at `/{locale}/account-deletion` cover AkiPasa,
AkiBusiness, AkiHQ, AkiDuermo and AkiCoches. The existing authenticated
`/{locale}/account/privacy` request remains available. A person verifies the
request, manually deletes the identity and erasable data within48hours after
verification, then writes/sends a personal support confirmation. Exceptional
legal/provider/ownership blockers require a timely explanation to the requester;
they are not silently treated as completion. Nothing in this change sends mail.

The first identity-verified admin review records verified_at and an immutable
due_at48hours later; repeat reviews cannot reset the clock. Admin privacy shows
the due instant and an explicit overdue warning. This is an operator dashboard
alert, not automatic email/Telegram delivery or a guarantee that an operator acts.

## Required manual sequence

1. Verify requester identity using the existing account/support process; never ask
   for a password. Locate the exact request and profile UUID in Admin Privacy.
2. Review current sessions/revocation and remaining JWT lifetime. Auth-user deletion
   alone does not immediately invalidate every already-issued access token. Keep
   existing missing-profile account guards; do not claim universal token revocation.
3. Inspect personal Storage objects through supported Storage APIs and erase only
   subject-owned erasable files. Resolve shared published media separately; never
   delete whole business buckets, tenant records, other users' data or entire venues.
4. Review Stripe billing/subscriptions, ongoing bookings, external processor records,
   business ownership/continuity and provider restrictions. Identity deletion does
   not cancel a Stripe subscription, refund money or erase provider copies. Record
   references/results rather than copying sensitive documents into review evidence.
5. Record retained field/category, legal basis, restricted access, review/expiry date
   and exceptions. If unknown, retain the blocking legal-hold setting and investigate.
6. Save every review prerequisite with no blocking hold. The same administrator
   must explicitly type the exact subject UUID and execute within24hours of review.
   Self-deletion is refused. A10minute lease blocks concurrent/repeated execution.
7. The server calls Supabase Admin deleteUser only after those database checks.
   Actual FK/Storage/provider failures stop the flow and invalidate review checks;
   investigate then review again. No cron invokes this operation. No automatic retry.
8. After erasure succeeds, personally write/send the support confirmation, explaining
   retained categories and unresolved exceptions accurately. Record its private
   timestamp/reference in the separate confirmation form to close the request.

If Auth deletion succeeds but finalisation fails, do not guess completion or repeat
deletion. An administrator must reconcile the exact request/lease and absent profile
using `finish_account_deletion` before recording the manual confirmation. Do not
edit rows to bypass checks. A stale executing request remains visibly Processing.
Preserve the lease reference privately for recovery; no secrets belong in evidence.

Review source is human evidence, not machine verification of external erasure.
The service client is server-only. Both server actions and SQL require an actual
administrator profile. No browser receives service keys or provider responses.
Private reviews/events have RLS and no browser/service direct table grants.
The existing status-only RPC cannot mark Completed without reviewed execution
and a separately recorded manual confirmation.

## Retention implementation and limits

- New deletion-workflow operational events:90days, except a recorded legal hold.
- Completed managed deletion/support-review evidence, request UUID and subject UUID:
  12calendar months from manually recorded closure, then removed together. No
  historical request is backfilled into purge eligibility. Unresolved requests and
  legal holds remain for resolution/review; do not abandon them indefinitely.
- Existing external support mailboxes, third-party logs, backups and other audit
  systems are not purged by this new workflow. Operators must configure/document
  their own90day operational-log/12month support targets before claiming coverage.
- Applicable Spanish commercial/accounting supporting records: restricted6year
  schedule from the applicable last entry, subject to longer specific statutory
  obligations/holds. This is not a blanket authority to keep every personal field
  for6years, and this patch does not delete statutory records. Record exact scope,
  access restrictions and expiry with accounting/legal review.
- Backup30day target is UNCONFIRMED and must not be published as achieved. Verify
  provider schedules, restore/re-erasure procedures and contracts separately.

`purge_account_deletion_evidence()` processes at most1000log rows and1000closed
workflow requests per call. It never deletes accounts, customer/business data,
legacy support mail or statutory records. SQL retention_enabled defaults false;
Worker ACCOUNT_DELETION_RETENTION_READY must also explicitly equal true. Until
both are intentionally enabled, cron makes no purge. Migration does no backfill,
historical purge, customer deletion, email send or provider mutation.

Before enabling: verify exact Supabase project (including vanity-host mapping),
migration/ACL/trigger bodies, scheduler and disabled settings; record approved
policy and synthetic preview; then coordinate activation. The release owner owns
any live migration/configuration step. No external backups are changed here.
`hold_account_deletion(request,boolean)` is administrator-only and preserves
evidence from purge. It refuses changes during an execution lease; complete the
in-progress reconciliation first. Unknown legal status must remain blocked.

## Deployment / rollback

Local isolated actual-SQL regression6/6 passes, covering private ACL denial for
anon/authenticated/service roles, non-admin/self/wrong-target/wrong-lease denial,
fresh complete review, holds, replay, provider-failure reset, fixed deadline,
post-identity manual confirmation and13-month identifying-evidence cleanup with
business/profile survival. Execution/maintenance unit tests5/5 pass; migration
permission audit reports0findings. Hosted exact-head/full checks remain required.

Apply the mirrored additive migration before deploying the page/actions; the new
columns/RPCs are required and missing schema must fail closed. The existing public
auth routes, OAuth callbacks, permissions, billing flags and account-request
submission are unchanged. Test EN/ES anonymous instructions, authenticated request,
administrator/non-admin access, empty/read-error states and a disposable account
through supported staging providers before claiming positive erasure acceptance.

Rollback disables retention, reverts application actions/UI, and preserves private
evidence plus completion guards. Do not drop evidence or undo real deletions.
Never restore a status-only completion bypass just to make older UI appear to work.
