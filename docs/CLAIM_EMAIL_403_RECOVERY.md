# Claim email delivery: production 403 recovery (11 October 2026)

## Verified incident

- A staff action successfully updates `venue_claims` and enqueues an immutable `claim_decision_emails` row.
- Five claim-decision outbox rows (including the 11 October 10:50 UTC rejection) have `status='blocked'`, `last_error='provider_403'`, and `attempts=1`. No provider acceptance IDs were recorded.
- Three staff submission alerts and one suite email also reached `provider_403`; two older receipt jobs have `claim_not_pending`, meaning the claims were decided before the receipts could be sent.
- The connected Resend account reports `akipasa.com` verified and sending-enabled, and direct sample template sends delivered. That **does not** authenticate the live Cloudflare worker: its provider requests return 403.
- The linked Google Workspace inbox has no sent customer messages for these attempts. Current application notifications send via the Resend HTTP API; Gmail access in ChatGPT does not authorize the Cloudflare runtime to send through Google Workspace.

## Repair the sending permission, not the claim status

1. In the Resend team that owns the verified `akipasa.com` domain, use a domain-scoped sending-enabled API key. Do not mistake the key **name** for its one-time secret value.
2. In Cloudflare Workers & Pages > `akipasa` > Settings > Variables and Secrets, inspect the **production** encrypted `CLAIM_RESEND_API_KEY` binding. If invalid or not associated with the correct Resend team/domain, **replace its secret value** with the valid key, not a public variable, and ensure a new deployment retains secrets (`--keep-vars`). The runtime prefers `CLAIM_RESEND_API_KEY` to `RESEND_API_KEY` for claim decisions, staff alerts and suite mail.
3. The worker also requires correct `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, but the recorded provider 403 proves the worker already reached the provider in the documented incident.
4. Check Worker logs for the outbound HTTP 403, then perform **one owned test** through the live claim decision flow. Confirm a new outbox row reaches `sent` with `provider_message_id`, and separately confirm Resend reports delivery. Do not mistake the public configuration-boolean endpoint or direct Resend samples for live application delivery.

## Read-only status query

```sql
select 'claim_decisions' as queue, status, coalesce(last_error,'none') as error, count(*)
from public.claim_decision_emails group by status,last_error
union all
select 'staff_claim_alerts', status, coalesce(last_error,'none'), count(*)
from public.claim_submission_alerts group by status,last_error
union all
select 'suite_emails', status, coalesce(last_error,'none'), count(*)
from public.suite_email_outbox group by status,last_error;
```

## Controlled recovery (operator approval required)

403 is a provider authorization rejection, a *non-ambiguous* failed send. The outbox intentionally marks it `blocked` rather than retrying indefinitely. **Fix the credential and independently verify a new live test first.** The prior rows do not automatically requeue on key rotation.

Choose and verify a specific intended **customer** claim and recipient privately. After approval, reset only that row, and only if it has never been provider-accepted:

```sql
begin;
update public.claim_decision_emails
   set status='pending', attempts=0, available_at=now(),
       first_attempt_at=null, attempted_at=null, lease_id=null,
       last_error=null
 where claim_id = '<approved-claim-uuid>'::uuid
   and status='blocked'
   and last_error='provider_403'
   and sent_at is null
   and provider_message_id is null
   and delivery_uncertain=false
returning claim_id,status;
commit;
```

The existing scheduled dispatcher will send the exact saved language/decision with its stable idempotency key. Verify provider acceptance, delivery and the final row state. Never bulk replay without checking each recipient and the current real-world decision. Closed-claim staff alerts and receipt emails may be stale and must **not** be indiscriminately replayed. If delivery might be ambiguous, hold for manual investigation instead.

## Staff UI behavior

The staff moderation server action now reports `mail=sent` only when the immediate dispatcher receives provider acceptance; otherwise it reports `mail=not_sent`. The bilingual Staff notice tells reviewers a saved decision is not proof that the customer was emailed. There is no public email address, provider key or queue payload in the redirect.
