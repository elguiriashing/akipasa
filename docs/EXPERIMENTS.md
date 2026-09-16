# Recommendation experiments

Experiments are persistent assignments attached to a `preference_profile_id`; refreshes never re-randomise a user. The `experiments` row defines enabled state, time window and variant allocation. `experiment_assignments` stores the selected variant, and every recommendation request snapshots active assignments.

Guardrails:

- Control is the default and the `experimental_ranking` feature flag is off initially.
- Allocation changes affect only new assignments.
- Never experiment on consent, privacy, authentication or safety protections.
- Sponsored labelling and minimum relevance cannot be disabled by a variant.
- Primary evaluation is successful discovery/plans; screen time alone is not success.
- Report CTR together with save, Going, directions, verified check-in, diversity, skip and quick-exit rates.
- Stop variants that materially harm availability, privacy, diversity or user controls.

Recommended first experiment: recommendation reason copy, not ranking weights. This validates assignment/logging end-to-end at lower product risk.
