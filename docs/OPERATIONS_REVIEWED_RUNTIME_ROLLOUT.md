# Reviewed operations runtime rollout

This separate post-#229 release configuration is prepared for review, not merged
or deployed by its author. It does not enqueue commands or perform provider writes.
The base is master `8390836b8f8a03b213e873ae3c4e84ef68fe2f23`.

## Declared production runtime settings

| Variable                                  | Declared value | Effect after verified production deployment                                     |
| ----------------------------------------- | -------------- | ------------------------------------------------------------------------------- |
| `AKIBUSINESS_OPERATIONS_BILLING_READY`    | `true`         | Enables authoritative operating billing/recovery and its cron                   |
| `AKIBUSINESS_OPERATIONS_MIGRATIONS_READY` | `true`         | Allows the existing worker to claim explicitly service-enqueued sealed commands |
| `AKIBUSINESS_OPERATIONS_CHECKOUT_READY`   | `false`        | Public operating checkout remains closed                                        |
| `AKIBUSINESS_OPERATIONS_TAX_READY`        | `false`        | Tax-dependent checkout acceptance remains closed                                |

Existing suite checkout/tax/subscription/feature gates are unchanged and false.
The merchant, prices, discounts, secrets, routes, five-minute cron and database
notification enable setting are unchanged. The release manager verified an empty
migration queue at 23:27 UTC on 20 October; enabling the workers alone does not
create commands, subscriptions, charges or toolboxes. Read-only merchant checking
and bounded service queue-claim requests can occur with an empty queue. Existing
legacy-price bindings remain deferred without granting the new entitlements.

## Wrangler variable precedence

Reviewed installed Wrangler **4.113.0**, its config schema and upload-form builder
(`node_modules/wrangler/wrangler-dist/cli.js`, `createWorkerUploadForm`). Each
explicitly declared string var is sent as a `plain_text` metadata binding containing
its configured value. `--keep-vars` adds `plain_text`/`json` to `keep_bindings` so
unspecified remote variables survive; it does not omit the explicit bindings.
Thus the four declared settings override old dashboard values when the normal
build deploys this configuration, including a deploy using `--keep-vars`. This PR
does not alter the existing keep-vars/deployment command or seek credentials.

Primary references checked on 20 October 2026:

- [Wrangler source of truth and secrets](https://developers.cloudflare.com/workers/wrangler/configuration/#source-of-truth).
- [Worker upload bindings and keep_bindings](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/methods/update/).

The provider config/SDK evidence establishes intended upload semantics, not that a
new version is serving production. The release manager must verify the actual
merged deployment and its existing `release-source.json` identity before queueing.
No new diagnostic browser endpoint or secret exposure is introduced.

## Independent owner-notification retries

The central billing cron independently invokes the existing service-only
`crm_toolbox_deliver_notifications` RPC with `p_limit: 100` and a ten-second fetch
deadline alongside billing recovery. Delivery failures are logged using a fixed
nonpersonal retry marker and cannot change the recovery/rotation result or lose
its lease finalization. A later cron can retry the existing transactional outbox.

The notification SQL (`20261020181233` and its `20261020183515` correction) is an
existing shared-project prerequisite confirmed by the release manager. Its own
DB enable flag remains false until separate acceptance. This hook does not enable
it, send email, call a new provider or add browser access. Non-Stripe grant rotation
remains behind the separate gateway rollout gate.

## Release sequence and rollback

1. Review the exact patch and pass required CI on its final commit.
2. The release manager merges the accepted PR and verifies the normal master
   Cloudflare build, actual production routing and the expected source identity.
3. Reconfirm that checkout and tax acceptance stay closed, required private
   bindings/schema exist, the queue is empty and legacy data remains accessible.
4. Only the release manager may then enqueue the **three independently reviewed,
   sealed** migration commands. This PR contains no customer payloads or enqueue
   action. Each existing command still requires unchanged source/binding,
   preserved paid expiry/current phase/discount, zero-amount future invoice preview
   and exact provider readback. No proration, live charge or payout is authorized.
5. Inspect command outcomes, schedule/current-subscription readback and the audit
   trail; do not treat cron timing, a successful build or enqueue as completion.

To stop new claims/recovery, deploy both billing and migration flags as false;
leave checkout and tax false. Preserve billing records, tool data, queue/audit
history and any provider schedule already created. Flag rollback does not undo
completed provider writes: if a command has begun, inspect its durable evidence
and provider state before any separately authorized retry/reversal. Never delete
records, reattach deleted identities, cancel customer subscriptions or silently
restore older prices as a rollback shortcut.

## Verification

Config-driven tests exercise the actual server checkout with both release gates
closed and with checkout alone toggled while tax stays closed: no provider or
reservation call occurs. An empty migration queue performs only the merchant GET
and bounded claim RPC, with no Stripe POST or grant. Recovery with an actual legacy
price remains deferred and cannot enroll tools. Notification tests verify exactly
100 requested rows, service authorization, a deadline, successful billing/rotation
and lease completion despite delivery HTTP 503, and no requests when billing is
closed. All fixtures are disposable; none contact production.

Final exact-head CI, deployment, binding verification and operator command
readbacks remain release-manager gates. No production activation is claimed here.

Local final verification: operations **32 Node + 48 adapter** cases and TypeScript
pass. Wrangler 4.113.0 local type generation succeeds and produces the exact four
literal values in a temporary file; no generated binding file, secret, customer
snapshot or credential is committed. The hosted exact-head full application and
Worker packaging checks remain mandatory before release.
