# Partner API architecture

The same-origin internal route `GET /api/v1/recommendations` proves the versioned representation and uses the production ranker. It is not yet a commercial credentialed product and must not be sold or documented as one until the `partner_api` flag, gateway authentication and metering are enabled.

Future public products sit in front of the same recommendation service:

- Discovery: events, venues, categories, cities.
- Recommendations: ranked nearby plans.
- Trending / What's On: aggregated local demand.
- Concierge: natural language translated to structured recommendation context.
- Destination Intelligence: aggregated, thresholded trends only.

Partner organisation and key records will store organisation, hashed `ak_test_` or `ak_live_` credentials, scopes, API version, plan, rate/usage limits and product access. Every gateway request records organisation/key ID, endpoint, request ID, status, latency and billable units. Raw keys are shown once and never stored or logged.

Hotels pass a temporary `partner_session_id` and coarse guest context (location, date, language, interests, budget, accessibility). The response contains event data, reasons and request ID; it never returns an AkiPasa account ID, behavioural history or private feature vector.

Before enabling Phase 4:

1. Add partner organisation/key/usage tables with RLS and hashed-key verification.
2. Add configurable per-key daily/monthly quotas and a Cloudflare edge limiter.
3. Add OpenAPI 3.1 generation and contract tests for `/api/v1/`.
4. Add test/live environments, key rotation and revocation.
5. Add aggregate privacy thresholds and commercial terms.
