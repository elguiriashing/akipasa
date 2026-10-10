# Google Workspace transactional email rollout (2026-10-10)

## Scope

The AkiPasa Cloudflare Worker claim decision, business booking confirmation and AkiDuermo accommodation confirmation outboxes now route through Gmail API, using the existing protected SQL queues, approval authorization, localized templates and private recipients. No replay of previous blocked mail. **This branch is not production-ready until CI and real delegated Gmail authorization pass.**

This is a Gmail API sending integration, not a replacement for Cloudflare hosting or Supabase Auth's separately configured SMTP transport. Supabase Auth email (signup, verification, password reset and magic links) requires its own SMTP configuration or an independently implemented custom email hook. AkiHQ and automation services must be audited separately for any other sending transports.

## One-time Google setup (admin required)

1. Ensure Workspace billing and Gmail are active for `alex@akipasa.com`.
2. In Google Cloud, create a dedicated service account in a controlled project and enable the Gmail API. The service account's OAuth **numeric client ID** is used for domain-wide delegation.
3. As Workspace super administrator, go to Security → Access and data control → API controls → Domain-wide delegation, and authorize that numeric client ID **only** for `https://www.googleapis.com/auth/gmail.send`. Google recommends keeping this privilege narrow and auditing delegated service accounts.
4. Provision Worker **production** secrets `GOOGLE_WORKSPACE_CLIENT_EMAIL` (service account email) and `GOOGLE_WORKSPACE_PRIVATE_KEY` (PEM private key); set variable `GOOGLE_WORKSPACE_SENDER=alex@akipasa.com`. Never put secrets in GitHub, chat, public env variables or browser code.
5. Deploy a CI-verified application version, inspect `/api/bookings/release` claim readiness status, then submit one controlled new claim and booking decision to a verified test mailbox. Verify Gmail Sent and inbox reception, queue status and provider ID. Do not infer acceptance from configured=true.
6. Plan key rotation and revoke unused service-account keys. Remove old Resend secrets _only after_ every sending surface, including Supabase Auth SMTP and AkiHQ, is independently migrated.

## Safety

Gmail API does not accept Resend-style idempotency keys. On an ambiguous send or timeout, hold the message for human review rather than automatically replaying it. Do not requeue previously blocked real recipients. Existing SQL queues and leases remain the authority, and policy access stays unchanged. Gmail is subject to Workspace sending limits. The current shared sender is `Alex at AkiPasa <alex@akipasa.com>`; other sender addresses would require approved aliases.
