# Decisions

- ADR-001: Next.js App Router and TypeScript provide SSR, SEO, and one full-stack codebase.
- ADR-002: PostgreSQL/PostGIS is authoritative; deterministic fixtures provide credential-free public development.
- ADR-003: Localized URLs use `/es` and `/en`; missing content falls back to the other language.
- ADR-004: Tonight is 18:00–04:00 in Europe/Madrid, preserving the prior evening before 04:00.
- ADR-005: Sponsored placements are separate labelled slots, never hidden ranking boosts.
- ADR-006: Supabase is the initial compatible provider, not a domain dependency.
- ADR-008: Production runs as an OpenNext-built Cloudflare Worker. `akipasa.com` is canonical and `www.akipasa.com` redirects to it; Supabase remains the managed data and authentication provider.
- ADR-009: Community suggestions remain separate from canonical events until reviewed. All moderation decisions require an operator role and reason, and append an audit record in the same database transaction.
- ADR-007: AkiPasa is the selected product brand. Use AKIPASA for the wordmark, AkiPasa in prose, and akipasa for domains/handles; the primary tagline is “Todo lo que pasa cerca de ti.”
