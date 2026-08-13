# Recommendation platform

## Service boundary

All AkiPasa surfaces call the same recommendation pipeline. `recommendDiscovery` obtains candidates from `DiscoveryRepository`, loads consented preference features, applies the versioned weighted ranker, enforces relevance-aware sponsored placement and diversity, and records the request and returned items. UI components do not contain ranking equations.

```text
Catalogue -> candidate generation -> feature lookup -> ranker -> diversity -> response
                                      |                         |
                               preference profile       request/item log
```

The current candidate source is the existing nearby/date/category repository. New sources (followed venues, trending, social, Passports, embeddings) implement the same candidate contract and identify `candidate_source` without changing consumers.

## Version 1 model

- Model: `weighted_ranker`
- Model version: `1.0.0`
- Feature version: `1`
- Ranking configuration: database row `weighted_ranker`, version `1`
- Signals: category, venue and price affinity; distance; temporal relevance; verified quality; freshness; current category intent; negative affinity.
- Short-term preference decay is approximately seven days; long-term decay is approximately ninety days.
- Repeated identical signals receive diminishing weight.
- Sponsored boost is applied only after the minimum organic relevance threshold.
- A deterministic exploration fraction and post-score category/venue diversity prevent a closed loop.

## Fallback

If profile/config/logging storage is unavailable, candidates are still ranked by local contextual defaults. `fallback_used` is logged when storage is available and returned by the API. A recommendation dependency failure must never produce an empty feed when the catalogue remains available.

## Reuse

- Homepage: server calls `recommendDiscovery`.
- Internal clients and AI tools: `GET /api/v1/recommendations`.
- Future partner API: authenticate and meter at the partner gateway, then call the same service with a temporary partner profile. Do not copy ranking logic into the gateway.

## Next phases

Phase 2 adds learned category-specific distance, time, planning horizon and session intent features. Phase 3 adds social/collaborative candidates, embeddings, attribution and experiment management. Phase 4 adds partner authentication, quotas, billing metering and an OpenAPI publication pipeline.
