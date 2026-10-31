# Staff presentation repair — 30 October 2026

Base published head `227267a63885d6162206480f74e9f9e1eb6d4cd2`. Owned only `src/app/[locale]/staff/staff-ui.css`, `staff-overview.css` and explicitly approved maintained runner `scripts/test-staff-ui-upgrades-browser.mjs`. Source frozen after validation; no commits, deployments, SQL/provider/customer mutations, root Next build or shared CSS edits.

## Implemented

Staff-only scoped charcoal surfaces, warm white supporting text, orange active/primary controls, rounded task/queue cards, coherent navigation and native form/disclosure controls through lower panels. Staff overview has a deliberate warm-dark hero in both themes, explicit readable paragraph/support-action colors, orange primary action and clear orange icon hierarchy. Phone metric labels span card width rather than awkwardly breaking beside a large icon. Danger/rejection controls retain existing red treatment and all decision/status text remains.

All actual loaders/actions/role checks/caller or tenant filters/claims PIIs/inputs/names/values/visibility/consent/billing remain unchanged. Owner and Admin skins are not restyled by these Staff selectors. No unnecessary nightlife image or fabricated activity was introduced.

## Verified concrete repair

Before: actual EN/ES light820 Staff hero paragraph and “Open support” action were almost white on cream. Exact published-HEAD227 Staff CSS replay through the new maintained regression fails at contrast **1.008212:1**, against required4.5. Before failure preserved `/tmp/akipasa-staff-contrast-before-regression-20261030.log`; temporary baseline runner `/tmp/akipasa-staff-contrast-before-regression-20261030.mjs` and exact original CSS `/tmp/akipasa-staff-{ui,overview}-before-227.css` remain outside repo. This tests the actual pre-repair CSS, not a boolean/contrast stub.

After: alpha-composited paragraph and both hero-action contrast across dark/light modes has conservative minimum **7.350721:1**. Helper includes transparent foreground/background compositing, actual rendered gradient stop colors and conservative channel bounds. Native keyboard opens/closes real workspace drawer with Enter/Escape and restores focus; real per-fragment hero action hit targets are unobscured by closed drawer/dock and >=44px high. Actual overview reads drive synthetic15pending and metric sequence15/0/3/3/3; no production counts claimed.

## Testing and actual screenshots

- **Maintained120 Staff/Admin combinations pass**, keeping all original80 cases/assertions and adding actual overview plus820. Real AppShell included; signed-in/role props derive from the existing synthetic administrator fixture profile. Original retry/filter preservation/venue deep-link/editor geometry/empty/private-error assertions remain. Source hashes unchanged during final run.
- Actual-source separate36 renders: overview/moderation/support × EN/ES × dark/light ×390/820/1440, zero horizontal overflow. Actual page/layout/AppShell + explicit synthetic authorization/reads and throw-only actions; no real customer rows.
- Vitest:40 Staff UI cases and6 claims cases pass using maintained configs. Scoped ESLint/Prettier and diff whitespace checks pass.
- First expanded runner hit a fixture scope failure: document-wide `details[open]` also counts new real AppShell GlobalSearch's closed-popover filter details. Parent approved scoping same zero-open-editor assertion to `.workspace-grid-body details[open]`; original venue editor count0 case retained. Original failure `/tmp/akipasa-staff-maintained-20261030.log` is preserved.

Final maintained log `/tmp/akipasa-staff-maintained-final-20261030.log`; receipt `test-results/staff-ui-upgrades/staff-overview-evidence.json` contains20 overview records, contrast/hit-target evidence and strict source hashes. Existing screenshots retained, plus overview screenshots at every maintained viewport.

Before48 representative family screenshots: `/workspace/akipasa-main-checkpoints/operations-before-20261030/`. Additional original light-hero computed evidence: `/workspace/akipasa-main-checkpoints/operations-light-hero-proof-20261030/`.

After36 representative screenshots and geometry: `/workspace/akipasa-main-checkpoints/staff-after-20261030/`; runner `/tmp/akipasa-staff-after-20261030.mjs`, log `/tmp/akipasa-staff-after-20261030.log`. Visually inspected before ES light820 overview and EN dark390 support, then matching after states: hero supporting copy/action clearly readable, navy cards/inputs replaced through bottom, no excessive photo decoration or old-panel fallback in reviewed routes.

## Frozen source hashes

- staff-ui.css `fad135fd080abe2461558caff5956cf24715765a14edc34ba7ee4fda6cb89dad`
- staff-overview.css `4794e74c2759f5cf3e49ce10fb390dd2ad1dfb78d2d6426f0c6f1a9badc978f5`
- maintained runner `c4c08fc4587f54258a25013ad057441d949703991d4f691005e3f99b198f1650`

## Honest limits / next integration action

This is actual-component browser/fixture and maintained unit evidence, not authenticated actual Next/server/Auth/RLS/provider acceptance or physical Android. All tested roles are explicitly synthetic; no protected actions were invoked. Bespoke claim and promotion visual subviews still require their own visual review; passing six claims functional tests is not visual approval. Owner is assigned elsewhere. No route acceptance was promoted. Root should independently review representative screenshots, update contract/impact, integrate these three frozen files, then run full exact-candidate checks/build/CI under its ownership.
