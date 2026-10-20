# Operating subscriptions and identity deletion

## Concrete compatibility repair

The existing account-deletion request remains an administrator-managed process. Completion requires confirmed external identity deletion and an absent linked profile (`update_deletion_request`). No new deletion authority or automatic Stripe mutation is introduced.

Read-only live constraint inspection on 20 October 2026 found two new private operating billing links using `NOT NULL REFERENCES profiles ... NO ACTION`. Auth identity deletion cascades into profiles and therefore fails for those customers. The private individual tool-limit composite FK also blocked deletion through cascading workspace membership cleanup. The existing workspace owner reference already uses `ON DELETE SET NULL` and membership uses `ON DELETE CASCADE`.

Migration `20261020185200` makes checkout and subscription profile links nullable with `ON DELETE SET NULL`, and removes obsolete individual restrictions when their membership is deleted. Ephemeral upload reservations cascade with their actor; existing published media is not removed by this change. It preserves the workspace, Stripe customer/subscription identifiers, paid business data, billing events and financial audit evidence. This detachment is pseudonymisation of the local identity link, **not full anonymisation**: retained provider references and historical audit evidence may still be personal data.

The sole signed Stripe webhook handles a durable detached binding as terminal without applying paid grants, creating referral attribution, falling through to legacy billing, or accepting a replacement identity from Stripe metadata. Recovery excludes detached rows; an in-flight lease also fails closed. The billing SQL rejects a null profile and rejects rebinding a detached subscription to a new workspace owner. An identity deletion race after fetching a binding fails closed; retry sees the detached binding.

## Acceptance and operating limits

Disposable PostgreSQL tests reproduce the old FK denial, then delete a fixture Auth identity inside a rolled-back transaction. They verify detached links, cleared permissions, retained business/audit rows, no recovery jobs, no null-profile grants and no replacement-owner rebinding. Adapter tests cover metadata attempts, pre-renewal legacy bindings without workspace metadata, and an in-flight recovery race. No production customer was deleted or changed during validation.

Deploy adapter handling before or with the migration. Detached-identity handling remains available with paid billing activation disabled; that setting still prevents attached-subscription grants. Older schemas lacking the binding RPC retain their legacy path while rollout is disabled, while other database failures retry without falling through. The change does not cancel, refund, transfer, or restart any subscription. When an owner requests deletion, the existing human deletion process must also review ongoing billing, business ownership/continuity and any provider-side personal data before closing the request. An active detached subscription can continue charging at Stripe until the authorised billing workflow resolves it; ACKing its webhook does not claim cancellation. No retention duration, tax obligation or automatic erasure exemption is invented here: accounting/legal must map the retained fields and evidence to applicable lawful retention and erasure requirements.

An unrelated existing `privacy_private.marketing_outbox.actor_id` uses a profile FK with NO ACTION. That baseline can separately block deletion of a recorded marketing operator; this patch does not silently rewrite its retention policy. The new owner inbox recipient FK was independently repaired to CASCADE. Neither exception should be represented as universal deletion acceptance.

Rollback the adapter only while the schema still prevents detached identities; once an identity has been deleted, retain detached handling. Do not restore NOT NULL or reattach identities from metadata, and never delete business/audit rows to satisfy the old FK.
