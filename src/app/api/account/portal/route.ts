import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { config } from "@/lib/config";
import { stripeRequest } from "@/lib/stripe";
export const dynamic = "force-dynamic";
const origins = {
  pasa: "https://akipasa.com",
  duermo: "https://akiduermo.com",
  coches: "https://akicoches.com",
  hq: "https://akihq.app",
  business: "https://akibusiness.com",
} as const;
const input = z
  .object({
    action: z.enum(["summary", "portal"]),
    product: z.enum(["pasa", "duermo", "coches", "hq", "business"]),
    locale: z.enum(["en", "es"]),
  })
  .strict();
function response(request: Request, body: unknown, status = 200) {
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    Vary: "Origin",
    "Referrer-Policy": "no-referrer",
  });
  const origin = request.headers.get("origin");
  if (
    origin &&
    Object.values(origins).includes(
      origin as (typeof origins)[keyof typeof origins],
    )
  ) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  }
  return Response.json(body, { status, headers });
}
export function OPTIONS(request: Request) {
  return response(
    request,
    {},
    Object.values(origins).includes(
      request.headers.get("origin") as (typeof origins)[keyof typeof origins],
    )
      ? 200
      : 403,
  );
}
async function readInput(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024) {
        await reader.cancel();
        throw new Error("Body exceeds account request limit");
      }
      text += decoder.decode(value, { stream: true });
    }
    return input.safeParse(JSON.parse(text + decoder.decode()));
  } finally {
    reader.releaseLock();
  }
}
/** Central billing owner; first-party frontends keep their own UI and host-only session. */
export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer [^\s]{1,8192}$/.test(authorization))
    return response(request, { error: "identity_required" }, 401);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return response(request, { error: "invalid_request" }, 400);
  const parsed = await readInput(request).catch(() => null);
  if (!parsed?.success)
    return response(request, { error: "invalid_request" }, 400);
  try {
    const { action, product, locale } = parsed.data;
    if (request.headers.get("origin") !== origins[product])
      return response(request, { error: "invalid_origin" }, 403);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
      key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return response(request, { error: "unavailable" }, 503);
    const db = createClient(url, key, {
      global: { headers: { Authorization: authorization } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const identity = await db.auth.getUser(authorization.slice(7));
    if (identity.error || !identity.data.user)
      return response(request, { error: "identity_required" }, 401);
    const user = identity.data.user;
    const [eligibility, profile] = await Promise.all([
      db.rpc("account_features_allowed"),
      db
        .from("profiles")
        .select("terms_version")
        .eq("id", user.id)
        .maybeSingle(),
    ]);
    if (eligibility.error || profile.error)
      return response(request, { error: "unavailable" }, 503);
    if (
      eligibility.data !== true ||
      profile.data?.terms_version !== config.currentTermsVersion
    )
      return response(request, { error: "account_review_required" }, 403);
    const [customer, legacy, suite] = await Promise.all([
      db
        .from("billing_customers")
        .select("stripe_customer_id")
        .eq("profile_id", user.id)
        .maybeSingle(),
      db
        .from("billing_subscriptions")
        .select(
          "plan_code,billing_interval,status,current_period_end,cancel_at_period_end",
        )
        .eq("profile_id", user.id),
      process.env.AKISUITE_SUBSCRIPTIONS_READY === "true"
        ? db
            .from("akisuite_billing_subscriptions")
            .select(
              "plan_code,billing_interval,status,current_period_end,cancel_at_period_end",
            )
            .eq("profile_id", user.id)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (customer.error || legacy.error || suite.error)
      return response(request, { error: "unavailable" }, 503);
    if (action === "summary")
      return response(request, {
        subscriptions: [...(legacy.data || []), ...(suite.data || [])],
        hasCustomer: Boolean(customer.data?.stripe_customer_id),
      });
    if (!customer.data?.stripe_customer_id)
      return response(request, { error: "no_customer" }, 409);
    const path =
      product === "business"
        ? `/account?locale=${locale}`
        : product === "hq"
          ? `/${locale}/account`
          : product === "pasa"
            ? `/${locale}/account/subscription`
            : `/settings?lang=${locale}`;
    const parameters = new URLSearchParams({
      customer: customer.data.stripe_customer_id,
      return_url: new URL(path, origins[product]).toString(),
      locale,
    });
    if (process.env.STRIPE_AKIPASA_PORTAL_CONFIGURATION_ID)
      parameters.set(
        "configuration",
        process.env.STRIPE_AKIPASA_PORTAL_CONFIGURATION_ID,
      );
    if (
      suite.data?.some((row) =>
        [
          "active",
          "trialing",
          "past_due",
          "unpaid",
          "paused",
          "incomplete",
        ].includes(row.status),
      )
    ) {
      const configuration =
        process.env.STRIPE_AKISUITE_MANAGEMENT_CONFIGURATION_ID;
      if (!configuration)
        return response(request, { error: "unavailable" }, 503);
      parameters.set("configuration", configuration);
    }
    const session = await stripeRequest<{ url?: string }>(
      "/billing_portal/sessions",
      parameters,
    );
    if (
      !session.url ||
      new URL(session.url).origin !== "https://billing.stripe.com"
    )
      return response(request, { error: "unavailable" }, 503);
    return response(request, { url: session.url });
  } catch {
    return response(request, { error: "unavailable" }, 503);
  }
}
