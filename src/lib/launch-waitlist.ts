import { createHash, createHmac, randomBytes } from "node:crypto";
import { z } from "zod";

export const MAX_WAITLIST_BODY_BYTES = 4096;
const originProduct = new Map<string, "duermo" | "coches">([
  ["https://akiduermo.com", "duermo"],
  ["https://www.akiduermo.com", "duermo"],
  ["https://akicoches.com", "coches"],
  ["https://www.akicoches.com", "coches"],
]);

export const launchWaitlistSchema = z
  .object({
    product: z.enum(["duermo", "coches"]),
    fullName: z.string().trim().min(1).max(100),
    email: z.string().trim().toLowerCase().email().max(254),
    city: z.string().trim().min(1).max(120),
    audience: z.enum(["person", "business"]),
    interests: z.string().trim().max(180).default(""),
    locale: z.enum(["es", "en"]),
    launchConsent: z.literal(true),
    marketingConsent: z.boolean().default(false),
    turnstileToken: z.string().min(1).max(2048),
    website: z.string().max(200).default(""),
  })
  .strict();

export type LaunchWaitlistInput = z.infer<typeof launchWaitlistSchema>;

export function waitlistOriginProduct(
  origin: string | null,
): "duermo" | "coches" | null {
  return origin ? (originProduct.get(origin) ?? null) : null;
}

export function waitlistCorsHeaders(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
  if (waitlistOriginProduct(origin)) {
    headers["Access-Control-Allow-Origin"] = origin!;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Access-Control-Max-Age"] = "300";
  }
  return headers;
}

export async function boundedJson(request: Request): Promise<unknown> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_WAITLIST_BODY_BYTES) throw new Error("body_too_large");
  if (!request.body) throw new Error("missing_body");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_WAITLIST_BODY_BYTES) throw new Error("body_too_large");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function verificationToken() {
  return randomBytes(32).toString("hex");
}
export function digestToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export function rateDigest(secret: string, kind: string, value: string) {
  return createHmac("sha256", secret)
    .update(kind)
    .update(":")
    .update(value)
    .digest("hex");
}

export async function verifyTurnstile(
  token: string,
  secret: string,
  origin: string,
  fetcher: typeof fetch = fetch,
) {
  const response = await fetcher(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!response.ok) return false;
  const outcome = (await response.json()) as {
    success?: boolean;
    hostname?: string;
    action?: string;
  };
  return (
    outcome.success === true &&
    outcome.hostname === new URL(origin).hostname &&
    outcome.action === "launch_waitlist"
  );
}

export function verificationMessage({
  entryId,
  product,
  locale,
  token,
}: {
  entryId: string;
  product: "duermo" | "coches";
  locale: "es" | "en";
  token: string;
}) {
  const name = product === "duermo" ? "AkiDuermo" : "AkiCoches";
  const link = new URL("https://akipasa.com/waitlist/confirm");
  link.searchParams.set("entry", entryId);
  link.searchParams.set("token", token);
  link.searchParams.set("product", product);
  link.searchParams.set("lang", locale);
  const spanish = locale === "es";
  return {
    subject:
      (spanish ? "Confirma tu interés en " : "Confirm your ") +
      name +
      (spanish ? "" : " launch updates"),
    text: spanish
      ? [
          "Has solicitado recibir noticias sobre el lanzamiento de " +
            name +
            ".",
          "",
          "Para confirmar tu correo, abre el enlace y pulsa «Confirmar»: " +
            link,
          "",
          "El enlace caduca en 24 horas. Si no lo solicitaste, ignóralo.",
          "Puedes retirar tu consentimiento o pedir la eliminación de tus datos en support@akipasa.com.",
          "Privacidad: https://akipasa.com/es/privacy",
        ].join("\n")
      : [
          "You asked for launch updates about " + name + ".",
          "",
          "To verify your email, open the link and select Confirm: " + link,
          "",
          "The link expires in 24 hours. If this wasn't you, ignore it.",
          "You can withdraw consent or request deletion at support@akipasa.com.",
          "Privacy: https://akipasa.com/en/privacy",
        ].join("\n"),
  };
}
