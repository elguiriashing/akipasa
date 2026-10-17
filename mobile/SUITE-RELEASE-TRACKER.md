# AkiSuite mobile releases — 17 October 2026

**Scope:** Five separately installable Android and iOS applications; ten store listings. This file is the live handoff index **for preparation only**. No store uploads or native binaries have been produced and the D-U-N-S organisation conversion is pending.

## Verified production-to-repository map

| Product shown to user              | Production domain       | Cloudflare delivery                                             | GitHub source / release branch                                                                                                 | Release prep PR                                             |
| ---------------------------------- | ----------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| AkiPasa                            | https://akipasa.com     | Worker `akipasa`                                                | `elguiriashing/akipasa`, `master`                                                                                              | [#193](https://github.com/elguiriashing/akipasa/pull/193)   |
| AkiDuermo                          | https://akiduermo.com   | Worker `akiduermo`                                              | `elguiriashing/AkiDuermo` extraction; **default `main` README is placeholder**, reconcile live Worker source with PRs #1/#2/#6 | [#5](https://github.com/elguiriashing/AkiDuermo/pull/5)     |
| AkiCoches                          | https://akicoches.com   | Worker `akicoches`                                              | `elguiriashing/AkiCoches`, verify live SHA                                                                                     | [#17](https://github.com/elguiriashing/AkiCoches/pull/17)   |
| AkiHQ, free management hub         | https://akihq.app       | Worker `akihq-management-preview`                               | **`elguiriashing/AkiBusiness` (historical repo name)** with role swap; verify exact live SHA                                   | [#18](https://github.com/elguiriashing/AkiBusiness/pull/18) |
| AkiBusiness, paid operations suite | https://akibusiness.com | Cloudflare DNS CNAME `akibusiness-operations-preview.pages.dev` | **`elguiriashing/akihq` (historical repo name)**, Cloudflare Pages source branch `release/akibusiness-operations-brand-v1`     | [#37](https://github.com/elguiriashing/akihq/pull/37)       |

**Important:** Do not infer product identity from GitHub repository name. Cross-product role swap is a real production mapping, not a desired future change. Do not package AkiHQ from the old static AkiHQ README or AkiBusiness from the old Next.js management default.

## Proposed immutable IDs (do not register until verified)

| Product     | Android applicationId / iOS bundle ID |
| ----------- | ------------------------------------- |
| AkiPasa     | `com.akipasa.app`                     |
| AkiDuermo   | `com.akipasa.duermo`                  |
| AkiCoches   | `com.akipasa.coches`                  |
| AkiHQ       | `com.akipasa.hq`                      |
| AkiBusiness | `com.akipasa.business`                |

## Independent paths

- **Google Play:** finalize organisation conversion and payments profile; lock IDs; verify brand icons; compile app with Android API 36+; configure Play App Signing; AAB; Play internal testing; Play App Links from real signing SHA; data safety, deletion URL, content rating, ads declaration, declarations on location and user content; store review.
- **Apple App Store:** independently enroll company as organisation using D-U-N-S and legal signatory, verify seller info and team ID; final IDs and capabilities; iOS 13+ deployment target built with Xcode 26/iOS 26 SDK; make a genuinely app-like native experience to satisfy guideline 4.2; real TestFlight build; AASA; app privacy, deletion, age rating, app-review credentials; App Store submission.
- **Both:** deep-link/OAuth cross-domain auth callback, token lifetime, login/logout/password recovery, permissions, maps/GPS, image upload, push handling if implemented, locale ES/EN, tablet layout, networking/offline messaging, accessibility, privacy consent and deletion, content moderation, release crash reports.
- **Money:** distinguish property/car/real-world services from AkiPasa Premium and AkiBusiness digital SaaS subscriptions. Implement platform-appropriate IAP/Play Billing or permitted alternatives for each territory; never assume existing browser Stripe checkout is approved in a native build.
- **Release credentials:** App Store Connect API key, certs, provisioning profiles, Play service account and keystore via CI secret stores only. No passwords/keys in repository, logs or screenshots. Create reviewer-only sandbox accounts with minimal tenant access.

## Release evidence policy

In every repo `node mobile/validate-store-release.mjs` validates the document **only**; `--ship` intentionally fails until all twelve booleans are supported by signed builds, physical-device tests, listing and policy evidence. Neither step uploads apps. Store publication is a distinct, explicitly reviewed action after all green CI and app reviews.

## Pending human/account actions

1. Verify that AkiPasa Marketing S.L. is the correct _legal seller_ in Google and Apple accounts, with accepted incorporation and D-U-N-S.
2. Complete Apple Developer Program **organisation** enrolment; Google organisation verification does not do this automatically.
3. Provide/authorize signing and portal access through secure secrets, not chat or GitHub commits.
4. Finalize business/policy contacts, public privacy and deletion URLs, real review-account credentials and subscription behavior for native apps.
5. Approve final bundle IDs before first store registrations.

Keep release PRs as drafts until the app itself, not just the metadata, is ready.
