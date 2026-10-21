# Private merchant-check diagnostics

## Source and scope

Built on primary99feec0dc532598bb16f7a8b2afe8dad4752ef26. PR252 merged as
93518afd38e99e007082265becc6b5dd29c24eea after final source8798b77a; both that
merge and previously testedf69a9a6 are ancestors of this primary. This addition
observes the existing billing and migration GET /v1/account only. Request inputs,
Stripe version2026-08-26.dahlia, exact merchant check, queue bounds, approved
command seals, preview/readback, tax/checkout gates and financial behavior remain
unchanged. No new provider call, retry, financial action or HTTP route is added.

The release manager reported actual13:30UTC cron activity and merchant-stage
failures before claim, with three queued commands at zero attempts. These are
operator reports, not evidence supplied by this source change. No actual failure
category, successful schedule or deployment is asserted here.

## Private additive contract

CLI-generated forward20261021133839 adds only six nullable fields to the existing
operations_runtime_private.health singleton: billing/migration merchant HTTP
status, category and timestamp. Existing enabled flag, default false, controls the
separate service-only RPC record_operations_merchant_health. It runs through a
private definer with empty search path, fixed input validation and post-lock UTC
timestamp. Browser roles cannot call either layer or read the table. Service can
read but cannot enable or directly mutate the singleton. Disabled calls do nothing.
No previous migration is replayed and no customer or queue row is touched by SQL.

Each diagnostic POST has a two-second deadline and fails softly. Unknown/missing
schema or diagnostic transport failure must not replace the task's original
result/error. The original provider response object/body is retained. HTTP400
classification inspects only its cloned error, capped at8KiB,64chunks and250ms;
only exact version code/header or fixed version-error prefix selects api_version.
The provider message/header/identifier is never stored, returned or logged.

| Category         | Meaning                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------ |
| ok               | HTTP2xx response only; not payment or entitlement verification                             |
| api_version      | HTTP400 with a recognised version-specific error                                           |
| authentication   | HTTP401                                                                                    |
| permission       | HTTP403                                                                                    |
| account_mismatch | HTTP2xx followed by the existing fixed merchant-mismatch rejection                         |
| network          | Existing fetch threw without an HTTP response; may include transport/configuration failure |
| rate_limit       | HTTP429                                                                                    |
| provider         | HTTP5xx                                                                                    |
| invalid_response | HTTP2xx body failed existing JSON parsing                                                  |
| validation       | Other existing merchant-stage rejection after HTTP2xx                                      |
| rejected         | Other/unclassified HTTP failure, malformed/oversized/timed-out error copy                  |

The HTTP status is null only for network. Only these fixed categories and integer
HTTP statuses are accepted; raw strings, identifiers and missing classification
are rejected. The observer never downgrades API version, changes keys, skips
account verification or retries a provider call to make the engine pass.

## Operator acceptance and rollback

Review and apply only the new forward migration after its exact SQL tests and ACL
audit pass; installation and source deployment belong to the release manager.
Notify PostgREST cache reload is included. Do not invoke the diagnostic artificially
to manufacture an actual scheduled tick. After deployment, read the private
billing/migration merchant fields alongside task stage/outcome/time and actual
cron tick. Compare timestamps: an older merchant observation is not the current
cause if a newer task failed at bindings or never reached merchant. A null status
is not proof that Stripe credentials are invalid. Neither ok nor a scheduled
command is evidence of verified payment.

The diagnostic must not change the existing commands' approved financial guards.
Handle any actual key, permission, API-version or merchant mismatch as a separate
reviewed fix. Public GET /api/bookings/release retains its current booleans and
performs no new provider/database work. No feature flag is changed here.

Rollback source observer/helper only; leave nullable private telemetry columns
and retained prior fields intact. No customer data, subscriptions, commands or
financial history require rollback. If telemetry itself must be paused, the
existing enabled singleton flag remains an operator-only control.

## Evidence

Focused86 tests pass:30 bounded classification/original-error/actual-adapter cases,
five new actual-role SQL cases, existing runtime-health/Worker composition and
billing/migration regressions. Both actual tasks retain account GET and never
claim a queue after merchant failure. Tests verify disabled no-op, browser denial,
service direct-write denial, preserved original response/error, bounded stalled
and empty-chunk streams, no leaked synthetic message/key/identifier, unchanged
customer/queue fixtures and diagnostic outage tolerance. Types, scoped lint and
two-mirror SQL permission audit pass. Final fullcheck/hosted CI and real
installation/deployment/readback remain separate release gates.

Primary references: https://docs.stripe.com/api/errors and
https://supabase.com/docs/guides/database/functions ; Worker stream/observation
guidance: https://developers.cloudflare.com/workers/best-practices/workers-best-practices/ .
