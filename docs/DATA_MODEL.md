# Data model

Canonical events own translated content and have many timestamped occurrences. Venues belong to cities and have members, claims, and media. Consumer actions include saves, follows, reports, check-ins, append-only XP/stamp/redemption ledgers, and passport progress. Operations include moderation actions, promotion requests, analytics events, and labelled feature slots. Privileged rows require server authorization and PostgreSQL row-level security.

Paid membership is derived from active Stripe subscriptions or audited staff
grants. `profiles.membership_tier` and `profiles.business_plan_active` are
webhook-maintained projections for presentation and routing; billing rows
remain authoritative. Stripe subscription events carry monotonic event time so
late webhook deliveries cannot restore stale access. Premium offer visibility
and Business venue operations are also enforced by RLS/RPC authorization.

Premium check-ins award 20 XP instead of 10 while keeping stamps at one, so a
paid plan does not accelerate redeemable loyalty value. Offers declare a
`public` or `premium` audience. Premium calendar exports are generated on
authenticated, entitlement-checked routes and do not create durable calendar
data.

Accounts use four product-facing platform roles: User (`consumer`), Business (`organiser`), Staff (`moderator`) and Admin (`administrator`). These are deliberately separate from venue membership roles (`owner`, `manager`, `editor`): a business team member receives permissions only for the venues they belong to, while platform Staff receives moderation access without inheriting business ownership. Admin inherits User, Business and Staff capabilities and can manage any venue through server-side row-level policies. Public signup always starts as User; an active Business payment or audited grant promotes that profile to Business, while Staff and Admin roles remain privileged operator grants.

Profiles store paired `terms_version` and `terms_accepted_at` evidence. The
database requires both values or neither, and clients may directly update only
display name and preferred locale. Current Terms acceptance uses a dedicated
authenticated RPC.

`account_deletion_requests` retains the operational request after the linked
profile is removed. Administrator-only processing records state, resolution,
operator and time and appends a moderation audit action. A request cannot be
completed while the linked profile still exists or without explicit
identity-deletion confirmation.

Community suggestions remain separate from canonical events in `event_submissions`, carry an explicit review state, and may be linked to a duplicate canonical event. Reports use constrained target/reason/state values. Moderator decisions are made through role-checked database functions and append immutable `moderation_actions`; the application does not perform anonymous direct status changes.

Database triggers limit authenticated community suggestions to 5/hour and
20/day and reports to 10/hour and 30/day. Supporting identity/time indexes keep
these checks bounded without relying on browser state.

`feature_flags` stores the small set of public operational switches. Only
Administrator RPCs can change them; each update requires a reason and appends a
`moderation_actions` record. Database triggers enforce disabled community
submissions, loyalty check-ins and promotion requests independently of the UI.
Category and city catalogue writes likewise use audited Administrator-only RPCs.
