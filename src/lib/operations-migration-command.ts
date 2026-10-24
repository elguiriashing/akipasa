import { buildRenewalSchedulePreview } from "./operations-billing/migration-manifest.mjs";
import {
  OPERATION_PRICES,
  objectId,
} from "./operations-billing/operations-contract.mjs";
import type { OperationsRecoveryEnv } from "./operations-recovery";
import approvedPricing from "../../config/approved-pricing.json" with { type: "json" };
type Row = Record<string, unknown>;
type Command = {
  command_id: string;
  lease: string;
  subscription_id: string;
  workspace_id: string;
  manifest_sha256: string;
  source_snapshot: Row;
  schedule_id: string | null;
  planned_parameters: Row | null;
  attempts: number;
  readback_defaults: Row | null;
  first_attempt_at: string;
};
const record = (value: unknown) =>
  value && typeof value === "object" ? (value as Row) : {};
const data = (value: unknown) =>
  Array.isArray(record(value).data) ? (record(value).data as Row[]) : [];
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
/** Minimal immutable reviewed source; no email/address/card data. */
export function operationsMigrationSnapshot(subscription: Row): Row {
  const item = data(subscription.items)[0] || {},
    price = record(item.price),
    invoice = record(subscription.latest_invoice);
  return {
    approvedCatalogue: approvedPricing.version,
    targetPriceId: OPERATION_PRICES.basico.id,
    id: subscription.id,
    customer: objectId(subscription.customer),
    profileId: record(subscription.metadata).profile_id,
    status: subscription.status,
    itemId: item.id,
    priceId: objectId(item.price),
    quantity: item.quantity,
    currency: subscription.currency,
    interval: record(price.recurring).interval,
    itemTaxRates: Array.isArray(item.tax_rates)
      ? item.tax_rates.map(objectId)
      : [],
    anchor: subscription.billing_cycle_anchor,
    periodStart: item.current_period_start ?? subscription.current_period_start,
    periodEnd: item.current_period_end ?? subscription.current_period_end,
    automaticTax: subscription.automatic_tax ?? null,
    defaultTaxRates: subscription.default_tax_rates ?? [],
    discountIds: (Array.isArray(subscription.discounts)
      ? subscription.discounts
      : []
    )
      .map(objectId)
      .sort(),
    metadata: subscription.metadata ?? {},
    collectionMethod: subscription.collection_method,
    defaultPaymentMethod: objectId(subscription.default_payment_method) ?? null,
    defaultSource: objectId(subscription.default_source) ?? null,
    billingMode: subscription.billing_mode ?? null,
    cancelAt: subscription.cancel_at ?? null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    pauseCollection: subscription.pause_collection ?? null,
    pendingUpdate: subscription.pending_update ?? null,
    nextPendingInvoiceItemInvoice:
      subscription.next_pending_invoice_item_invoice ?? null,
    invoiceId: invoice.id,
    invoiceStatus: invoice.status,
    invoiceAmountDue: invoice.amount_due,
    invoiceAmountPaid: invoice.amount_paid,
  };
}
function assertSource(current: Row, expected: Row, subscriptionId: string) {
  if (
    stable(operationsMigrationSnapshot(current)) !== stable(expected) ||
    current.id !== subscriptionId ||
    current.status !== "active" ||
    data(current.items).length !== 1 ||
    record(current.items).has_more ||
    !Number.isSafeInteger(expected.periodEnd) ||
    Number(expected.periodEnd) * 1000 <= Date.now() ||
    expected.invoiceStatus !== "paid" ||
    expected.invoiceAmountDue !== 0 ||
    expected.invoiceAmountPaid !== 0 ||
    expected.quantity !== 1 ||
    expected.currency !== "eur" ||
    expected.cancelAtPeriodEnd !== false ||
    expected.cancelAt ||
    expected.pauseCollection ||
    expected.pendingUpdate ||
    record(expected.automaticTax).enabled !== false ||
    !Array.isArray(expected.discountIds) ||
    expected.discountIds.length !== 1
  )
    throw Error("source_changed");
}
function encodeParameters(value: unknown) {
  const result = new URLSearchParams();
  function add(item: unknown, key: string) {
    if (item === null || item === undefined) return;
    if (Array.isArray(item)) {
      item.forEach((entry, index) => add(entry, `${key}[${index}]`));
      return;
    }
    if (typeof item === "object") {
      Object.entries(item).forEach(([name, entry]) =>
        add(entry, key ? `${key}[${name}]` : name),
      );
      return;
    }
    result.set(key, String(item));
  }
  add(value, "");
  return result;
}
function safePhase(phase: Row): Row {
  const copy = structuredClone(phase);
  if (copy.default_payment_method)
    copy.default_payment_method = objectId(copy.default_payment_method);
  if (Array.isArray(copy.default_tax_rates))
    copy.default_tax_rates = copy.default_tax_rates.map(objectId);
  if (Array.isArray(copy.discounts))
    copy.discounts = copy.discounts.map((d) => {
      const value = record(d);
      return {
        discount: objectId(value.discount) || objectId(d),
        coupon: objectId(value.coupon),
        promotion_code: objectId(value.promotion_code),
      };
    });
  return copy;
}
function verifyPhases(schedule: Row, parameters: Row, command: Command) {
  const phases = Array.isArray(schedule.phases)
    ? (schedule.phases as Row[])
    : [];
  const expected = parameters.phases as Row[];
  if (
    objectId(schedule.subscription) !== command.subscription_id ||
    schedule.status !== "active" ||
    phases.length !== 2 ||
    schedule.end_behavior !== "release"
  )
    throw Error("schedule_readback_changed");
  for (let i = 0; i < 2; i++) {
    const phase = phases[i],
      wanted = expected[i],
      items = Array.isArray(phase.items) ? (phase.items as Row[]) : [],
      wi = (wanted.items as Row[])[0];
    if (
      phase.start_date !== wanted.start_date ||
      phase.end_date !== wanted.end_date ||
      items.length !== 1 ||
      objectId(items[0].price) !== objectId(wi.price) ||
      items[0].quantity !== 1 ||
      phase.proration_behavior !== "none"
    )
      throw Error("schedule_phase_changed");
    if (record(phase.automatic_tax).enabled !== false)
      throw Error("schedule_tax_changed");
    const actualDiscounts = Array.isArray(phase.discounts)
      ? (phase.discounts as Row[])
      : [];
    const wantedDiscounts = Array.isArray(wanted.discounts)
      ? (wanted.discounts as Row[])
      : [];
    const discountIds = (values: Row[]) =>
      values.map((v) => objectId(v.discount) || objectId(v)).sort();
    if (
      stable(discountIds(actualDiscounts)) !==
      stable(discountIds(wantedDiscounts))
    )
      throw Error("schedule_discount_changed");
    for (const key of [
      "collection_method",
      "currency",
      "default_payment_method",
      "default_tax_rates",
      "invoice_settings",
      "application_fee_percent",
      "on_behalf_of",
      "transfer_data",
      "billing_thresholds",
      "trial_end",
      "trial_settings",
      "billing_cycle_anchor",
    ]) {
      const expectedSetting = wanted[key];
      if (expectedSetting === null || expectedSetting === undefined) continue;
      if (Array.isArray(expectedSetting) && expectedSetting.length === 0) {
        if (Array.isArray(phase[key]) && (phase[key] as unknown[]).length > 0)
          throw Error("schedule_settings_changed");
        continue;
      }
      if (
        stable(safePhase({ [key]: phase[key] })[key]) !==
        stable(safePhase({ [key]: expectedSetting })[key])
      )
        throw Error("schedule_settings_changed");
    }
    if (stable(record(phase.metadata)) !== stable(record(wanted.metadata)))
      throw Error("schedule_metadata_changed");
  }
}
/** Explicit root-enqueued command only. Creates a schedule FROM the same subscription,
 * preserves current paid phase, previews a future invoice, then writes future phases.
 * Never creates subscriptions, charges, payment intents, tax registrations or invoices. */
export async function processOperationsMigrationCommand(
  env: OperationsRecoveryEnv & {
    AKIBUSINESS_OPERATIONS_MIGRATIONS_READY?: string;
  },
  fetcher: typeof fetch = fetch,
) {
  if (
    env.AKIBUSINESS_OPERATIONS_MIGRATIONS_READY !== "true" ||
    env.AKIBUSINESS_OPERATIONS_BILLING_READY !== "true"
  )
    return { enabled: false, scheduled: 0 };
  if (
    !env.NEXT_PUBLIC_SUPABASE_URL ||
    !env.SUPABASE_SERVICE_ROLE_KEY ||
    !env.STRIPE_SECRET_KEY
  )
    throw Error("migration_bindings_unavailable");
  async function rpc<T>(name: string, body: Row = {}): Promise<T | null> {
    const r = await fetcher(
      `${env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "")}/rest/v1/rpc/${name}`,
      {
        method: "POST",
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    if (!r.ok) throw Error("migration_rpc_retry");
    return r.status === 204 ? null : r.json();
  }
  async function stripe(path: string, body?: Row, key?: string): Promise<Row> {
    const r = await fetcher(`https://api.stripe.com/v1${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Stripe-Version": "2026-08-26.dahlia",
        ...(body
          ? {
              "Content-Type": "application/x-www-form-urlencoded",
              "Idempotency-Key": key!,
            }
          : {}),
      },
      ...(body ? { body: encodeParameters(body) } : {}),
    });
    if (!r.ok)
      throw Error(
        r.status >= 500 || r.status === 429
          ? "migration_provider_retry"
          : "migration_provider_rejected",
      );
    return r.json();
  }
  const account = await stripe("/account");
  if (account.id !== "acct_1SVLH2GfzDhsgsQZ")
    throw Error("migration_merchant_mismatch");
  const command = await rpc<Command>("claim_crm_operations_migration");
  if (!command) return { enabled: true, scheduled: 0 };
  let outcome: "scheduled" | "blocked" | "retry" = "blocked",
    evidence: Row = { verified: false };
  try {
    // Historical queued commands approved a different offer. A catalogue edit
    // must never silently change the renewal price they would schedule.
    if (
      command.source_snapshot.approvedCatalogue !== approvedPricing.version ||
      command.source_snapshot.targetPriceId !== OPERATION_PRICES.basico.id
    )
      throw Error("migration_catalogue_review_required");
    if (
      !/^sub_[A-Za-z0-9]+$/.test(command.subscription_id) ||
      !/^[-a-f0-9]{36}$/.test(command.command_id) ||
      !/^[-a-f0-9]{36}$/.test(command.lease) ||
      !/^[a-f0-9]{64}$/.test(command.manifest_sha256)
    )
      throw Error("migration_command_invalid");
    const source = await stripe(
      `/subscriptions/${command.subscription_id}?expand[]=latest_invoice.lines`,
    );
    const scope = () =>
      rpc<Row>("crm_operations_migration_scope", {
        p_command: command.command_id,
        p_lease: command.lease,
      });
    const binding = await scope();
    if (
      !binding ||
      binding.workspaceId !== command.workspace_id ||
      binding.customerId !== command.source_snapshot.customer ||
      binding.profileId !== command.source_snapshot.profileId ||
      binding.token ||
      binding.tier
    )
      throw Error("migration_binding_changed");
    assertSource(source, command.source_snapshot, command.subscription_id);
    let scheduleId = command.schedule_id;
    if (!scheduleId) {
      if (source.schedule && command.attempts <= 1)
        throw Error("migration_unreviewed_schedule");
      const started = Date.parse(command.first_attempt_at);
      if (!Number.isFinite(started) || Date.now() - started > 23 * 3600000)
        throw Error("migration_ambiguous_expired");
      const created = await stripe(
        "/subscription_schedules",
        { from_subscription: command.subscription_id },
        `operations-migration:${command.command_id}:create`,
      );
      if (
        objectId(created.subscription) !== command.subscription_id ||
        typeof created.id !== "string" ||
        !/^sub_sched_[A-Za-z0-9]+$/.test(created.id)
      )
        throw Error("migration_schedule_binding_changed");
      if (source.schedule && objectId(source.schedule) !== created.id)
        throw Error("migration_unreviewed_schedule");
      scheduleId = created.id;
      await rpc("prepare_crm_operations_migration", {
        p_command: command.command_id,
        p_lease: command.lease,
        p_schedule: scheduleId,
      });
    }
    if (source.schedule && objectId(source.schedule) !== scheduleId)
      throw Error("migration_unreviewed_schedule");
    const schedule = await stripe(`/subscription_schedules/${scheduleId}`);
    const phases = Array.isArray(schedule.phases)
      ? (schedule.phases as Row[])
      : [];
    let parameters: Row;
    if (phases.length === 1) {
      const preview = buildRenewalSchedulePreview(source, schedule, {
        status: "ready_for_schedule_preview",
        subscriptionId: command.subscription_id,
        effectiveAt: new Date(
          Number(command.source_snapshot.periodEnd) * 1000,
        ).toISOString(),
        profileId: binding.profileId,
        target: { priceId: OPERATION_PRICES.basico.id, tier: "basico" },
        scope: { workspaceId: command.workspace_id },
      });
      parameters = preview.parameters as Row;
      const next = (parameters.phases as Row[])[1];
      next.metadata = {
        ...record(next.metadata),
        operations_migration_manifest: command.manifest_sha256,
        operations_migration_command: command.command_id,
      };
      parameters.phases = (parameters.phases as Row[]).map(safePhase);
      await rpc("prepare_crm_operations_migration", {
        p_command: command.command_id,
        p_lease: command.lease,
        p_schedule: scheduleId,
        p_parameters: parameters,
        p_defaults: record(schedule.default_settings),
      });
    } else if (phases.length === 2) {
      // A prior update may have succeeded before the response/DB acknowledgement.
      if (!command.planned_parameters)
        throw Error("migration_missing_saved_plan");
      parameters = command.planned_parameters;
      verifyPhases(schedule, parameters, command);
      if (
        stable(record(schedule.default_settings)) !==
        stable(command.readback_defaults || {})
      )
        throw Error("migration_defaults_changed");
      const next = phases[1];
      if (
        record(next.metadata).operations_migration_command !==
          command.command_id ||
        record(next.metadata).workspace_id !== command.workspace_id ||
        next.start_date !== command.source_snapshot.periodEnd ||
        objectId((next.items as Row[])?.[0]?.price) !==
          OPERATION_PRICES.basico.id
      )
        throw Error("migration_unreviewed_future_phase");
    } else throw Error("migration_unreviewed_phase_count");
    for (const phase of parameters.phases as Row[]) {
      const discounts = phase.discounts as Row[] | undefined;
      if (
        discounts?.length !== 1 ||
        discounts[0].discount !==
          (command.source_snapshot.discountIds as string[])[0] ||
        discounts[0].coupon ||
        discounts[0].promotion_code
      )
        throw Error("migration_existing_discount_required");
    }
    // No source subscription setting is altered by previewing; never finalizes an invoice.
    const invoice = await stripe(
      "/invoices/create_preview",
      {
        schedule: scheduleId,
        schedule_details: parameters,
        preview_mode: "recurring",
      },
      `operations-migration:${command.command_id}:preview`,
    );
    const lines = data(invoice.lines),
      line = lines[0],
      linePrice =
        objectId(line?.price) ||
        record(record(line?.pricing).price_details).price;
    if (
      invoice.currency !== "eur" ||
      invoice.amount_due !== 0 ||
      invoice.total !== 0 ||
      record(invoice.automatic_tax).enabled !== false ||
      record(invoice.lines).has_more ||
      lines.length !== 1 ||
      linePrice !== OPERATION_PRICES.basico.id ||
      line.amount !== OPERATION_PRICES.basico.amount ||
      record(line.period).start !== command.source_snapshot.periodEnd ||
      record(line.period).end !== (parameters.phases as Row[])[1].end_date ||
      line.proration === true ||
      record(record(line.parent).subscription_item_details).proration === true
    )
      throw Error("migration_preview_changed");
    const discounts = Array.isArray(invoice.total_discount_amounts)
      ? (invoice.total_discount_amounts as Row[])
      : [];
    if (
      discounts.length !== 1 ||
      discounts[0].amount !== OPERATION_PRICES.basico.amount ||
      objectId(discounts[0].discount) !==
        (command.source_snapshot.discountIds as string[])[0]
    )
      throw Error("migration_preview_discount_changed");
    await scope();
    if (phases.length === 1) {
      // Preview may take time. Never knowingly replace current financial state
      // changed by the customer or another operator while it was running.
      const beforeWrite = await stripe(
        `/subscriptions/${command.subscription_id}?expand[]=latest_invoice.lines`,
      );
      assertSource(
        beforeWrite,
        command.source_snapshot,
        command.subscription_id,
      );
      if (objectId(beforeWrite.schedule) !== scheduleId)
        throw Error("migration_subscription_schedule_changed");
      const currentSchedule = await stripe(
        `/subscription_schedules/${scheduleId}`,
      );
      if (stable(currentSchedule) !== stable(schedule))
        throw Error("migration_schedule_changed_before_write");
      await scope();
      await stripe(
        `/subscription_schedules/${scheduleId}`,
        parameters,
        `operations-migration:${command.command_id}:phases`,
      );
    }
    const confirmed = await stripe(`/subscription_schedules/${scheduleId}`);
    verifyPhases(confirmed, parameters, command);
    if (
      stable(record(confirmed.default_settings)) !==
      stable(command.readback_defaults || record(schedule.default_settings))
    )
      throw Error("migration_defaults_changed");
    const after = await stripe(
      `/subscriptions/${command.subscription_id}?expand[]=latest_invoice.lines`,
    );
    assertSource(after, command.source_snapshot, command.subscription_id);
    if (objectId(after.schedule) !== scheduleId)
      throw Error("migration_subscription_schedule_changed");
    evidence = {
      verified: true,
      scheduleId,
      invoicePreviewId: invoice.id,
      amountDue: 0,
      currency: "eur",
      targetPrice: OPERATION_PRICES.basico.id,
      effectiveAt: command.source_snapshot.periodEnd,
      currentStatus: after.status,
      manifestSha256: command.manifest_sha256,
    };
    await scope();
    outcome = "scheduled";
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "migration_unknown_failure";
    outcome =
      reason.endsWith("_retry") || reason.includes("fetch")
        ? "retry"
        : "blocked";
    evidence = {
      verified: false,
      reason: /^[a-z_]{1,80}$/.test(reason)
        ? reason
        : /^Unreviewed phase( item)? property: [a-z_]+$/.test(reason)
          ? reason
              .replace(/[^a-z_]/gi, "_")
              .toLowerCase()
              .slice(0, 100)
          : "migration_provider_ambiguous",
    };
  }
  await rpc("finish_crm_operations_migration", {
    p_command: command.command_id,
    p_lease: command.lease,
    p_result: outcome,
    p_evidence: evidence,
  });
  return { enabled: true, scheduled: outcome === "scheduled" ? 1 : 0, outcome };
}
