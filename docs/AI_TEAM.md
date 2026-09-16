# AI Team operations

Last updated: 2026-08-11.

## Architecture

The administrator-only AkiHQ CRM `#/crm/ai-team` workspace is the primary
control plane for six seeded employees: Manager, Marketing, Sales, Research,
Support, and Analyst. The main-site `/{locale}/admin/ai-team` dashboard
remains available as a secondary control plane. Supabase stores agent
configuration, permissions, memory, chat, tasks, handoffs, approvals, schedules,
activity, and usage. The Next.js Worker is the only AI gateway and the only
place provider credentials are read.

The CRM browser sends its Supabase access token only to the AkiHQ integration
Worker. That Worker rechecks the Administrator role and reaches the main AI
gateway through a private Cloudflare service binding. A shared, generated
`AI_CRM_PROXY_SECRET` authenticates the internal hop; it is a Worker secret on
both services and is never returned to the browser. Same-origin main-site
requests continue to use the normal session. Provider adapters live behind
`AIProviderAdapter`; each agent stores its provider and model so a future
adapter can be added without changing either dashboard or the database model.

Before every CRM chat, AkiHQ synchronizes the current workspace snapshot.
Agents can inspect the workspace, search and retrieve CRM records, and create
internal CRM tasks. Creating or changing companies, contacts, leads, or deals
always enters the approval queue and does not execute until an Administrator
approves the exact stored arguments.

Approved tools are registered in `src/lib/ai-team/tools.ts`. The gateway sends
an agent only the tools covered by its permission list. Sensitive tools create
an `ai_approvals` row and return without executing. An Administrator must approve
the exact stored arguments in the dashboard before the executor can run them.

## Budget and rate limits

`reserve_ai_budget` locks the singleton budget settings row, releases stale
reservations, enforces per-minute, per-hour, and concurrent limits, and reserves
the worst-case configured token cost before a provider request is sent. The
default monthly hard cap is **EUR 4.00**. Paid calls are rejected when the next
reservation would cross the cap. Completed usage replaces the reservation with
the token-based estimate; failures retain the conservative reservation cost.

Pricing must exist in `ai_model_pricing` before a model can run. The
`gpt-5.6-luna` estimate is EUR 0.20/M input tokens and EUR 1.20/M output
tokens, matching its OpenAI list price checked on 2026-08-11 with a conservative
1:1 USD/EUR accounting assumption. Update this table when assigning another
model or changing the exchange-rate assumption.

## Scheduled and delegated work

The existing `akipasa-automation` Worker wakes every five minutes. Its
`PUBLIC_APP` service binding calls the internal schedule route without crossing
the public Internet. A shared `AI_SCHEDULER_SECRET` is still checked as defense
in depth. The main Worker claims at most three due schedules or queued assigned
tasks with `FOR UPDATE SKIP LOCKED`; each claimed job uses the same gateway,
tools, rate limits, and hard budget as operator chat. Completed or failed
specialist tasks automatically create a handoff to the Manager.

## Setup (after migration)

Apply migrations `0034_ai_team.sql` through
`0039_ai_model_pricing_refresh.sql` in order through the normal reviewed
Supabase migration process. Then set secrets interactively; never place values
in a command argument or Wrangler configuration:

```powershell
# Main Next.js Worker
npm run ai:key:set
npx wrangler secret put AI_SCHEDULER_SECRET

# Automation Worker (use the same scheduler secret)
Set-Location automation
npx wrangler secret put AI_SCHEDULER_SECRET
```

`npm run ai:key:set` opens Wrangler's masked secret prompt and uploads the
value directly to Cloudflare. The key is not written to `.env`, source
control, application logs, browser storage, or client JavaScript. Redeploying
with `--keep-vars` preserves the stored secret.

`SUPABASE_SERVICE_ROLE_KEY` must already be configured on the main Worker for
the current Stripe webhook; the AI gateway reuses that server-only client.
Deploying or applying production migrations remains a manually approved release
operation.

## Adding an agent, tool, or provider

- Agent: insert a row in `ai_agents` with explicit instructions and permission
  strings; no code change is needed when existing tools/providers are enough.
- Tool: add one registry definition, a strict schema, a permission string, and
  its bounded implementation. Mark externally visible or destructive behavior
  as approval-required.
- Provider: implement `AIProviderAdapter`, select it in `createAIProvider`, add
  the encrypted server secret, and add a pricing row before enabling calls.
