# AkiPassport: optional weekly exploration preview

**Status: candidate PR, not a live XP/reward economy.** The existing Passport, rewards, XP ledger and user records remain unchanged.

## Purpose

Show two small, optional weekly milestones in the existing `/[locale]/passports?view=progress` tab:

1. First distinct venue with an accepted **venue-credential check-in** this week.
2. Two distinct venues with accepted **venue-credential check-ins** this week.

The week is **Monday 00:00 Europe/Madrid to next Monday 00:00**. DST changes must not assume a fixed UTC offset or 168 hours.

## Data source and privacy

- Existing caller-owned `public.check_ins` with `profile_id = auth.uid()` session constraint, `state='accepted'`, non-null `credential_id`, bounded current week and a 100-row read limit. Existing `check_ins_own_read` RLS and authenticated SELECT grants were verified, and the application also explicitly scopes to the signed-in ID.
- Duplicate/cooldown/rate-limited attempts, GPS-only acceptance, missing venue credential, expired/out-of-week and future timestamps do **not** count. Two scans at one venue count as one place.
- The result is shown only to the signed-in user. No public visit feed, friendship presence, leaderboard, analytics event, push notification, email, XP write, tokens or monetary reward.
- A venue-credential scan is **not** evidence of spending or fraud-proof attendance. Robust rotating signed codes and server-side redemption verification remain future work, as required by issue #314.
- If read fails, render an unavailable notice, not a false zero. When signed out, display the optional challenge description without leaking progress.

## Dependencies and rollback

- Uses existing Passport progress page and shared theme tokens. No Supabase migration, new table, SQL grant, admin change, payment, subscription, Android-native code or AkiBusiness integration.
- AkiTonight #328 and consumer redesign #326 remain independent; keep their route and Passport visual work reconciled at rollout.
- Remove UI and own-history query to disable; persistent Passport progress and existing check-ins are untouched.
- Acceptance: consent-neutral own-history read, EN/ES, mobile/dark/light, strict RLS, DST and duplicate/cooldown tests, full check, Cloudflare built-source/production acceptance before claiming live.
- Production acceptance still requires actual signed-in venue-scan end-to-end testing with an authorised staff QR; unit fixtures alone are not proof.
