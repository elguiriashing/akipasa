# AkiPasa Ecosystem — Email Catalogue & Delivery Contract
Date: 11 October 2026 · Status: template implementation branch, not yet production deployment

## Verified existing source paths
- Venue claim submission: `src/app/[locale]/business/actions.ts`; staff alert outbox `claim_submission_alerts` and `src/lib/claim-alert-delivery.ts`.
- Claim approval/denial: `src/lib/claim-decision-email.ts`, `src/lib/claim-mail-delivery.ts`.
- AkiPasa event/venue bookings and AkiDuermo reservation confirmation: `src/lib/booking-confirmation-email.ts`, `src/lib/booking-mail-delivery.ts`; current booking sender defaults to `contact@akipasa.com`.
- Password and OAuth signup: `src/app/[locale]/auth/actions.ts`, `src/app/[locale]/auth/callback/route.ts`. Locale is captured for password signup; OAuth and first portal access require durable first-use markers to avoid duplicate welcomes.
- Cancellation: `src/app/[locale]/account/bookings/actions.ts`, `src/app/akiduermo/bookings/actions.ts`.
- Scheduled processing: `custom-worker.ts` has a recurring handler and existing queue dispatch.
- AkiHQ is a separate repository, `elguiriashing/akihq`. Cross-repository welcome requires an AkiHQ-side event/first-workspace login integration.

## Requested messages (EN + ES, except internal staff)
| Key | Trigger | Recipients | Critical condition | State |
|---|---|---|---|---|
| claim_received | New ownership claim accepted by database | Claimant | Send once per claim, locale of submission | Template prepared; event hook pending |
| claim_staff | New ownership claim | Both cofounders | English only; protected review link; no evidence in email | Existing trigger/worker exists, sender needs changing |
| welcome_akipasa | First verified account creation | New account | One per user and portal; OAuth + password; not each login | Template prepared; event hook pending |
| welcome_akiduermo | First entry to AkiDuermo | Account | One per portal, respect first-entry locale | Template prepared; event hook pending |
| welcome_akibusiness | First business onboarding/login | Business account | One per portal; no false claim approval | Template prepared; event hook pending |
| welcome_akihq | First AkiHQ workspace onboarding/login | AkiHQ account | Separate AkiHQ repository event | Template prepared; event hook pending |
| event_booking_confirmed | Booking status becomes confirmed | Customer | Do not send on request only; include exact details | Existing confirmation pipeline; sender migration pending |
| event_saved_reminder | Saved event 48h away | Saver | Event still published; saved; not already booked; opt-out | Template prepared; scheduler pending |
| stay_booking_confirmed | Accommodation reservation confirmed | Guest | Actual confirmed status; never mere request | Existing confirmation pipeline; sender migration pending |
| stay_saved_reminder | Stay saved 5 days ago | Saver | Still saved, no reservation, one reminder, marketing consent | Template prepared; scheduler pending |
| stay_cancelled | Reservation status changes to cancelled | Guest | One per transition; no unsupported refund claims | Template prepared; event hook pending |
| booking_cancelled | Event/venue booking cancelled | Customer | One per transition | Template prepared; event hook pending |

## Additional beneficial notifications
| Key | Trigger | Safety |
|---|---|---|
| business_team_invite | Staff membership invite | Do not grant access before invitation accepted |
| business_claim_approved | Staff approval | Only after audited ownership grant |
| business_claim_denied | Staff denial | Provide resubmission guidance, no leaked staff notes |
| payment_receipt | Confirmed Stripe payment | Never infer payment from client redirect; not fiscal invoice |
| security_email_changed | Verified email change | Notify old and new addresses through secure workflow |

Further recommended future work (not yet in templates): upcoming reservation reminders, booking changes/reschedules, booking request received (clearly pending), failed payment/dunning, subscription renewal/cancellation, team access revoked, support ticket created/replied/closed, business venue published/unpublished, event moderation decision, booking no-show, security password changed, AkiHQ staff invite and PoS daily-close digest. Avoid mailing raw customer data or fiscal receipts from PoS until compliance is verified.

## Implementation rules
1. All emails originate from `AkiPasa Support <support@akipasa.com>` after domain verification and application secret configuration.
2. Transactional email only for actual state changes; saved-item reminders require opt-in and unsubscribe/preference handling. Do not send a marketing reminder merely because someone saved an item.
3. Durable outbox + idempotency key = (event, entity, recipient, locale/version). Worker retries transient failures, records provider ID, and holds ambiguous outcomes for reconciliation.
4. Locale determined at source event, persisted with the outbox; never inferred from a later visit. Internal staff alert always English.
5. Do not send welcome on every login; use an atomic first-portal-entry marker. Shared identity does not imply the person visited all four apps.
6. For cancelled bookings do not claim a refund; include refund status only when independently confirmed.
7. Verify recipient identity, verified email, authorization, consent, and link origin; no PII in logging or public queue endpoints.
8. Tests: render all EN/ES templates, validate safe links and escaping, run unit/database/CI, deliver test previews to the owner's test inbox, then verify provider status and Gmail receipt before production rollout.

## Preview
Templates are in `src/lib/lifecycle-email-templates.ts` on `feature/unified-lifecycle-emails-20261011`. Preview messages must be labelled TEST and use dummy references; they must never be sent as real booking or claim confirmations.

## Deployment status
The template registry is committed to a feature branch. It is NOT connected to all event triggers, has NOT passed CI, and has NOT been merged to live. The user-requested full implementation remains pending further backend and cross-repository integration.
