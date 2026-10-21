# AkiPasa independent feature integration candidate

**Prepared, not merged or deployed.** Base primary commit:
`a974c449ae573e859a4207a51cfe2a3196a4ada0` (the separately reviewed runtime
rollout #233). The primary branch and provider state are not changed by this work.

## Independent release and migration closure

This feature integration retains `AKIBUSINESS_OPERATIONS_MIGRATIONS_READY=true`,
`AKIBUSINESS_OPERATIONS_BILLING_READY=true`, and operating checkout/tax false.
Independent feature delivery must not wait on the three actual customer schedule
receipts. Exact source CI, migration acceptance and feature-specific gates still
apply. The release manager reported production a974 identity verified and the three
sealed commands enqueued; this document supplies no completed schedule receipts.

A separate local branch `release/akisuite-migration-closure-candidate` preserves the
proposed false flag and closed-configuration regression. It must be refreshed onto
the final release and reviewed separately only after all three actual schedules
and exact provider readbacks are verified. Closing the flag stops worker retries;
it does not reverse schedules or cancel subscriptions. Never manufacture a receipt
or delete evidence to satisfy that gate. Keep billing enabled for invoice recovery.

## Exact source ancestry

| PR   | Included immutable head                    | Scope                                                                                 |
| ---- | ------------------------------------------ | ------------------------------------------------------------------------------------- |
| #227 | `1aa807ecb474f228b15b876773294d372c285d73` | Forward-only referral audit sequence ACL                                              |
| #232 | `720de22e0932ae1abb466dc53e71b45a86d31acc` | Correct account wrapper terminators while retaining bodies/ACLs                       |
| #234 | `f9929d721928bec2c58dad9aef3700b83a30f02f` | Prevent published event UUID resurrection/quota bypass                                |
| #235 | `c9ea802537099241412da4a73e27167bf267bf17` | Gated private listing template/media library; formatter successor to source19d3641    |
| #236 | `780c3f29b10c0a1d8a678db3e31b5b873d65f598` | Free AkiHQ/canonical paid AkiBusiness acquisition and safe sign-in intent             |
| #237 | `46cce43206da538267dd41ae5ea6d21609ccf5ff` | Guarded operating-customer referral exclusion and private own-representative evidence |
| #238 | `a0d94c69f07411b8ed838643a503d28182b19f7a` | Installed listing schema readers, independent database gates                          |
| #239 | `ac56dec07603eada0ff0711d322345e639f17d20` | Owned/placed media counts, excluding unused picker assets; corrected client directive |
| #240 | `d12a862080b1189400ce7c7ceb431d15639654e4` | Referral-preserving bounded cross-product account resume                              |
| #241 | `3a9a0d3d9d2c6293d1fc69b932ef57ceed911434` | Minimal owner-only verified migration status and bilingual tool labels                |
| #242 | `40d659727d8bce4ec8ee2cc9e574dd948dd2cd38` | Default-disabled consent-gated trusted tenant funnel and bounded cleanup              |

| #243 | `7fd774694d5d9f809843fceafb08f17fdac814d7` | Caller-only complete paginated optional funnel privacy export |
| #245 | `6f478ac7b9d7e9fa0d19e12e86bb11d112e14370` | Supported Next16/OpenNext runtime; no unsupported bypass |
| #247 | `9e5a05e4692587fcfbf815b471ee3ff5046097e5` | Three release booleans and default-off private enum runtime health |

| #248 | `6f67b1dfa897cf95cee736ec1ae9bad859ec84bd` | Bounded caller-only referral and prestige privacy projections |

| #246 | `55cedf9921dc43ecf9bc64f39645724348a4608d` | Retained media identity and primary-key mutation protection |
| #250 | `7bdaa00bb4bcc8428581ec076a509c2cac8cf1a8` | Database invariant: library requires enforced verified uploads |

| #256 | `23b3c21d7b6a5f11db1e1a3f7d02137d372b5e44` | Five-product membership roles, retained legacy billing and pending checkout confirmation |

Every listed source head is retained as ancestry, including #239's earlier60ce
ancestor and #237's corrected232 dependency. No sibling source branch is modified.
Master/impact conflict resolutions preserve both appended entries and format the
complete documents. The actual Worker scheduler conflict preserves #233's isolated
billing/owner-notification wrapper alongside #242's separately bounded funnel
maintenance task and #247's independent runtime observer. The fixed notification
RPC bypasses billing stage observation so concurrent delivery cannot overwrite
merchant/bindings failure classification. Its two composition regressions execute the actual scheduled
method with disposable adapter boundaries and independently fail billing or funnel
maintenance while preserving every existing task. Other provider source
implementations remain intact. Integration also adds the peer-reviewed composite
billing-evidence lookup index `(subscription_id,processed_at)` to both still-unapplied
#242 SQL mirrors, so trusted proof lookup need not scan all billing history. No live
DDL is executed by this integration. The release manager separately reported
#24701252 installed and enabled, with last_tick_at NULL and service/browser ACLs
verified. Do not replay its CREATE SCHEMA migration; only actual cron may supply
its first tick. This is not evidence that any customer schedule succeeded. Migration flag closure is isolated from this feature candidate.

## Schema and activation boundaries

The release manager reports #227185822, corrected #232180946 and #234233905 already
applied and verified in the shared project, with functional gates preserved. This
integration must **not replay** applied migration/policy creation or infer new live
acceptance from those reports. #237234107 is explicitly not yet applied and requires
separate reviewed installation after corrected coverage; its presentation readiness
remains off by default. No programme, incentive, commission or payout is activated.

#241's read-only migration-status SQL235342 is a separately reviewed installation
prerequisite; missing schema fails closed in its UI. A returned scheduled date
requires actual durable verified readback and original active owner/payer scope;
it does not establish successful payment or activate tools. #242's trusted funnel
SQL234414 is separately staged: collection defaults false and retention/approval
reference NULL. Its scheduler flag remains unset. No optional analytics are
activated; purpose, consent adequacy and retention require separate review.
#243 adds caller-only paginated privacy export of optional stage observations,
available without the account-feature lock; it omits private provider proof keys
and fails the complete account export closed on incomplete pagination. #248 adds
separately gated caller-only referral/prestige projections with complete bounded
pagination, retained own shipping data and sanitized audit views; underage/pending
identities retain privacy access. Its new SQL001138 must be installed before its
readiness gate is enabled. Retained privacy schema readiness must not be disabled
merely because optional collection or physical fulfillment is paused.

The release manager separately reports listing library233027, retained-media
identity003500 and strict-library invariant004500 installed with all activation
flags false, 44 media/9 events retained and zero templates. Do not replay their
creation DDL. Actual strict Storage acceptance and library activation remain
unverified; the source/runtime and DB library gates remain separate from the
listing schema readers. Neither readiness
variables nor merged UI prove strict Storage byte behavior or shared-library live
acceptance. Preserve historic assets, placements, templates and drafts. Independent
accommodation property schema/uploader remains separately gated and must not be
mapped to fabricated venue identities.

#238 declares only existing listing readers ready; database listing limits,
strict uploads and library activation remain separate acceptance steps. #236
retains historical paid records, portal/cancellation and existing access while
blocking retired new HQ purchases; no provider prices or annual offers are created.

## Integration checks and release gates

The release configuration retains enabled migration processing and closed checkout/
tax. Existing explicitly disabled engine cases prove no provider actions; all actual
schedule cases remain explicitly enabled, including the enabled empty-queue test.
The separate closure candidate owns the future config-driven closed-batch test.
Billing notification failure isolation remains covered.

Combined focused suites cover the corrected real routine wrapper fixtures,
referral ACL/eligibility/privacy, event identity, media/library quotas/usage,
pricing/claim/auth intent, referral resume and billing lifecycle. Final hosted CI
must validate the exact published tree, including production/Worker build and
required browser workflows. A primary advance requires rebasing/merging its exact
reviewed changes and revalidating the resulting head, never a stale force merge.

No provider requests, live SQL, primary mutation, deployment, real payment, discount,
payout or physical fulfillment is performed by preparing this candidate. Remaining
operator receipts and activation decisions belong in the release report once
verified; leave this immutable candidate unchanged while checks run.

## Final combined source evidence

The supported combined source passed 367 AkiSuite cases, 87 onboarding cases,
55 Node billing cases, 48 billing adapter cases, 33 security cases and 23 suite
navigation cases before the final bounded management-scope correction. That
correction copies the canonical helper byte-for-byte (SHA256 f68f42070cb29be96643436f75d05cda1522ccbf7b0db2f23f15c4b2f34c26fb),
preserving property/company/organisation aliases through completion; the final 94-case onboarding suite
(including EN/ES and actual central route regressions) verifies it. Seven actual-role listing
identity/strict-library cases also pass. Full TypeScript, zero-warning ESLint,
format and contract integrity passed; final exact-head hosted CI remains required.
No local build/support bypass is used. Native accommodation249 and follow-on
inventory remain a separately reviewed additive foundation, not part of this
candidate.

## Installed identity reader and acceptance amendment

The release manager reports #248001138 installed and verified with an own-code
projection returning zero rows, authenticated execute enabled and anonymous
execute denied. This candidate therefore declares only the server-side
AKISUITE_PRIVATE_IDENTITY_EXPORTS_READY reader true. Historical privacy records
remain exportable when programme/physical launch gates are closed; no programme,
reward, consent grant or financial acquisition is enabled. Funnel readiness stays
unset pending separate verified installation; its database collection remains off.

#256 corrects all five product summary roles without deriving operating access
from a listing SKU. Historical billed records, approved included benefits, portal
and cancellation behavior remain; a checkout-return query says confirmation is
pending, not that payment succeeded. Stale account/discovery/subscription browser
assertions now verify free HQ, 4/8/12 operating tools and separately gated listing
checkout rather than retired new HQ/Enterprise offers. All prior cases are retained.
The supported-runtime browser amendment preserves actual consent rejection and
CSRF checks; see OPERATIONS_RUNTIME_DIAGNOSTICS.md. Exact combined CI is mandatory.

The final account fixture covers the current four management/operating cards plus
the relevant listing card. Billing-read errors render no checkout forms and a
disabled listing control; account-only public handoffs remain available with
checkout readiness false and never invoke a financial action. Twelve EN/ES
phone/desktop error/handoff cases pass; the normal 24 subscription viewport cases
also passed before the isolated boundary-assertion correction.

Runtime diagnostics are intentionally fail-soft: configured means binding
presence only. A NULL last_tick_at can mean no invocation, a closed diagnostic
gate, invalid recording credentials or transport failure; it alone cannot prove
cron absence. Recorded stages and independent provider receipts remain necessary.
