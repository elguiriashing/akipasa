# First live batch: Home and consumer Login

Status: approved, merged and deployed on 29 October 2026 at22:22UTC.
PR333 candidate `e2b537962193fcfe7a40967a10b58551dc58f8e4` merged as
`39cd9bb42fd858dd54bd9f0d9e79a0504b15a0f2`; Cloudflare Worker
`8199ce83-b416-42d1-9568-9dc167601b6a` received100%traffic. Public browser
reads verified exact source identity plus English/Spanish Home and Login.
All six exact-head CI workflows, clean full check (2,124tests) and80local browser
states passed before merge. Physical Android remains a follow-up. The original
proposal below records the bounded scope; it is no longer awaiting approval.
Base: production master `f3d2687fa66e53d4e529118eb08210ad9cc0ff45`.

Ship the photographic Home opening and consumer Login presentation first. Keep
PR332 and the remaining overhaul in draft. This is an explicit proposed change
to the original all-at-once90-route release plan, not a claim that those routes
have been accepted.

Eight application paths change. Existing discovery queries/date/map destinations,
auth actions/providers/callbacks, unchecked consent, return inputs, workspace
selector and separate-product hosts remain authoritative. The Home search button
opens the existing real form only after its listeners attach. Login keeps a
visible Home exit and places support where it cannot cover submit controls.

No database/schema/RLS, billing, avatar, dependency, production variable, global
shell, Account/Community/Passport feature or consent-state changes are included.
Other pages keep the current live master's appearance. The rooftop image is
illustrative atmosphere, not a real venue/event/crowd claim.

Local proof: production-style build,80 actual EN/ES phone/tablet/desktop states
in both themes, existing query navigation and no-op submission, four Auth modes,
provider availability, unchecked terms, hidden return targets, decoded imagery,
keyboard Home exit and unobscured submit controls. Focused Auth/security tests and
eight handler-lifetime regressions passed. Full check, clean packaging and normal
exact-head GitHub checks must pass before publication.

Screens are in ignored `test-results/first-live/`; the reproducible local capture
script is `scripts/test-first-live-proposal.mjs` against a disposable loopback
Next server on3597. These browser checks do not claim physical Android testing or
live customer authentication. A physical-phone check remains a follow-up for this
small batch and a requirement for the full coordinated release.

Publication, only after staged-boundary approval and checks: verify latest master
and candidate source, merge with exact expected head, inspect Cloudflare's
existing master-triggered deployment, verify the exact published source and HTTPS
Home/Login/critical return links. Do not run a second manual deployment if the
same source has already published. Preserve existing bindings/secrets.

Rollback: restore Worker version884dda44-e95d-4266-8ce1-d7a4de5c54db if still the
verified prior version, or revert only this small source batch and republish its
reviewed replacement. No database or customer-data rollback is required.
