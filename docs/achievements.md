# Managed achievements

Administrators can open **Admin → Achievements / Logros** at
`/en/admin/achievements` or `/es/admin/achievements`.

The catalogue includes every configured XP achievement, including drafts.
Search matches either language. Create/edit includes both translations, an XP
threshold and an icon, with a live preview. New achievements start as drafts.
Only active entries appear in account rewards and the passport badge view.

Progress remains calculated from the existing XP ledger, as before. This does
not mint XP or introduce an award ledger. Editing a threshold recalculates
eligibility; hiding or deleting a definition removes its badge from current
views, without changing user XP. The editor and deletion confirmation explain
this behavior. The original 10/100/500 XP achievements are seeded unchanged.

Apply `database/migrations/20260916103318_managed_achievements.sql` before the
frontend release. Authentication and the administrator role are checked both
by the route/server actions and table RLS. Drafts are private to administrators.
Mutations and audit entries are transactional, and stale updates/deletions are
rejected using `updated_at`. The private audit trigger cannot be called through
the Data API. No service-role key is used by the UI or its actions.

For a rollback of this feature, restore the previous frontend first, then drop
`public.achievements` and `private.audit_achievement_change()` only after backing
up custom definitions. Existing audit history and XP must be retained.

Validation: the full code check passed (158 application tests and 41 automation
tests, lint, formatting, type checks, database safety and production build).
`database/tests/achievements.sql` passed against the connected database inside
a rolled-back transaction: admin CRUD, draft visibility, denied non-admin
mutations, XP constraints, stale edits and atomic audit history. Security
advisors reported no findings for the new table/function. Browser interaction
tests run in jsdom; a real-browser visual check remains outstanding because
the local Chromium download failed.
The Cloudflare OpenNext bundle also builds successfully. Public HTTP acceptance
passed for sitemap/metadata, redirects and CSS/CSP behavior.
