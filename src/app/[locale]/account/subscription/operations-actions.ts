"use server";

import { scheduleOperationsDowngrade } from "@/lib/operations-schedule";
import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { stripeRetrieve, stripeRequest } from "@/lib/stripe";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  OPERATION_PRICES,
  validTools,
  operationsPrice,
  TOOL_KEYS,
} from "@/lib/operations-billing/operations-contract.mjs";
const input = z.object({
  tier: z.enum(["basico", "standard", "pro"]),
  workspace: z.string().regex(/^[a-z0-9][a-z0-9_-]{2,79}$/),
  tools: z.array(z.string()).max(12),
});
export async function startOperationsCheckout(form: FormData) {
  const locale = form.get("locale") === "es" ? "es" : "en",
    path = `/${locale}/account/subscription/operations`;
  const fail = (reason: string): never => redirect(`${path}?error=${reason}`);
  const { supabase, user } = await requireUser(locale, path);
  if (
    process.env.AKIBUSINESS_OPERATIONS_CHECKOUT_READY !== "true" ||
    process.env.AKIBUSINESS_OPERATIONS_BILLING_READY !== "true" ||
    process.env.AKIBUSINESS_OPERATIONS_TAX_READY !== "true"
  )
    return fail("unavailable");
  const parsed = input.safeParse({
    tier: form.get("tier"),
    workspace: form.get("workspace"),
    tools: form.get("tier") === "pro" ? [...TOOL_KEYS] : form.getAll("tools"),
  });
  if (!parsed.success || !validTools(parsed.data.tier, parsed.data.tools))
    return fail("selection");
  const { tier, workspace, tools } = parsed.data,
    offer = OPERATION_PRICES[tier];
  try {
    const { data: owned, error: ownerError } = await supabase
      .from("crm_workspaces")
      .select("id")
      .eq("id", workspace)
      .eq("owner_profile_id", user.id)
      .in("status", ["active", "trial"])
      .maybeSingle();
    if (ownerError || !owned) return fail("owner");
    const registrationId = process.env.AKISUITE_TAX_REGISTRATION_ID;
    if (!registrationId) throw Error("Tax registration required");
    const [account, price, tax, registration] = await Promise.all([
      stripeRetrieve<{ id: string }>("/account"),
      stripeRetrieve<{
        id: string;
        active: boolean;
        currency: string;
        unit_amount: number;
        tax_behavior: string;
        recurring: { interval: string; interval_count: number };
      }>(`/prices/${offer.id}`),
      stripeRetrieve<{ status: string }>("/tax/settings"),
      stripeRetrieve<{
        status: string;
        country: string;
        active_from: number;
        expires_at: number | null;
      }>(`/tax/registrations/${encodeURIComponent(registrationId)}`),
    ]);
    const now = Math.floor(Date.now() / 1000);
    if (
      account.id !== "acct_1SVLH2GfzDhsgsQZ" ||
      price.id !== offer.id ||
      !price.active ||
      price.currency !== "eur" ||
      price.unit_amount !== offer.amount ||
      price.recurring.interval !== "month" ||
      price.recurring.interval_count !== 1 ||
      !["inclusive", "exclusive"].includes(price.tax_behavior) ||
      tax.status !== "active" ||
      registration.status !== "active" ||
      registration.country !== "ES" ||
      registration.active_from > now ||
      (registration.expires_at && registration.expires_at <= now)
    )
      throw Error("Operating billing offer not verified");
    const { data: customer, error: customerError } = await supabase
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("profile_id", user.id)
      .maybeSingle();
    if (customerError) throw customerError;
    let customerId = customer?.stripe_customer_id;
    if (!customerId) {
      const created = await stripeRequest<{ id: string }>(
        "/customers",
        new URLSearchParams({
          email: user.email || "",
          "metadata[profile_id]": user.id,
        }),
        `akisuite-customer:${user.id}`,
      );
      if (!/^cus_[A-Za-z0-9]+$/.test(created.id))
        throw Error("Invalid Stripe customer");
      customerId = created.id;
      const mapping = await createSupabaseServiceClient()
        .from("billing_customers")
        .upsert(
          { profile_id: user.id, stripe_customer_id: customerId },
          { onConflict: "profile_id" },
        );
      if (mapping.error) throw mapping.error;
    }
    const current = await stripeRetrieve<{
      data: Array<{
        status: string;
        metadata?: { workspace_id?: string };
        items: { data: Array<{ price: { id: string } }> };
      }>;
      has_more: boolean;
    }>(
      `/subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=100`,
    );
    if (current.has_more) throw Error("Billing reconciliation required");
    const blocking = new Set([
      "active",
      "trialing",
      "past_due",
      "unpaid",
      "paused",
      "incomplete",
    ]);
    const legacyPrices = [
      process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID,
      process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID,
      process.env.STRIPE_BUSINESS_PRO_MONTHLY_PRICE_ID,
      process.env.STRIPE_BUSINESS_PRO_YEARLY_PRICE_ID,
    ].filter(Boolean);
    const existingOperations = current.data.find(
      (s) =>
        blocking.has(s.status) &&
        s.metadata?.workspace_id === workspace &&
        s.items.data.some((item) => operationsPrice(item.price.id)),
    );
    if (existingOperations) {
      if (
        !["active", "trialing"].includes(existingOperations.status) ||
        existingOperations.items.data.length !== 1
      )
        throw Error("Current subscription requires billing reconciliation");
      const source = await stripeRetrieve<{
        id: string;
        customer: string;
        metadata?: { workspace_id?: string; profile_id?: string };
        items: {
          data: Array<{ id: string; quantity: number; price: { id: string } }>;
        };
      }>(
        `/subscriptions/${encodeURIComponent((existingOperations as { id?: string }).id || "")}`,
      );
      if (
        source.customer !== customerId ||
        source.metadata?.workspace_id !== workspace ||
        source.metadata?.profile_id !== user.id ||
        source.items.data.length !== 1 ||
        source.items.data[0].quantity !== 1 ||
        !operationsPrice(source.items.data[0].price.id)
      )
        throw Error("Subscription scope changed");
      const sourceTier = operationsPrice(source.items.data[0].price.id)!;
      const ranks = { basico: 1, standard: 2, pro: 3 };
      if (ranks[tier] < ranks[sourceTier]) {
        const reserved = await supabase.rpc(
          "reserve_crm_operations_downgrade",
          { p_workspace: workspace, p_tier: tier, p_tools: tools },
        );
        if (reserved.error || reserved.data?.subscription_id !== source.id)
          throw Error("Downgrade reservation unavailable");
        await scheduleOperationsDowngrade(reserved.data, source, {
          priceId: offer.id,
          tier,
          workspace,
          profile: user.id,
        });
        redirect(
          `${path}?workspace=${encodeURIComponent(workspace)}&scheduled=renewal`,
        );
      }
      const configuration =
        process.env.STRIPE_OPERATIONS_PORTAL_CONFIGURATION_ID;
      if (!configuration) throw Error("Operating plan changes not configured");
      const portal = await stripeRetrieve<{
        features: {
          subscription_update: {
            enabled: boolean;
            default_allowed_updates: string[];
            proration_behavior: string;
            schedule_at_period_end?: { conditions?: Array<{ type: string }> };
            products?: Array<{ prices: string[] }>;
          };
        };
      }>(`/billing_portal/configurations/${encodeURIComponent(configuration)}`);
      const update = portal.features.subscription_update;
      const allowed =
        update.products?.flatMap((product) => product.prices) || [];
      const expected = Object.values(OPERATION_PRICES).map((offer) => offer.id);
      if (
        !update.enabled ||
        !update.default_allowed_updates.includes("price") ||
        update.proration_behavior !== "always_invoice" ||
        allowed.length !== expected.length ||
        expected.some((id) => !allowed.includes(id))
      )
        throw Error("Portal lifecycle policy not verified");
      // Only a future choice is stored. Current active tools change after a
      // verified invoice and the portal's effective downgrade boundary.
      const next = await supabase.rpc("set_crm_operations_next", {
        p_workspace: workspace,
        p_tier: tier,
        p_tools: tools,
      });
      if (next.error) throw next.error;
      const changed = await stripeRequest<{ url: string }>(
        "/billing_portal/sessions",
        new URLSearchParams({
          customer: customerId,
          configuration,
          return_url: `https://akibusiness.com/toolbox.html?locale=${locale}&workspace=${encodeURIComponent(workspace)}`,
          "flow_data[type]": "subscription_update_confirm",
          "flow_data[subscription_update_confirm][subscription]": source.id,
          "flow_data[subscription_update_confirm][items][0][id]":
            source.items.data[0].id,
          "flow_data[subscription_update_confirm][items][0][price]": offer.id,
          "flow_data[subscription_update_confirm][items][0][quantity]": "1",
        }),
      );
      if (!changed.url?.startsWith("https://billing.stripe.com/"))
        throw Error("Unexpected billing portal response");
      redirect(changed.url);
    }
    if (
      current.data.some(
        (s) =>
          blocking.has(s.status) &&
          (s.metadata?.workspace_id === workspace ||
            s.items.data.some(
              (item) =>
                operationsPrice(item.price.id) && !s.metadata?.workspace_id,
            ) ||
            s.items.data.some((item) => legacyPrices.includes(item.price.id))),
      )
    )
      return fail("existing_subscription");
    const { data: reservation, error: reserveError } = await supabase.rpc(
      "reserve_crm_operations_checkout",
      {
        p_workspace: workspace,
        p_tier: tier,
        p_tools: tools,
        p_price: offer.id,
      },
    );
    if (reserveError || !reservation?.token || !reservation.expires_at)
      return fail("checkout_pending");
    if (reservation.session_id) {
      const existing = await stripeRetrieve<{
        status: string;
        url: string;
        customer: string;
      }>(`/checkout/sessions/${encodeURIComponent(reservation.session_id)}`);
      if (
        existing.status === "open" &&
        existing.customer === customerId &&
        existing.url?.startsWith("https://checkout.stripe.com/")
      )
        redirect(existing.url);
      return fail("checkout_pending");
    }
    const expires = Math.floor(Date.parse(reservation.expires_at) / 1000);
    if (expires < now + 30 * 60)
      throw Error("Checkout reservation requires recovery");
    const params = new URLSearchParams({
      mode: "subscription",
      customer: customerId,
      "line_items[0][price]": offer.id,
      "line_items[0][quantity]": "1",
      "automatic_tax[enabled]": "true",
      "tax_id_collection[enabled]": "true",
      billing_address_collection: "required",
      "customer_update[address]": "auto",
      "customer_update[name]": "auto",
      locale,
      expires_at: String(expires),
      success_url: `https://akibusiness.com/toolbox.html?locale=${locale}&workspace=${encodeURIComponent(workspace)}&checkout=pending`,
      cancel_url: `https://akipasa.com${path}?checkout=cancelled`,
      client_reference_id: user.id,
      integration_identifier: `akibusiness_operations_${createHash("sha256")
        .update(reservation.token)
        .digest("hex")
        .slice(0, 8)
        .replace(/[0-9]/g, (value) =>
          String.fromCharCode(103 + Number(value)),
        )}`,
    });
    for (const [key, value] of Object.entries({
      profile_id: user.id,
      workspace_id: workspace,
      operations_tier: tier,
      operations_checkout_token: reservation.token,
    })) {
      params.set(`metadata[${key}]`, String(value));
      params.set(`subscription_data[metadata][${key}]`, String(value));
    }
    const session = await stripeRequest<{ id: string; url: string }>(
      "/checkout/sessions",
      params,
      `operations-checkout:${reservation.token}`,
      "2026-08-26.dahlia",
    );
    if (
      !/^cs_[A-Za-z0-9_]+$/.test(session.id) ||
      !session.url?.startsWith("https://checkout.stripe.com/")
    )
      throw Error("Unexpected checkout response");
    // Returning from hosted checkout never enables tools; the signed webhook does.
    const service = createSupabaseServiceClient();
    const saved = await service.rpc("record_crm_operations_checkout_session", {
      p_token: reservation.token,
      p_session: session.id,
    });
    if (saved.error) throw saved.error;
    redirect(session.url);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return fail("unavailable");
  }
}

/** Initial migration choice is independent of checkout and closes atomically on activation. */
export async function configureOperationsInitial(form: FormData) {
  const locale = form.get("locale") === "es" ? "es" : "en";
  const workspace = z
    .string()
    .regex(/^[a-z0-9][a-z0-9_-]{2,79}$/)
    .safeParse(form.get("workspace"));
  const tools = form.getAll("tools");
  const path = `/${locale}/account/subscription/operations`;
  const { supabase } = await requireUser(locale, path);
  if (!workspace.success || !validTools("basico", tools))
    redirect(`${path}?error=selection`);
  const { error } = await supabase.rpc("configure_crm_operations_initial", {
    p_workspace: workspace.data,
    p_tools: tools,
  });
  redirect(
    `${path}?workspace=${encodeURIComponent(workspace.data)}&${error ? "error=initial_configuration" : "saved=initial"}`,
  );
}
