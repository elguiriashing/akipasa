# AkiSuite · Email Notification Catalogue and Delivery Map
**Release candidate:** 11 October 2026 · **Sender:** AkiPasa Support <support@akipasa.com> · **Languages:** EN / ES unless noted

## Delivered in this release
| Email | Trigger and customer expectation | Language | Responsible service |
|---|---|---|---|
| **Claim received** | A signed-in user submits a pending venue or accommodation ownership claim. Support will review and contact them. Not an approval. | Claim submission locale | `venue_claims` insert -> suite outbox |
| **New claim to staff** | Notify alex@akipasa.com and andrew@akipasa.com; English and a direct authenticated Moderation button. | English only | Existing `claim_submission_alerts` trigger, Support sender |
| **Claim approved** | Staff-approved and audited transfer; introduction to business tools. | Account preferred locale | Existing claim decision outbox |
| **Claim rejected** | Staff denial with actual reason and how to resubmit; no implicit approval. | Account preferred locale | Existing claim decision outbox |
| **AkiPasa welcome** | Verified new user, first authenticated AkiPasa access, one per account. Excludes pre-release accounts. | First login locale | Suite welcome RPC |
| **AkiDuermo welcome** | First verified AkiDuermo portal access, one per account. | First login locale | Suite welcome RPC |
| **AkiBusiness welcome** | First verified AkiBusiness entry. Explains venue claims, management, media, events, promotions and teams. | First login locale | Suite welcome RPC |
| **AkiHQ welcome** | First authorised AkiHQ workspace login. Explains CRM, support, PoS, orders, team chat and inventory. | App locale | AkiHQ PR #24 + shared welcome RPC |
| **Event / venue booking request received** | Request created, explicitly **not confirmed yet**. | Booking locale | Booking request trigger |
| **Confirmed event / venue booking** | Venue manager confirms reservation. Uses real slot, venue, guests and reference. | Booking locale | Existing confirmed-booking outbox |
| **Event / venue booking cancelled** | Actual booking status transition to cancelled. | Booking locale | Cancellation trigger |
| **AkiDuermo reservation request received** | Guest requests a stay; clearly awaiting confirmation. | Reservation locale | Accommodation request trigger |
| **AkiDuermo booking confirmed** | Owner confirms stay, real check-in/out dates and reservation reference. | Reservation locale | Existing accommodation confirmation outbox |
| **AkiDuermo reservation cancelled** | Genuine cancellation; does **not** claim refund settled. | Reservation locale | Cancellation trigger |
| **Saved event reminder (2 days)** | Saved, published event has real upcoming occurrence roughly 48h away, still saved, no booking, customer opted in. | Saved/account locale | Five-minute cron, consent checks and current event state |
| **Saved stay reminder (5 days)** | Signed-in customer saved stay for at least five days, still saved, no reservation, opted in. | Saved/account locale | Server-backed stay bookmarks and scheduler |

## Important account and consent rules
- Customer email is taken from the currently verified authenticated account. Saved-item emails are opt-in, OFF by default, and checked again just before delivery. Anonymous AkiDuermo browser bookmarks cannot trigger email.
- Persistent job keys prevent repeated sends across page refreshes, callbacks, cron runs and multiple devices. The provider's acceptance ID is recorded before declaring a job sent.
- Emails originate from support@akipasa.com; these are application sends via Resend, not Google Workspace outbound SMTP. Inbox receipt through Google Workspace needs no Workspace API connector.
- No historical claim or booking jobs are backfilled, and no previously blocked customer decision is replayed automatically.
- The Cloudflare production worker must have a sending-authorised Resend key and correct Supabase credentials. Previous live claim jobs returned **403**; direct Resend sample success is not proof that the deployed worker's key is valid.
- Approval, cancellation, charging, and venue ownership are never inferred from email content.

## More useful emails to consider next
| Feature | Recommendation | Guardrail / next dependency |
|---|---|---|
| Booking rescheduled | Email both customer and venue with old/new times | Actual accepted modification event |
| Booking approaching | Optional day-before time, address and check-in details | Valid confirmed booking and timezone |
| Refund issued | Confirm refund amount and payment reference | Stripe-confirmed refund, never an assumption |
| Payment or subscription failed | Explain retry route, keep account access rules accurate | Stripe webhook and billing privacy |
| Subscription renewal/cancelled | Receipt or cancellation notice | Verified Stripe event, legal invoicing separate |
| Business team invite/revocation | Invite, permission changed, or removal | Authoritative access events, no exposed secrets |
| Support ticket opened/replied/resolved | Acknowledge and link to support thread | CRM support events and email opt-out where relevant |
| Venue / event published, rejected | Update business owner on publication decision | Moderation audit, do not mislead about indexing |
| Business listing claim needs more evidence | Customer instructions and secure evidence portal | Proper moderated state/request workflow |
| AkiHQ trading day ended | Manager digest for sales, cash variance and staff | Trading-day snapshot, opt-in, not fiscal invoices |
| AkiHQ printer/PoS outage | Manager alert only for persistent incident | Device health system, rate limiting |
| Account email/password changed | Security notice to verified old/new address | Confirmed Auth event, anti-phishing |
| Payout issued | Business payment notice | Payment provider payout confirmation |
| Venue availability modified | Notify impacted confirmed bookers | Actual change and recipient impact detection |

## Testing and release
An earlier gallery of **31 AkiSuite sample emails (EN/ES)** plus **33 supplementary previews** was sent to alexashing1@gmail.com and independently found in Gmail. Resend marked all 64 delivered. No need to resend the same samples. Those previews validate HTML and delivery through the connected Resend account, not worker event triggers.

Integration source: `feature/akisuite-email-release-reconciled-20261011`, PR #105. AkiHQ integration: PR #24. Database: `supabase/migrations/20261011013000_suite_emails.sql`. All deployed status must be verified independently.
