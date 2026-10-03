# City collection and manual awards

The passport now uses all 67 achievement cities, including Fuengirola. Each city has ten category families and one card rank. Category stamps progress at 1/5/10/25/50 distinct accepted local venues (Bronze/Silver/Gold/Platinum/Holographic). City ranks stay at 1/5/10/25/50/100; finishes change at ranks 1/3/5, with Legend at rank 6. Repeat visits never increase distinct-place totals. One genuinely multi-category venue can advance each relevant family but counts once for its city.

## Storage and permissions

The additive migration adds family, tier and archive metadata to achievements and seeds 3,350 local category milestones. Fifty global category definitions become non-awardable legacy definitions; earned history remains readable. The live catalogue also has the custom Die Hard achievement, for 3,803 active definitions after migration. Generated families use city/category keys, not translated names.

Natural awards remain in achievement_unlocks. Private manual_awards storage and the private test-account registry have RLS enabled and no direct client access. The public invoker RPC delegates to narrowly granted private functions with independent authentication and administrator checks. Administrators can search member identities, read progress, mark a test account, grant awards, apply test presets, revoke individual grants or revoke city/batch test grants. All mutations record administrator audit provenance. Manual grants never create check-ins, XP, loyalty balances, route progress or entitlements.

The displayed tier is max(naturally earned tier, active manual tier). Visit counts remain actual. Revoking a manual award restores the remaining earned/manual floor. Recognition grants survive test resets. Changing a test flag does not revoke its historical grants. To test an empty state below a naturally earned rank, use a fresh test account.

## Data readiness

At implementation inspection there were zero achievement-category assignments and one active check-in venue, named Test with placeholder descriptions. There is insufficient verified category evidence to classify that venue. No categories were guessed or bulk assigned from names. The existing admin venue classifier remains the authoritative assignment route. Until reviewed assignments are present, local stamps honestly show Coming soon; manual awards can still test every finish. Current check-in availability and historical progress are separate. Prior accepted visits count after classification through reconciliation.

Fuengirola has no entry in the current city photo catalogue. It receives an explicitly labelled original city illustration, never another city's photo. Replace it with properly licensed Fuengirola artwork when available.

## UI and loading

City details are inline, one category at a time. Functional content stays in grid/document flow and optical effects stay clipped inside the photograph. Only the current photo reacts to tilt; input sensitivity remains 1.2×. Reduced motion and Foil OFF preserve tier labels. Stamp finishes are static to avoid ten independent animation loops. Earned stamps are embedded in the card artwork on every screen size; the adjacent/below-card area holds compact progress controls and inline details. City query links preserve navigation and focus re-entry refreshes signed-in progress.

Business loyalty is labelled separately. Existing view=stamps and view=badges links remain valid. The legacy achievements API now serves global achievements and earned archive entries; local families are available through the compact passport_collection API. All current consumers use the city-collection link to reach local stamps. Check-in celebrations group new milestones by family and link to the relevant city.

The qualifying-places route uses canonical city and category membership plus the actual published/verified/location/credential eligibility checks, rather than the broad discovery radius. It never exposes credentials or tokens.

## Release and rollback

Run npm run check, npm run test:passport-db and targeted browser layout/interaction checks before deployment. Apply the additive database migration before deploying the application. Capture baseline XP, loyalty, check-in and route counts and verify that they do not change because of the migration. No member grants are needed for deployment.

Rollback application source to the previous commit if necessary. Preserve all new natural and manual awards. The migration retains the old schema and does not change reward ledgers. A data rollback should disable newly seeded stamp definitions and restore the 50 legacy definitions' active/archive state in an audited transaction, never delete visits or grants. Reinstating the old global progress function is optional for the old interface but must use its captured definition. Do not run a down migration that drops award history.

The isolated database suite covers role denial, cross-member reads, direct private-table denial, double submissions, grants with zero visits, mixed presets, reset boundaries, city aliases, repeated/rejected visits and natural award preservation. Physical device gyro feel is not proven by desktop automation.

Earned category seals now sit inside the city artwork and travel with its tilt. Level-zero seals stay visible as muted grey, dashed medallions in the same ten positions. They remain selectable to show progress. Tapping a seal opens its inline progress beside/below the card; a compact category selector also exposes unearned categories. The admin preview retains the full category grid. Seal tiers preserve the same award data and metallic treatments.

## Fast admin awards and history

Apply award, Apply preset and Revoke act immediately using the shared required reason; there is no separate review/confirmation step. Applying a tier atomically supersedes every active manual grant in the same member/family (city and category), including a higher or same tier and regardless of test/recognition purpose. Other cities, categories and members are untouched. City ranks follow the same replacement rule. Presets replace each category in the chosen city without changing its city rank. Natural unlocks remain the displayed floor and are never revoked by these actions.

Previous grants remain in history as Replaced, linked to the replacement grant. Each grant records the replaced IDs in administrator audit metadata. Identical request retries are no-ops even after a newer grant; reusing a request with different data is rejected. Per-member and per-request transaction locks prevent overlapping replacement operations.

History uses server-side pages of 15 compact cards, ordered by time and ID, with city and status filters. Revoked and Replaced are distinct statuses. The reason field is also available beside history actions, and feedback appears locally. Page numbers clamp after removals or filtering; no 200-record truncation remains.
