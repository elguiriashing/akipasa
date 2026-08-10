# Repository guidance

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
