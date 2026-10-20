import { stripeRetrieve, stripeRequest } from "./stripe";
import { createSupabaseServiceClient } from "./supabase/service";
import { buildRenewalSchedulePreview } from "./operations-billing/migration-manifest.mjs";
/** Called after owner-authorised reservation. Never updates the current price. */
export async function scheduleOperationsDowngrade(
  change: {
    token: string;
    subscription_id: string;
    schedule_id: string | null;
    created_at: string;
  },
  source: Record<string, unknown>,
  target: { priceId: string; tier: string; workspace: string; profile: string },
) {
  const service = createSupabaseServiceClient();
  const createdAt = Date.parse(change.created_at);
  if (
    !Number.isFinite(createdAt) ||
    (!change.schedule_id && Date.now() - createdAt > 23 * 3600000)
  )
    throw Error("Ambiguous expired plan change needs reconciliation");
  let scheduleId = change.schedule_id;
  if (!scheduleId) {
    // from_subscription keeps the existing subscription/customer/payment method.
    // A retry uses the same key; no new subscription or immediate invoice is made.
    const created = await stripeRequest<{ id: string; subscription: string }>(
      "/subscription_schedules",
      new URLSearchParams({ from_subscription: change.subscription_id }),
      `operations-downgrade:${change.token}:create`,
      "2026-08-26.dahlia",
    );
    if (
      !created.id?.startsWith("sub_sched_") ||
      created.subscription !== change.subscription_id
    )
      throw Error("Unexpected schedule binding");
    scheduleId = created.id;
    const saved = await service.rpc("record_crm_operations_schedule", {
      p_token: change.token,
      p_schedule: scheduleId,
      p_complete: false,
    });
    if (saved.error) throw saved.error;
  }
  const schedule = await stripeRetrieve<Record<string, unknown>>(
    `/subscription_schedules/${encodeURIComponent(scheduleId)}`,
    "2026-08-26.dahlia",
  );
  const items = source.items as {
    data: Array<{ current_period_end?: number }>;
  };
  const end = items.data[0]?.current_period_end || source.current_period_end;
  if (
    typeof end !== "number" ||
    !Number.isFinite(end) ||
    end * 1000 <= Date.now()
  )
    throw Error("Future paid renewal boundary required");
  const phaseList = schedule.phases as Array<{
    items: Array<{ price: string | { id: string } }>;
  }>;
  // Already-written schedules are read back rather than rewritten on retries.
  if (phaseList?.length === 2) {
    const next = phaseList[1] as Record<string, unknown>;
    const nextItem = phaseList[1].items[0];
    const nextPrice =
      typeof nextItem?.price === "string"
        ? nextItem.price
        : nextItem?.price?.id;
    if (
      next.start_date !== end ||
      nextPrice !== target.priceId ||
      (next.metadata as Record<string, string>)?.workspace_id !==
        target.workspace
    )
      throw Error("Another scheduled change needs reconciliation");
  } else {
    if (source.schedule && source.schedule !== scheduleId)
      throw Error("An unrelated schedule already exists");
    const preview = buildRenewalSchedulePreview(source, schedule, {
      status: "ready_for_schedule_preview",
      subscriptionId: change.subscription_id,
      effectiveAt: new Date(end * 1000).toISOString(),
      profileId: target.profile,
      target: { priceId: target.priceId, tier: target.tier },
      scope: { workspaceId: target.workspace },
    });
    const phases = preview.parameters.phases as Array<{
      metadata?: Record<string, string>;
    }>;
    if (phases[1].metadata) {
      delete phases[1].metadata.operations_migration_manifest;
      phases[1].metadata.operations_change_token = change.token;
    }
    const parameters = new URLSearchParams();
    function add(value: unknown, key: string) {
      if (value === null || value === undefined) return;
      if (Array.isArray(value)) {
        value.forEach((item, i) => add(item, `${key}[${i}]`));
        return;
      }
      if (typeof value === "object") {
        Object.entries(value).forEach(([child, item]) =>
          add(item, key ? `${key}[${child}]` : child),
        );
        return;
      }
      parameters.set(key, String(value));
    }
    add(preview.parameters, "");
    // Merchant-owned bindings and original metadata are preserved by the preview.
    // A phase starts at renewal; top-level and phase proration are explicitly none.
    await stripeRequest(
      `/subscription_schedules/${encodeURIComponent(scheduleId)}`,
      parameters,
      `operations-downgrade:${change.token}:phases`,
      "2026-08-26.dahlia",
    );
  }
  const confirmed = await stripeRetrieve<{
    subscription: string;
    phases: Array<{
      start_date: number;
      end_date: number;
      items: Array<{ price: string | { id: string }; quantity: number }>;
    }>;
  }>(
    `/subscription_schedules/${encodeURIComponent(scheduleId)}`,
    "2026-08-26.dahlia",
  );
  const future = confirmed.phases?.[1],
    price =
      typeof future?.items?.[0]?.price === "string"
        ? future.items[0].price
        : future?.items?.[0]?.price?.id;
  if (
    confirmed.subscription !== change.subscription_id ||
    confirmed.phases.length !== 2 ||
    confirmed.phases[0].end_date !== end ||
    (typeof confirmed.phases[0].items[0]?.price === "string"
      ? confirmed.phases[0].items[0].price
      : confirmed.phases[0].items[0]?.price?.id) !==
      (source.items as { data: Array<{ price: { id: string } }> }).data[0].price
        .id ||
    future.start_date !== end ||
    price !== target.priceId ||
    future.items.length !== 1 ||
    future.items[0].quantity !== 1
  )
    throw Error("Scheduled downgrade readback failed");
  const saved = await service.rpc("record_crm_operations_schedule", {
    p_token: change.token,
    p_schedule: scheduleId,
    p_complete: true,
    p_effective: new Date(end * 1000).toISOString(),
  });
  if (saved.error) throw saved.error;
  return { effectiveAt: new Date(end * 1000).toISOString() };
}
