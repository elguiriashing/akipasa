# Aki Product Reset — 28 October 2026

- This consumer site retains its independent brand and previously published customer routes.
- Public chooser shows AkiPasa, AkiDuermo and AkiCoches only. AkiBusiness is a standalone operating-software product.
- The new `/hq-login?lang=en|es` is the secondary business entry. It links to AkiHQ's **existing** sign-in, which performs its own host-local authentication and defaults to the authorized business workspace. It does **not** pass credentials or sessions between domains.
- No existing bookings, member profiles, tenant permissions, claims, subscription entitlements or legacy URL handlers are changed.
- Planned next: discovery-first local events, no forced registration; verified Passport/AkiQuest pilot, separately reviewed.
- Acceptance: EN/ES and responsive rendering; reduced motion; existing account/app-return links; no broken deep links; full CI and exact Cloudflare release SHA. No customer data or Cloudflare runtime resources changed by this step.
