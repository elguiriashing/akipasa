# AkiPals World login and database preflight

The restricted World route uses the canonical `/en/auth?next=%2Fpals%2Fworld`
entry. Review found that the existing safe return allowlist accepted `/pals`
but not `/pals/world`, sending a newly signed-in tester to Account instead.
This release adds only the exact `/pals/world` destination. No wildcard,
external origin, arbitrary suffix, query-bearing destination, role bypass or
new authentication mechanism is accepted. EN/ES positive and negative return
cases are covered by `tests/pals-world-auth.test.ts`.

Wardrobe API tests additionally cover anonymous and non-invited denial,
owner-scoped reads, session-owned saves, forged owner fields, cross-site
writes, local-only edits and failed saves. These use disposable fixtures,
not live customer writes.

Read-only Supabase preflight on 31 October 2026 verified that
`pals_avatar_profiles` and `pals_preview_access` exist with RLS enabled and
no anonymous SELECT grant. Avatar SELECT/INSERT/UPDATE policies all enforce
`auth.uid() = user_id`, with both USING and WITH CHECK on UPDATE. Invitation
rows permit authenticated owner-only reads, not client inserts or updates.
No database statement changed schemas, user profiles, invitations or saves.

The new live smoke waits for the exact merged source SHA, then checks guest
World sign-in return, 401 API boundaries, noindex/no-store headers, genuine
GLB/runtime assets and unchanged public homepages. The check is read-only;
real signed-in saves and physical GPS remain owner playtest items.
