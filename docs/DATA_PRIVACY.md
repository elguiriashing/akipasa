# Behavioural data privacy

## Purpose and choice

Behaviour is collected only to operate AkiPasa, improve recommendations, measure discovery success, protect the service and produce aggregated reporting. Personalisation and analytics are off until the visitor opts in. Marketing remains a separate field and is not enabled by the personalisation control.

## Minimisation

- Exact GPS trails are not accepted in behavioural context or metadata.
- Names, email, phone, address, IP and user-agent fields are recursively rejected.
- Selected locality and distance bucket/value may be stored as recommendation context.
- Anonymous and session IDs are random, first-party identifiers.
- Search metadata is bounded; do not send sensitive or full free-form profiles.
- Business analytics remain aggregate and venue-scoped.

## Retention

The catalogue defines retention per event: coarse feed/search events 30–90 days, ordinary preference evidence 180–365 days and verified commercial/attendance records up to 730 days. The bounded `purge_expired_behaviour_events` job runs daily through `pg_cron` where available and deletes raw rows using each catalogue policy while derived signals continue to decay. Operations must alert on missed or repeatedly full batches.

## Rights and access

Users can disable or reset personalisation and use existing export/deletion flows. RLS exposes an account only to its own settings, linked raw events, profile, features, recommendations and assignments. Anonymous data is never exposed through the Data API. Service-role ingestion is isolated to server code.

## Sensitive inference

The taste profile is limited to local discovery preferences. Do not infer health, religion, ethnicity, politics, sexuality, financial distress or other sensitive traits. Partners receive recommendations, not private profiles. Destination analytics require aggregation thresholds.

Legal review remains required for the final consent language, retention periods, lawful bases, processor list and international transfers before broad production tracking.
