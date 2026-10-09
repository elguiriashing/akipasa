# Repository guidance

## REQUIRED: AkiPasa master system contract

Before inspecting or modifying ANY AkiPasa application code, read **all** of `docs/AKIPASA_MASTER.md` and the relevant sections of `docs/CHANGE_IMPACT_REGISTER.md`. Before touching a feature, trace its cross-portal, locale, role, database, API, storage, analytics, deployment and test dependencies. Update the master contract and append a verified change-impact entry in the same pull request. Do not merge a behavior change without regression evidence; missing checks must be explicitly reported, never assumed to pass. The master contract is a living index, not a substitute for reading the current code. Follow the stricter deployment approval requirements below.


## Layout

- `src/app`: localized routes and server endpoints.
- `src/components`: UI only; business rules live in `src/lib`.
- `src/lib`: domain, providers, validation, permissions, and services.
- `database`: reversible migrations and deterministic local test setup.
- `tests`: unit, integration, and critical browser tests.
- `docs`: the product and operational contract.

## Commands

On Windows use `npm.cmd` if PowerShell blocks `npm.ps1`. Run `npm run check` before handoff. Use `npm run test:e2e` for browser acceptance.

## Conventions and safety

- Store UTC instants and render in the venue IANA time zone (`Europe/Madrid` by default).
- Validate all external input with Zod and authorize every mutation server-side.
- Keep maps, storage, authentication, analytics, email, and ticketing behind interfaces.
- Never add secrets, real personal data, unlicensed media, fake popularity, or unlabelled sponsorship.
- Never deploy, create paid resources, contact people, or mutate linked/production data without approval.
- Reward-producing operations must be transactional and idempotent.

## Definition of done

Behavior is done only when its automated checks pass, the result is inspected, documentation is current, and remaining limitations are explicit.

## Public-site deployment source

The public site deploys from `master`. Fetch its latest tip before starting.
The September 2026 redesign previously lived on
`agent/ai-team-spain-address-search`; deploying the older master tree caused a
UI regression. Keep the reconciliation documented in `docs/deployment-source.md`.
Do not replace the current discovery, membership or business screens with older
branch copies. `main` is the CRM source, not the public site. Before accepting a
deployment, verify the CityDiscovery homepage and the new route on the live host.
