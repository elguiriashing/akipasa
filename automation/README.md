# AkiPasa Voice Automation Platform

An isolated Cloudflare Worker for authenticated voice-triggered business
automation. It is intentionally separate from the public AkiPasa web Worker.

## Request flow

```text
Google Assistant / Tasker
  -> signed HTTPS POST /voice
  -> HMAC + timestamp + device validation
  -> D1/KV replay protection
  -> generated command registry
  -> typed business service
  -> Telegram Bot API
  -> D1 execution and report audit
```

Telegram group commands follow a second authenticated entry path:

```text
Telegram group slash command
  -> POST /telegram/webhook
  -> Telegram secret-token + configured-group validation
  -> D1/KV update replay protection
  -> shared command registry
  -> Telegram reply + D1 execution audit
```

## Security contract

`POST /voice` accepts:

```json
{
  "command": "send-investor-update",
  "device": "alex-phone",
  "timestamp": "2026-07-27T09:00:00.000Z",
  "nonce": "a-unique-cryptographic-value",
  "signature": "v1=<64 lowercase hex characters>",
  "payload": {}
}
```

The canonical HMAC input is:

```text
v1
POST
/voice
<normalized command>
<device>
<timestamp>
<nonce>
<sha256 of stable payload JSON>
```

Security properties:

- Requests outside `COMMAND_MAX_AGE_SECONDS` are rejected.
- Device IDs must be listed in `ALLOWED_DEVICE_IDS`.
- HMAC-SHA256 is verified through Web Crypto.
- D1's `(device_id, nonce)` primary key provides authoritative replay
  protection; KV provides a fast edge rejection cache.
- Request bodies are limited to 16 KiB.
- Every accepted request attempt gets an execution audit row before routing.
- Voice failures do not expose internal details.
- Dashboard authentication uses a separate password and signed, short-lived,
  HttpOnly, Secure, SameSite=Strict session.
- The Telegram webhook requires Telegram's secret-token header, accepts only
  the configured group, and reserves each `update_id` before execution.

## Commands

Command files live in `src/commands`. Each default export implements
`AutomationCommand`. The generated registry is rebuilt before development,
tests, type checks, and deployment, so adding a command requires only a new
command file.

Current commands:

- `send-telegram-test`
- `send-investor-update`
- `show-expenses`
- `show-revenue`
- `automation-status`

The phrase `send the boys the numbers` is an alias of
`send-investor-update`.
The phrase `test the bot` is a non-financial end-to-end delivery command for
first production acceptance.

Telegram group commands:

- `/help` or `/commands`: show the command menu.
- `/numbers`: send the investor update.
- `/revenue`: show 30-day revenue, MRR, and net.
- `/expenses`: show 30-day expenses and burn.
- `/status`: check Worker and D1 health.
- `/test`: send a labelled Telegram connection test.

Commands addressed as `/status@akipasabot` are also accepted.

## Financial data

The Worker never invents financial values. D1 stores:

- current cash and MRR snapshot
- revenue entries
- expense entries
- execution logs
- generated reports
- replay nonces
- future queued jobs

The foundation migration inserts only an unconfigured zero-value company
shell. Investor reporting fails with `metrics-not-configured` until an
operator writes a current `as_of` value and real financial records.

Amounts are integer minor currency units. For EUR, `482000` means EUR 4,820.

## Local setup

```powershell
Copy-Item .dev.vars.example .dev.vars
npm.cmd install
npm.cmd run cf-typegen
npm.cmd run dev
```

Apply local migrations:

```powershell
npx.cmd wrangler d1 migrations apply akipasa-automation --local
```

Populate real local test data with `wrangler d1 execute --local --command`.
Do not commit exports or financial records.

Send a signed local request:

```powershell
$env:AKIPASA_AUTOMATION_URL='http://127.0.0.1:8787'
$env:AKIPASA_DEVICE_ID='alex-phone'
$env:AKIPASA_SIGNING_SECRET='<same value as .dev.vars>'
node scripts/send-voice-request.mjs send-investor-update
```

## Production provisioning

Provisioning creates new Cloudflare resources and requires explicit operator
approval.

1. Rotate the Telegram token that was exposed before this implementation.
2. Create `akipasa-automation` D1 and a replay KV namespace.
3. Record their real IDs in `wrangler.jsonc`.
4. Apply D1 migrations remotely.
5. Configure the following with `wrangler secret put`:

   - `SIGNING_SECRET`
   - `DASHBOARD_PASSWORD`
   - `DASHBOARD_SESSION_SECRET`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `TELEGRAM_WEBHOOK_SECRET`

6. Replace `ALLOWED_DEVICE_IDS` with the production device IDs.
7. Load current company metrics, revenue, and expenses. Zero values are valid
   when they truthfully represent the current position.
8. Run `npm run check`.
9. Deploy with `npm run deploy`.
10. Register `/telegram/webhook` with Telegram using the same webhook secret
    and publish the slash-command menu with `setMyCommands`.

The Telegram web group URL is not a Bot API chat ID. Add the rotated bot to
the group, send a message, and inspect `getUpdates` locally to obtain the
numeric `message.chat.id`. Never commit that API response because it can
contain personal message data.

## Command Centre

The separately authenticated operator interface has three focused pages:

- `/dashboard`: success, latency, pending jobs, Telegram readiness, last report,
  and Worker/D1 health.
- `/dashboard/commands`: icon-led command catalogue generated from command
  metadata.
- `/dashboard/activity`: recent voice and operator execution audits.

Each command has a detail screen. Read-only commands can be run directly;
external commands require an explicit confirmation page and authenticated
same-origin POST. Operator runs use the same command implementation and D1
execution audit as voice requests, but not voice HMAC credentials.

Render the command catalogue without starting a Worker:

```powershell
npm.cmd run preview:command-hub
```

The ignored output is written under `.wrangler/previews`.

`/health` is intentionally public and returns only service health, version,
and timestamp. It cannot execute commands or expose configuration.

## Retention

The daily scheduled handler expires replay nonces and removes old logs/reports
using `EXECUTION_LOG_RETENTION_DAYS` and `REPORT_RETENTION_DAYS`. Execution
rows referenced by retained reports are preserved.
