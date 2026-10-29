# Existing Profile editor grant replay repair

This repairs a checked-in baseline gap, not a verified production outage. Read-only
production metadata on29October2026 confirmed authenticated UPDATE for all15
ordinary editor columns, anonymous UPDATE for none, RLS enabled and the canonical
owner/role update policy. The application already writes those fields. Fresh
source replay failed after0033 restricted updates to display_name/preferred_locale
and0069 introduced the new fields without corresponding grants.

The official Supabase CLI generated20261029231041. Its mirrored source grants
only those15 existing editor columns and refuses unsupported RLS/policy/privilege
states. It creates no function, policy, row, role/terms/ID/private-schema access,
feature activation or table-wide privilege. Exact source and metadata evidence is
in receipts/AKIPASA_PROFILE_EDIT_GRANT_BASELINE_20261029.json.

## Validation

21actual PGlite SQL cases execute the real migration and canonical source table/
policy. They cover pre-repair denial, own edits, other-owner and anonymous denial,
role/terms/ID denial, idempotence, rollback and fail-closed preconditions with no
partial grants. Run:

```bash
npx vitest run --config vitest.account.config.ts tests/profile-edit-grants-sql.test.ts
```

The separate disposable backend applies official initial defaults before94scoped
source paths;95execution records transparently preserve the strengthened guard
revision.39actual Auth/REST/RLS probes,10profile security-boundary checks and5
actual Next journeys pass after the exact final migration. Original93-source
Creator-save failures and both proposal revisions remain archived. The actual
Next application's five overridden source files match43b743e; module installation
was shared, so this is not an independent package-install claim. See
receipts/AKIPASA_CREATOR_REAL_AUTH_20261029.json for sanitized receipts and hashes.

The local-only replay/run instructions are preserved at
/workspace/akipasa-creator-local-qa/README.md. Private0600 credential files are not
committed or included in receipts. These scoped fixtures do not establish all
164canonical migrations, real provider returns, physical Android or route acceptance.

## Production and rollback

No production migration or permission change was performed. Existing live grants
already satisfy the allowlist, so the current deployment needs no added rights.
The source repair remains in draft#332 pending required checks and acceptance.

Keep existing live ACLs when reverting the application or Worker. Before applying
this migration to any new environment, record column/table ACLs and policies.
For a fresh replay rollback, restore that before-snapshot; do not blindly revoke
rights which existed before this repair. Never disable RLS, add an extra policy,
change role/terms permissions or broaden table grants to make a replay pass.

Read-only Supabase security advisors were also checked. No Profile finding was
reported. Existing project notices (including PostGIS spatial_ref_sys without
RLS, private closed tables, definer API and Auth configuration notices) are baseline
triage, not evidence that the unapplied patch was assessed remotely; no production
settings were changed. Advisor reference:
https://supabase.com/docs/guides/database/database-linter
