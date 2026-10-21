# Operating billing runtime diagnostics

## Release scope

This candidate builds on production source a974c449ae573e859a4207a51cfe2a3196a4ada0 and preserves the supported dependency upgrade from PR245, head 6f478ac7b9d7e9fa0d19e12e86bb11d112e14370. It does not close the migration batch. Billing and migrations remain enabled; checkout and tax remain disabled. Only the release operator may merge, deploy, apply SQL, enable diagnostics or operate the reviewed customer commands.

The existing GET /api/bookings/release now reports exactly three operating booleans: billingReady, migrationsReady and configured. The first two require the canonical string true. Configured means presence of the Supabase URL, service-role key and Stripe key only; it does not verify credential validity, cron execution, provider connectivity or payment success. The public request makes no database/provider calls and provides no task trigger. Existing no-store/noindex behavior is retained.

## Private cron evidence

Migration 20261021001252_operations_runtime_health.sql is mirrored in database and supabase. It creates one private singleton with enabled=false. The service-only record_operations_runtime_health RPC accepts fixed task, stage and outcome enums only. Browser roles cannot execute either RPC layer or read the row; service credentials can read but cannot directly change the gate or row. No customer identifiers, account values, errors, URLs, amounts or provider snapshots are stored. The gate defaults off and diagnostics are not evidence that customer work completed.

The scheduler records its first tick before existing billing work. Independent wrappers observe the existing billing and migration fetches, recording only merchant, claim or work stages and a sanitized outcome. Probes have a two-second deadline and fail softly; original task results and thrown error identities are preserved. Public requests do not run probes. The SQL locks the singleton before assigning its timestamp to avoid time regression from delayed concurrent writers.

## Operator sequence and rollback

1. Review the exact source and SQL, then install the migration in the intended project. The disabled default changes no billing/customer state.
2. Enable the singleton only through an explicitly authorized operator action. No browser setting or endpoint enables it.
3. Deploy the exact reviewed source and check release-source identity and the three public booleans.
4. Read the private singleton through privileged administration to distinguish no scheduler tick, missing bindings, merchant rejection, claim progress and completed work. Independently verify the three actual schedule receipts; health is not a substitute for those receipts.
5. Only after all required receipts are verified should a separate reviewed change close the migration flag.

Rollback can disable the private singleton immediately; reverting this additive source restores the prior release endpoint/scheduler. Keep the private diagnostic row and migration history unless separately approved. No source work here applied production SQL, deployed, enqueued commands or performed financial actions.

## Evidence

Twenty-two focused tests cover the actual worker release endpoint/scheduler, existing migration engine observation, health failure isolation and real PostgreSQL-role simulation. Five SQL cases exercise default-off behavior, enum validation, singleton locking, task isolation, service restrictions and browser denial. Supported dependency packaging and hosted CI must pass against the exact published commit before merge. Production execution and customer schedule completion remain operator verification gates.
