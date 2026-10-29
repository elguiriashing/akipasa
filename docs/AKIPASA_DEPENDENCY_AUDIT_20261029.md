# Read-only dependency audit at 4e71c62553b51d1bdf9ad79e92ef48224a29bcce

Fresh npm audit reproduces16 package findings:3moderate,10high,3critical. This counts affected package nodes/ancestors, not16 independent exploits. Production-only audit shows2 findings (MapLibre critical, Zod high). No dependency/source/lock changes. npm audit registry query required authorized sandbox escalation; raw receipts /tmp/akipasa-audit-current.json and /tmp/akipasa-audit-production.json. Paths /tmp/akipasa-audit-paths.txt.

## Priorities

1. Zod3.25.28 is real runtime exposure, GHSA-mrhx-c7xc-m3w5. Installed ZodArray.\_parse marks max failure dirty then copies/maps every element. Bounded1000-element proof max2 rejected yet visited1000. Public behaviour POST only trusts content-length64k then request.json -> events max25 validation BEFORE session/consent lookup. Same-origin protection is not authentication and does not bound direct HTTP bodies. Missing/incorrect content-length can bypass the intended limit; actual Cloudflare ingress limits may reduce maximum but no local streaming bound exists here. Use existing readBoundedText(request,64000), then raw events count <=25 BEFORE schema validation. Retain400/413/origin/consent behavior. Creator form categoryIds max6 validates before requireUser; Prestige configure achievement_keys max1000 validates before auth (feature gate applies). Next Server Actions10MB limit bounds bytes but still allows unnecessary per-item allocation. Guard raw lengths before Zod; do not silently slice or weaken validation. Pals API already streams cap4096, support chat uses readBoundedText8000. No actual production crash attempted. Latest Zod3.25.76 remains inside affected<4.6.6: no fixed3.x available. Zod4.6.7 migration needs broad API/type/error compatibility testing; simply bumping3.x is not remediation.

2. MapLibre5.12.0 critical GHSA-jrc7-96c5-q579 is version-only remaining audit warning with an existing pinned backport. scripts/maplibre-attribution-patch.mjs snapshots live NamedNodeMap using Array.from in source and four actual UMD/CSP bundles; exact pristine/patched hashes fail closed, postinstall and build/dev enforce. --check PASS; existing29 regression tests PASS after appropriate sandbox permission (first restricted attempt failed with no details; retained log overwritten by successful run /tmp/akipasa-audit-maplibre-tests.log). Tests reproduce original control sanitizer bug and verify nested/consecutive attribute removal +safe attribution preserved. Preserve this patch, don't replace with unreviewed major6.16 upgrade just to silence metadata. Future upstream upgrade requires map/CSP/worker/native/attribution checks then retire patch deliberately.

3. Tool-chain findings should be fixed but are not established deployed endpoint vulnerabilities. Lockfile dev flags alone don't guarantee none bundled, so verify final Worker metafile for specific vulnerable modules. Actual Express import is AWS express-dev wrapper, no body-parser middleware invoked in that wrapper; actual minify uses globSync library, not vulnerable glob CLI --cmd. Vitest is only tests/run/watch, no exposed browser/mock service identified. Never execute untrusted PR tests with production credentials.

## Safe remediation candidates (separate reviewed lock changes)

- body-parser2.3.0 ->2.4.0 via express transitive (^2.3.0 allows it); brace-expansion1.1.16 ->1.1.21; js-yaml4.3.0 ->4.3.2; Vite7.3.6 ->7.3.7 all same-major metadata-compatible candidates. Verify availability and fresh audit after lock-only resolution in isolated branch; lint/test regression required.
- @node-minify/core9.0.2 pins glob10.3.3 exactly. Narrow nested override glob10.5.0 may repair CLI advisory; test actual minification and clean Cloudflare build. Audit proposes OpenNext downgrade1.20.9 (marked major by audit) rather than safe upgrade: do NOT apply blindly.
- Wrangler4.151.3 ->4.155.0 advertised nonmajor fix, includes Miniflare/Undici refresh. Actual vulnerable undici7.29.1 is under miniflare5beta; rootundici6.29.1 is separate/unflagged. Verify Next16.4/OpenNext compatibility, config/typegen, production-build and local preview; no deploy needed.
- Tinypool1.1.1 critical gadgets need prior prototype pollution/control of worker/run options, not a discovered AkiPasa public request path. Fixed>=2.1.2 is a major change for current1.x consumer; do not globally override without compatibility proof. Current Vitest3.2.7/mock3.2.7 fixed mock>=4.1.12, audit suggests Vitest5.0.5. Plan reviewed major Vitest upgrade and all configs/full suites, node-engine compatibility, pool teardown/error behavior.

## Required regression additions for runtime mitigation

- behaviour route: missing and understated content-length streamed over64000 =>413 before schema/backend/consent; exact-bound valid batch;26events =>400 before element validation/service; invalid UTF8 =>400; preserve cross-origin403 and session/consent/rate handling.
- Creator categories7/large invalid UUID list =>same validation redirect, no auth/database side effects;6valid preserves payload. Prestige1001 keys rejected before per-item parse/RPC; gate/auth semantics unchanged.
- Existing suites tests/personalisation.test.ts, tests/creator-review-action.test.ts, tests/creator-read-recovery.test.tsx, tests/passport-prestige-actions.test.ts, tests/passport-prestige.test.tsx, request-security-related suite +full npmcheck/Cloudflare build after source fixes.

## Exact advisory inventory

- @node-minify/core 9.0.2: high; transitive; dev/tool path. Inherited via glob
- @opennextjs/aws 4.1.11: high; transitive; dev/tool path. Inherited via @node-minify/core
- @opennextjs/cloudflare 1.20.12: high; direct; dev/tool path. Inherited via @opennextjs/aws
- @vitest/mocker 3.2.7: moderate; transitive; dev/tool path. https://github.com/advisories/GHSA-82fw-gwwq-j7x9; https://github.com/advisories/GHSA-qxg6-89mg-rqv8
- body-parser 2.3.0: high; transitive; dev/tool path. https://github.com/advisories/GHSA-27r3-jxmh-p828
- brace-expansion 1.1.16: high; transitive; dev/tool path. https://github.com/advisories/GHSA-mh99-v99m-4gvg; https://github.com/advisories/GHSA-rgw5-rvv9-x895; https://github.com/advisories/GHSA-q2hr-2g5m-vwhr; https://github.com/advisories/GHSA-qhr7-859c-m2p7; https://github.com/advisories/GHSA-6j4f-fj2g-mc7p
- glob 10.3.3: high; transitive; dev/tool path. https://github.com/advisories/GHSA-5j98-mcp5-4vw2
- js-yaml 4.3.0: high; transitive; dev/tool path. https://github.com/advisories/GHSA-5p4m-2wfm-xmqj; https://github.com/advisories/GHSA-2883-xcg3-v3hh
- maplibre-gl 5.12.0: critical; direct; runtime. https://github.com/advisories/GHSA-jrc7-96c5-q579
- miniflare 5.20261019.1-beta: moderate; transitive; dev/tool path. Inherited via undici
- tinypool 1.1.1: critical; transitive; dev/tool path. https://github.com/advisories/GHSA-5gmw-xhrv-c9v3; https://github.com/advisories/GHSA-85c8-ppgw-ccpr
- undici 7.29.1: high; transitive; dev/tool path. https://github.com/advisories/GHSA-4qv8-2p9j-2685; https://github.com/advisories/GHSA-f72v-6w45-q472; https://github.com/advisories/GHSA-xjj6-f33q-929c; https://github.com/advisories/GHSA-4w7w-5xrc-9h26; https://github.com/advisories/GHSA-2m5v-pch6-74hx; https://github.com/advisories/GHSA-qrxm-fqhp-jwvm; https://github.com/advisories/GHSA-9fm3-97px-rjf6; https://github.com/advisories/GHSA-55wc-3pg8-jfw6
- vite 7.3.6: high; transitive; dev/tool path. https://github.com/advisories/GHSA-698v-4r3x-3vcv; https://github.com/advisories/GHSA-r825-w8mm-5pxw; https://github.com/advisories/GHSA-587h-7wmj-h5pm; https://github.com/advisories/GHSA-9jrq-w75r-8gcw; https://github.com/advisories/GHSA-rq7h-c2jc-7f22
- vitest 3.2.7: critical; direct; dev/tool path. https://github.com/advisories/GHSA-82fw-gwwq-j7x9
- wrangler 4.151.3: moderate; direct; dev/tool path. Inherited via miniflare
- zod 3.25.28: high; direct; runtime. https://github.com/advisories/GHSA-mrhx-c7xc-m3w5

Raw audit SHA256: 5ac85ef28859bf8f6b503713d8052f32ecaf6521136f0df1e9576872fe661188

## Integrated mitigation checkpoint

The subsequent main candidate adds a streaming byte bound and raw batch-count rejection to behaviour ingestion using the existing request-security helper. Eighteen actual-route tests plus eight personalisation regressions passed in an isolated worktree; final integration is tracked in the main ledger. This does not clear the full advisory inventory, authorize analytics, or certify every Zod collection. No dependency versions were changed.

The same candidate also guards the specifically traced creator categoryIds>6 and
Prestige configure achievement_keys>1000 cases before per-item Zod validation.
Existing locale/feature gates and owner/admin mutation authority are unchanged;
45 actual-action/render tests and independent review passed. The broader Zod
upgrade and other tool-chain remediation candidates remain open.
