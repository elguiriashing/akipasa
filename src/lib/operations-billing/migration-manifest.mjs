import { createHash } from "node:crypto";
import {
  OPERATION_PRICES,
  objectId,
  validTools,
} from "./operations-contract.mjs";
const digest = (value) => createHash("sha256").update(value).digest("hex");
const active = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "paused",
  "incomplete",
]);
const iso = (value) =>
  Number.isSafeInteger(value) && value > 0
    ? new Date(value * 1000).toISOString()
    : null;
function deterministicRequest(subscription, profile) {
  const h = digest(`aki-operations-migration-v1:${subscription}:${profile}`);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
/** Offline only: no Stripe calls, no SQL writes, no executable apply mode. */
export function buildMigrationManifest(input) {
  if (
    input?.version !== 1 ||
    !Array.isArray(input.legacy) ||
    !Array.isArray(input.subscriptions) ||
    !Array.isArray(input.scopes)
  )
    throw Error("Versioned complete snapshots required");
  if (input.complete !== true)
    throw Error("Pagination-complete snapshots required");
  const snapshotTime = Date.parse(input.snapshotAt);
  if (!Number.isFinite(snapshotTime)) throw Error("Snapshot time required");
  const scopeKeys = input.scopes.map(
    (s) => `${s.profileId}:${s.subscriptionId}`,
  );
  if (new Set(scopeKeys).size !== scopeKeys.length)
    throw Error("Duplicate explicit scopes");
  const ids = new Set();
  const workspaces = new Set();
  const customers = new Map();
  const rows = input.legacy.map((row) => {
    if (
      !/^sub_[A-Za-z0-9]+$/.test(row.subscriptionId) ||
      ids.has(row.subscriptionId)
    )
      throw Error("Duplicate or invalid legacy subscription");
    ids.add(row.subscriptionId);
    if (row.plan === "premium")
      return {
        subscriptionId: row.subscriptionId,
        action: "preserve_personal_premium",
        changes: [],
      };
    if (!["business", "business_pro"].includes(row.plan))
      throw Error("Unknown legacy plan");
    const blockers = [];
    const matches = input.subscriptions.filter(
      (s) => s.id === row.subscriptionId,
    );
    const s = matches[0];
    const scope = input.scopes.find(
      (scope) =>
        scope.profileId === row.profileId &&
        scope.subscriptionId === row.subscriptionId,
    );
    if (matches.length !== 1 || !s)
      blockers.push("stripe_snapshot_missing_or_duplicate");
    if (!/^[-a-f0-9]{36}$/i.test(row.profileId || ""))
      blockers.push("invalid_profile");
    if (!scope || scope.approved !== true)
      blockers.push("explicit_operating_scope_required");
    const items = s?.items?.data || [];
    const item = items[0];
    const customer = objectId(s?.customer);
    if (!customer || customer !== row.customerId)
      blockers.push("customer_mismatch");
    if (
      customer &&
      customers.has(customer) &&
      customers.get(customer) !== row.profileId
    )
      blockers.push("customer_profile_conflict");
    else if (customer) customers.set(customer, row.profileId);
    if (!s || s.status !== "active")
      blockers.push("subscription_not_currently_active");
    if (items.length !== 1 || item?.quantity !== 1 || s?.items?.has_more)
      blockers.push("unsupported_subscription_items");
    if (
      !Array.isArray(input.legacyPriceIds) ||
      !input.legacyPriceIds.includes(objectId(item?.price))
    )
      blockers.push("legacy_price_unverified");
    if (
      s?.pending_update ||
      s?.schedule ||
      s?.cancel_at_period_end ||
      s?.cancel_at ||
      s?.pause_collection
    )
      blockers.push("existing_lifecycle_change_requires_review");
    if (s?.metadata?.profile_id && s.metadata.profile_id !== row.profileId)
      blockers.push("metadata_profile_mismatch");
    if (
      input.subscriptions.some(
        (other) =>
          other.id !== s?.id &&
          objectId(other.customer) === customer &&
          active.has(other.status) &&
          other.items?.data?.some((i) =>
            input.legacyPriceIds?.includes(objectId(i.price)),
          ),
      )
    )
      blockers.push("other_business_subscription_for_customer");
    const paid = s?.latest_invoice;
    const end = item?.current_period_end ?? s?.current_period_end;
    const start = item?.current_period_start ?? s?.current_period_start;
    const paidLine = paid?.lines?.data?.find(
      (line) =>
        objectId(line.subscription_item) === item?.id ||
        line.parent?.subscription_item_details?.subscription_item === item?.id,
    );
    if (!iso(start) || !iso(end) || end <= start)
      blockers.push("invalid_paid_period");
    if (iso(end) && end * 1000 <= snapshotTime)
      blockers.push("renewal_boundary_elapsed");
    if (
      objectId(paid?.customer) !== customer ||
      (objectId(paid?.subscription) ||
        paid?.parent?.subscription_details?.subscription) !== s?.id ||
      (objectId(paidLine?.price) || paidLine?.pricing?.price_details?.price) !==
        objectId(item?.price) ||
      paid?.status !== "paid" ||
      paid?.paid === false ||
      paid?.lines?.has_more ||
      !paidLine ||
      paidLine.period?.end !== end ||
      paidLine.proration === true ||
      paidLine.amount < 0
    )
      blockers.push("paid_through_evidence_required");
    if (scope?.tools && !validTools("basico", scope.tools))
      blockers.push("four_explicit_tools_required");
    else if (!scope?.tools) blockers.push("four_explicit_tools_required");
    if (scope?.workspaceId) {
      if (workspaces.has(scope.workspaceId)) blockers.push("workspace_reused");
      workspaces.add(scope.workspaceId);
      const owned = input.workspaces?.find(
        (w) =>
          w.id === scope.workspaceId &&
          w.ownerProfileId === row.profileId &&
          ["active", "trial"].includes(w.status),
      );
      if (!owned) blockers.push("workspace_owner_snapshot_required");
    } else if (
      typeof scope?.locationName !== "string" ||
      scope.locationName.trim().length < 2 ||
      scope.locationName.trim().length > 120 ||
      /[\u0000-\u001f]/.test(scope.locationName)
    )
      blockers.push("private_location_name_required");
    const requestId = deterministicRequest(row.subscriptionId, row.profileId);
    return {
      subscriptionId: row.subscriptionId,
      profileId: row.profileId,
      customerId: customer || null,
      action: "migrate_same_subscription_at_paid_renewal",
      target: {
        tier: "basico",
        priceId: OPERATION_PRICES.basico.id,
        interval: "month",
        quantity: 1,
        tools: scope?.tools || null,
        listing: "free",
        suggestedInitialTools: ["crm", "tasks", "calendar", "employees"],
        ownerMayConfigureBeforeActivation: true,
      },
      effectiveAt: iso(end),
      preserveUntil: iso(end),
      originalAnchor: iso(s?.billing_cycle_anchor),
      scope: scope?.workspaceId
        ? { workspaceId: scope.workspaceId }
        : {
            provision: {
              rpc: "provision_crm_operations_migration",
              serviceOnly: true,
              invariants: "create_private_operating_location",
              params: {
                p_subscription: row.subscriptionId,
                p_profile: row.profileId,
                p_request: requestId,
                p_name: scope?.locationName?.trim() || null,
                p_evidence: "REPLACE_WITH_REVIEWED_MANIFEST_SHA256",
              },
            },
          },
      schedule: {
        create: { from_subscription: row.subscriptionId },
        idempotencyKey: `aki-renewal-v1:${row.subscriptionId}`,
        requiresReadbackAndInvoicePreview: true,
        proration_behavior: "none",
        chargeNow: false,
        createSubscription: false,
        annualToMonthlyAtExistingExpiry:
          item?.price?.recurring?.interval === "year",
      },
      blockers,
      status: blockers.length
        ? "blocked"
        : scope?.workspaceId
          ? "ready_for_schedule_preview"
          : "requires_private_location_provision",
    };
  });
  const count = rows.filter(
    (r) => r.action === "migrate_same_subscription_at_paid_renewal",
  ).length;
  if (count !== 3)
    throw Error("Expected exactly three approved legacy business migrations");
  const body = {
    version: 1,
    mode: "dry-run",
    snapshotAt: input.snapshotAt,
    rows,
    liveMutations: false,
  };
  return { ...body, manifestSha256: digest(JSON.stringify(body)) };
}
/** Build only after from_subscription readback, preserving its current phase.
 * This is a preview recipe, not an API executor. Unknown fields fail closed. */
export function buildRenewalSchedulePreview(subscription, schedule, row) {
  if (
    row.status !== "ready_for_schedule_preview" ||
    row.subscriptionId !== subscription.id ||
    objectId(schedule.subscription) !== subscription.id ||
    !["active", "not_started"].includes(schedule.status) ||
    schedule.phases?.length !== 1
  )
    throw Error("Single reviewed current schedule phase required");
  const current = schedule.phases[0],
    end = Date.parse(row.effectiveAt) / 1000;
  if (
    current.end_date !== end ||
    current.start_date >= end ||
    subscription.items?.data?.length !== 1 ||
    objectId(current.items?.[0]?.price) !==
      objectId(subscription.items.data[0].price) ||
    current.items?.length !== 1
  )
    throw Error("Schedule no longer matches paid-through snapshot");
  const known = new Set([
    "add_invoice_items",
    "application_fee_percent",
    "automatic_tax",
    "billing_cycle_anchor",
    "billing_thresholds",
    "collection_method",
    "currency",
    "default_payment_method",
    "default_tax_rates",
    "description",
    "discounts",
    "end_date",
    "invoice_settings",
    "items",
    "metadata",
    "on_behalf_of",
    "proration_behavior",
    "start_date",
    "transfer_data",
    "trial_end",
    "trial_settings",
  ]);
  for (const [key, value] of Object.entries(current))
    if (value !== null && value !== undefined && !known.has(key))
      throw Error(`Unreviewed phase property: ${key}`);
  const phase = structuredClone(current);
  phase.items = phase.items.map((item) => {
    const allowed = new Set([
      "price",
      "plan",
      "quantity",
      "tax_rates",
      "metadata",
      "billing_thresholds",
      "discounts",
    ]);
    for (const [key, value] of Object.entries(item))
      if (value !== null && value !== undefined && !allowed.has(key))
        throw Error(`Unreviewed phase item property: ${key}`);
    const copy = {
      ...item,
      price: objectId(item.price),
      quantity: item.quantity ?? 1,
    };
    delete copy.plan;
    if (copy.tax_rates) copy.tax_rates = copy.tax_rates.map(objectId);
    return copy;
  });
  const next = structuredClone(phase);
  next.start_date = end;
  const start = new Date(end * 1000),
    month = start.getUTCMonth() + 1,
    year = start.getUTCFullYear();
  const until = new Date(
    Date.UTC(
      year,
      month,
      Math.min(
        start.getUTCDate(),
        new Date(Date.UTC(year, month + 1, 0)).getUTCDate(),
      ),
      start.getUTCHours(),
      start.getUTCMinutes(),
      start.getUTCSeconds(),
    ),
  );
  next.end_date = until.getTime() / 1000;
  next.billing_cycle_anchor = "automatic";
  next.items = [{ price: row.target.priceId, quantity: 1 }];
  delete next.trial_end;
  delete next.trial_settings;
  next.metadata = {
    ...(phase.metadata || {}),
    profile_id: row.profileId,
    workspace_id: row.scope.workspaceId,
    operations_tier: row.target.tier || "basico",
    operations_migration_manifest: "REPLACE_WITH_REVIEWED_MANIFEST_SHA256",
  };
  phase.proration_behavior = "none";
  next.proration_behavior = "none";
  return {
    scheduleId: schedule.id,
    subscriptionId: subscription.id,
    method: "POST",
    path: `/v1/subscription_schedules/${schedule.id}`,
    previewOnly: true,
    requiresInvoicePreview: true,
    parameters: {
      end_behavior: "release",
      proration_behavior: "none",
      phases: [phase, next],
    },
    createsNewSubscription: false,
    immediateCharge: false,
  };
}
