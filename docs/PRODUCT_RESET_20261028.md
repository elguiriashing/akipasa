# Aki Product Reset — 28 October 2026

- This consumer site retains its independent brand and previously published customer routes.
- Public chooser shows AkiPasa, AkiDuermo and AkiCoches only. AkiBusiness is a standalone operating-software product.
- The new `/hq-login?lang=en|es` is the secondary business entry. It links to AkiHQ's **existing** sign-in, which performs its own host-local authentication and defaults to the authorized business workspace. It does **not** pass credentials or sessions between domains.
- No existing bookings, member profiles, tenant permissions, claims, subscription entitlements or legacy URL handlers are changed.
- Plans-first discovery was merged separately as #312. Preserve its hero, current-event-first ordering, date shortcuts and nationwide legacy URLs when releasing this selector/HQ gateway change.
- Current data-quality gate: do not imply event availability from imported venue inventory; verify upcoming occurrences in Fuengirola/Mijas Costa/Benalmádena before claiming the local pilot is content-ready.
- Planned next: verified Passport/AkiQuest pilot, separately reviewed.
- Acceptance: EN/ES and responsive rendering; reduced motion; existing account/app-return links; no broken deep links; full CI and exact Cloudflare release SHA. No customer data or Cloudflare runtime resources changed by this step.
