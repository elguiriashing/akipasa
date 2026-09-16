# Behaviour event catalogue

Schema version `1` is validated in the browser API and again in PostgreSQL. Client batches contain 1–25 events and are idempotent by `event_id`. Context and metadata are flat, bounded objects and cannot contain names, contact data, IP addresses, precise coordinates or user agents.

Every event has: name, trigger, entity when applicable, surface, time, optional position/recommendation request, privacy class, default strength and retention. The authoritative weights/privacy classes are seeded in `behaviour_event_catalogue`; this document describes client semantics.

| Event                                                                                                                                           | Trigger                                                     | Default use                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| `event_impression`                                                                                                                              | Card is at least 60% visible for 750 ms                     | Exposure denominator; neutral preference              |
| `event_opened`                                                                                                                                  | Event card/detail is opened                                 | Weak positive                                         |
| `event_skipped`                                                                                                                                 | An impressed card leaves above viewport without interaction | Very weak negative; repeated patterns matter          |
| `event_quick_exit`                                                                                                                              | Event closes under 2.5 s with no scroll                     | Moderate negative                                     |
| `entity_view_duration`                                                                                                                          | Meaningful card/detail dwell ends                           | Duration-banded preference                            |
| `event_saved` / `event_unsaved`                                                                                                                 | Save state changes successfully                             | Strong positive / weak correction                     |
| `event_shared`                                                                                                                                  | Share begins                                                | Strong positive                                       |
| `event_going`                                                                                                                                   | Authenticated Going state succeeds                          | Very strong positive                                  |
| `event_not_interested`                                                                                                                          | Authenticated rejection succeeds; reason optional           | Strong negative                                       |
| `event_directions_clicked`                                                                                                                      | Directions is opened                                        | Very strong positive                                  |
| `event_ticket_clicked` / `event_booking_clicked`                                                                                                | External commerce CTA opens                                 | Strong positive                                       |
| `event_ticket_purchased` / `event_booking_completed`                                                                                            | Trusted integration confirms conversion                     | Server-only, extremely strong                         |
| `event_checked_in`                                                                                                                              | Transactional check-in is accepted                          | Server-only, extremely strong                         |
| `event_calendar_added`                                                                                                                          | Calendar artefact requested                                 | Very strong positive                                  |
| `event_rating_submitted`, `event_review_submitted`, `event_photo_uploaded`, `event_comment_posted`                                              | Successful contribution                                     | Strong positive                                       |
| `event_promoted_clicked` / `promotion_clicked`                                                                                                  | Labelled commercial placement opens                         | Attribution and relevance learning                    |
| `venue_impression` / `venue_opened`                                                                                                             | Venue is shown/opened                                       | Exposure / weak positive                              |
| `venue_followed` / `venue_unfollowed`                                                                                                           | Follow state changes                                        | Strong positive / correction                          |
| `venue_shared`, `venue_directions_clicked`, `venue_phone_clicked`, `venue_website_clicked`, `venue_instagram_clicked`, `venue_whatsapp_clicked` | Venue CTA opens                                             | CTA-specific strength                                 |
| `venue_hidden`                                                                                                                                  | User requests venue suppression                             | Very strong negative                                  |
| `search_performed`, `search_result_clicked`, `search_abandoned`                                                                                 | Search lifecycle                                            | Strong current intent and success                     |
| `feed_scrolled`, `feed_refreshed`, `filter_changed`                                                                                             | Coarse feed milestones/actions                              | Product analytics/current intent                      |
| `map_opened`, `map_pin_clicked`                                                                                                                 | Map lifecycle                                               | Product analytics/preference                          |
| `notification_opened`, `notification_dismissed`, `email_clicked`                                                                                | Message lifecycle                                           | Relevance/fatigue; marketing consent where applicable |
| `passport_progressed`, `passport_completed`                                                                                                     | Verified progress changes                                   | Server-only strong signal                             |
| `recommendation_clicked`                                                                                                                        | Explicit recommendation opens                               | Request-level evaluation                              |

Event payload example:

```json
{
  "event_id": "c29b8567-1268-4698-9a38-adc7d56c6013",
  "schema_version": 1,
  "event_type": "event_impression",
  "entity_type": "event",
  "entity_id": "f0a12bbd-2bf6-4942-a05a-8a2a104a2a91",
  "occurred_at": "2026-08-13T20:14:00.000Z",
  "surface": "discover",
  "position": 4,
  "recommendation_request_id": "6ba62a61-6e62-4555-aa52-b6ed1f063f35",
  "context": { "distance_km": 1.4, "language": "es" },
  "metadata": {}
}
```

High-value events are rejected by the public client schema and require `p_verified=true` from a trusted server integration.
