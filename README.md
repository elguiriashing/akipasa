# AkiPasa

Mobile-first bilingual discovery, venue and loyalty platform covering Spain.

## Local setup

1. Install Node.js 22 or newer.
2. Run `npm install` (or `npm.cmd install` when PowerShell script execution is restricted).
3. Copy `.env.example` to `.env.local`; fixture mode needs no values.
4. Run `npm run dev` and open `http://localhost:3000`.
5. Run `npm run check` before handing off changes.

The default `fixtures` provider uses deterministic fictional public content. Authentication and business publishing use the connected Supabase project.

The location selector covers every Spanish province through representative city centres, plus Costa neighbourhoods. Venue records store exact coordinates and are not limited to those centres.

### Local database fixtures

After applying the migrations to a local PostgreSQL/PostGIS database, set
`AKIPASA_LOCAL_DATABASE_URL` to its connection URL and run:

```powershell
npm run db:seed:local
npm run db:reset:local
```

These commands accept only `localhost`, `127.0.0.1` or `::1`. Remote and
Supabase-hosted database URLs are rejected before a connection is opened.
Seeding replaces only stable AkiPasa demonstration IDs in a transaction; reset
removes only the exact demo venue, event and occurrences owned by the seed.

Operational release, rollback and recovery steps are in `docs/RUNBOOK.md`; acceptance evidence is tracked in `docs/ACCEPTANCE.md` and `docs/STATUS.md`.

The production-safe, rollback-only database integration suite is
`database/tests/acceptance.sql`. Run it from the Supabase SQL editor after
database changes; a passing run returns `ok = true` and leaves no QA data.

## Account roles

Every public sign-up starts as a **User** (`consumer`). Venue owners and managers are promoted to **Business** (`organiser`) automatically. **Staff** (`moderator`) can operate moderation queues; **Administrator** accounts can additionally manage platform roles. Privileged role changes are admin-only, cannot be applied to oneself, require a reason, and are written to the moderation audit log. User account data includes saved events, followed venues, recent views, and access to passports.

## Production

The app is packaged for Cloudflare Workers with OpenNext and served at `https://akipasa.com`. Run `npm run preview:cloudflare` for a Worker-compatible preview and `npm run deploy:cloudflare` for an authorized production release. Cloudflare configuration is versioned in `wrangler.jsonc`; credentials stay outside the repository.
