# Reviewed renewal commands — 2026-10-20

The connected Stripe catalogue exposes schedule reads but has not exposed schedule writes through operation discovery. This implementation uses the existing central AkiPasa billing server credential through its scheduled worker. It adds no public endpoint or credential and cannot run from a browser. No command is automatically enqueued.

Apply `20261020181614_operations_renewal_command_queue.sql` after the canonical toolbox/lifecycle migrations (and deploy the first-invoice recovery amendment). The private command table has RLS, service SELECT only and no browser privileges. Mutations use explicit service RPCs. The enqueue RPC requires an active legacy ledger, a verified bound private workspace with owner membership, no activated toolbox, and a sealed reviewed source snapshot. Source/manifest/workspace cannot be edited by retrying enqueue. Owners retain their initial tool choice until verified billing activates it.

Prepare the three explicit recipes offline:

```
node --experimental-strip-types scripts/prepare-operations-migration-commands.mjs --manifest PRIVATE-manifest.json --receipts PRIVATE-applied.json --snapshots PRIVATE-snapshots.json --output NEW_PRIVATE-commands.json
```

The script verifies the sealed manifest against original complete snapshots and unique applied private-scope receipts. Output mode0600 refuses overwrite. It performs no network call and has no apply mode. It expects the existing mission checkpoint snapshot shape `{ input: ... }` and applied receipts containing `verifiedProvisionedWorkspace` and `provisionedAndBound:true`. Never commit these private inputs/outputs.

Only after exact integrated CI/deployment acceptance, an operator uses the reviewed `enqueue_crm_operations_migration` recipes. The separate runtime flag `AKIBUSINESS_OPERATIONS_MIGRATIONS_READY=true` AND existing `AKIBUSINESS_OPERATIONS_BILLING_READY=true` are required. The queue starts empty and flags default off. One command is leased per five-minute cron. Disable the migration flag again after all reviewed commands are verified scheduled.

The processor validates the real Stripe merchant, authoritative binding and unchanged reviewed source (owner/customer/current price/item/quantity/paid period/invoice/discount/tax/payment settings/status). It creates a schedule only using `from_subscription`, preserving the same subscription. Stable command idempotency keys and persisted schedule IDs recover retries. Ambiguous creation beyond23hours is blocked rather than risking another provider operation. A pre-existing unrelated schedule is blocked.

It copies the complete reviewed current phase, rejects unknown non-null fields, retains the existing discount ID (never reapplies a new coupon), and sets only the next phase's approved Básico monthly price at the exact current paid expiry. Both update and phase prorations are none; end behavior release keeps the existing subscription recurring at its new price after the first monthly phase. It persists planned parameters and default settings before a future-phase update. A provider invoice preview must show exactly the approved2499EUR-cent line, existing2499-cent discount, zero total/amount due, automatic tax disabled, no proration, and exact future monthly period. Annual source access therefore continues through the actual annual expiry.

Only after that preview does it write future phases. It then reads the actual schedule and subscription back, comparing prices, dates, metadata, discount IDs, payment/tax/default settings, current invoice, status and paid period. Retries after an ambiguous phase update verify the saved plan and do not rewrite it. No immediate subscription update, invoice creation/finalization, charge, payment intent, refund, payout, tax activation or duplicate subscription endpoint exists in this processor.

A verified command writes immutable billing audit evidence and becomes scheduled. Invariant/provider validation errors block for operator review; transient failures back off. Missing first renewal webhooks are recovered separately by the central billing queue. The old legacy ledger remains active until the verified new-price invoice is atomically applied. Personal Premium is untouched. Read-only provider pricing previews already verified all three existing discounts cover the approved new product; actual schedule preview/readback remains required when each command executes.

Rollback disables the migration flag and retains commands/bindings/evidence. If a blocked command already has an attached schedule, inspect its actual current/future phases before any release/edit; never cancel the subscription as rollback. Do not erase a scheduled command or billing history. Commands do not provide a general-purpose subscription editor.
