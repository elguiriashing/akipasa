# Authoritative contract recovery — 20 October 2026

This is a source-history recovery and CI integrity change. It does not change any
application, database, role, billing setting, customer record or deployment.

## Exact history

Both authoritative files were intact at commit
`548bc2516b7f92f9f61e50625869c4c5524bfb78` (the parent of the corrupting commit).
Commit `1305e6696379b81af8c81247fcc614ae6375b18b`, **Harden SECURITY DEFINER execution
grants (#208)**, replaced their middles with copied tool transport output while
adding legitimate security contract entries. Those security entries are preserved.
The security migration/application changes from that commit are untouched.

| File                             | Last intact blob                           | Corrupt blob                               | Exact restored parent lines |
| -------------------------------- | ------------------------------------------ | ------------------------------------------ | --------------------------- |
| `docs/AKIPASA_MASTER.md`         | `0c495f0d56c2830a6731cef11b343ef1733c5c1c` | `a58e5275df62fab9da011102735f7ce20358a0f6` | 558–762 (205 lines)         |
| `docs/CHANGE_IMPACT_REGISTER.md` | `c4c617c91b08244e0d8f24f547a45583dc1045b4` | `ecad135f3da3cebe1e9a14a9cd79f2cca2e1e8e6` | 759–1220 (462 lines)        |

The corrupt master line was 577 and the corrupt impact line was 783 in commit
`1305e66`. Each combined the start of one parent line, a numerical token-truncation
marker, and the end of a much later line. Each file also acquired a three-line
transport header containing a truncation warning, output-line count and blank line.

A first-parent history scan from the contract's creation (`e086941ae74ff8f614ed474f60f2d576f9c42670`)
to current `master` (`a272f2a0edbd49e30676d30fef87d72f2248793f`) found one transition
from intact to transport-corrupted content: `1305e66`, for both files. Later workflow
and formatter entries from #209/#210 remain present, along with the #208 additions.

## Recovery method and evidence

1. Read the complete original blobs using Git plumbing, not a displayed/truncated
   tool response and not a chat summary.
2. Use line sequence comparison against the corrupting commit to isolate its one
   truncation replacement per file. Assert it replaces more than one complete parent
   line with exactly one marker-bearing line.
3. Assert the exact corrupt line appears once in current `master`, then replace it
   with the exact parent line block. Remove only the observed three-line transport
   header.
4. Compare every original parent line to the recovered file. The sequence comparison
   contains only equal/insert operations: **no parent line is deleted or rewritten**.
   This preserves all verified later additions. Before adding this recovery's own
   entries, the diff against `a272f2a` is 667 insertions and eight deletions (the two
   corrupt combined lines plus six transport-header lines).
5. Check both complete recovered files for transport markers; inspect their diff
   and preserve the existing dated status/evidence rather than declaring historical
   candidates live.

No text is reconstructed from summaries or invented to fill a gap. The recovery is
fully attributable to the blob IDs and ranges above. Other in-flight feature PRs,
including #212 and #216, remain separate; preserve their independent appended
entries when merging or rebasing.

## Prevention

`scripts/check-contract-document-integrity.mjs` controls **only** the two authoritative
contract paths. It checks their canonical titles and rejects transport warning,
output-line-count, numerical token-truncation and tool-placeholder markers. It does
not scan arbitrary reports or example documents where such strings may be legitimate.
Ordinary product discussion of truncated API reads remains allowed.

The existing change-contract gate runs this check before its documentation-only
shortcut. The contract workflow runs the guard plus its ten Node regression tests;
`npm run check` also invokes the guard and tests. Regression cases cover each marker
shape, missing/empty files, legitimate product prose, ignored example documents and
the CLI's nonzero failure in a docs-only checkout.

Validation: ten focused Node tests pass; current recovered source passes the guard.
Scoped formatting/lint and the existing impact gate are checked before publication.
Hosted exact-head CI remains required. Rollback may revert the guard independently;
never restore the known-corrupt contract text as an application rollback.
