# Architecture

Next.js App Router server-renders localized public pages. OpenNext packages the application as a Cloudflare Worker, with static assets served by Cloudflare and `akipasa.com` plus `www.akipasa.com` attached as custom domains. The middleware canonicalizes `www` to the apex domain.

Domain repositories isolate UI and services from deterministic fixtures or Supabase/PostgreSQL. Production uses the hybrid catalogue adapter: published Supabase venues/events are the live source and the clearly labelled deterministic fixtures remain as launch-area demonstration content without masking a live slug. PostgreSQL with PostGIS is the production source of truth for business-published content; SQL migrations and row-level policies are versioned under `database/`. Supabase supplies authentication, database access, and private event media. Provider boundaries cover auth, maps, uploads, analytics, email, and future ticketing.

Fixture mode is intentionally read-only and credential-free for public discovery. Authenticated venue and event publishing use the hosted Supabase development project. The local Supabase stack remains optional and requires a Docker-compatible runtime, which is not currently installed on this PC.

Supabase Auth is the only password processor and credential store. AkiPasa validates password strength before submission but never stores, transforms, logs, or receives password hashes. Google OAuth uses a dedicated Google Cloud project and remains feature-gated until its consent policy and Supabase provider credentials are completed.
