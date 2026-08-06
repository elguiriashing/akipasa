import { z } from "zod";

export const billingPlanSchema = z.object({
  plan: z.enum(["premium", "business"]),
  interval: z.enum(["month", "year"]),
});

export type BillingPlan = z.infer<typeof billingPlanSchema>;

const priceEnvironmentNames = {
  "premium:month": "STRIPE_PREMIUM_MONTHLY_PRICE_ID",
  "premium:year": "STRIPE_PREMIUM_YEARLY_PRICE_ID",
  "business:month": "STRIPE_BUSINESS_MONTHLY_PRICE_ID",
  "business:year": "STRIPE_BUSINESS_YEARLY_PRICE_ID",
} as const;

export function stripePriceId({ plan, interval }: BillingPlan) {
  const name = priceEnvironmentNames[`${plan}:${interval}`];
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export async function stripeRequest<T>(
  path: string,
  parameters: URLSearchParams,
): Promise<T> {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("STRIPE_SECRET_KEY is not configured");
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: parameters,
  });
  const result = (await response.json()) as T & {
    error?: { message?: string };
  };
  if (!response.ok)
    throw new Error(result.error?.message || "Stripe request failed");
  return result;
}

function hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1)
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export async function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  const parts = signatureHeader.split(",").map((part) => part.split("="));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts
    .filter(([key]) => key === "v1")
    .map(([, value]) => value);
  if (!timestamp || signatures.length === 0) return false;
  const parsedTimestamp = Number(timestamp);
  if (
    !Number.isInteger(parsedTimestamp) ||
    Math.abs(nowSeconds - parsedTimestamp) > 300
  )
    return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  const expected = hex(digest);
  return signatures.some((signature) => constantTimeEqual(signature, expected));
}
