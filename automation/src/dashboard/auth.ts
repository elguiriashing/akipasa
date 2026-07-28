import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import type { AppEnvironment, Bindings } from "../bindings";
import { signHmac, verifyHmac } from "../security/hmac";
import { sha256Hex } from "../security/canonical";

const sessionCookie = "akipasa_automation_session";

async function constantTimePasswordMatch(expected: string, supplied: string) {
  const [expectedHash, suppliedHash] = await Promise.all([
    sha256Hex(expected),
    sha256Hex(supplied),
  ]);
  let difference = 0;
  for (let index = 0; index < expectedHash.length; index += 1) {
    difference |=
      expectedHash.charCodeAt(index) ^ suppliedHash.charCodeAt(index);
  }
  return difference === 0;
}

export async function verifyDashboardPassword(env: Bindings, supplied: string) {
  return constantTimePasswordMatch(env.DASHBOARD_PASSWORD, supplied);
}

export async function createDashboardSession(env: Bindings, now = new Date()) {
  const ttl = Number(env.DASHBOARD_SESSION_TTL_SECONDS);
  const payload = btoa(
    JSON.stringify({
      exp: Math.floor(now.getTime() / 1_000) + ttl,
      nonce: crypto.randomUUID(),
    }),
  )
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
  return `${payload}.${await signHmac(env.DASHBOARD_SESSION_SECRET, payload)}`;
}

export async function isDashboardAuthenticated(
  context: Context<AppEnvironment>,
) {
  const token = getCookie(context, sessionCookie);
  if (!token) return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;
  if (
    !(await verifyHmac(
      context.env.DASHBOARD_SESSION_SECRET,
      payload,
      `v1=${signature}`,
    ))
  ) {
    return false;
  }
  try {
    const base64 = payload.replaceAll("-", "+").replaceAll("_", "/");
    const paddedBase64 = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    const decoded = JSON.parse(atob(paddedBase64)) as { exp?: number };
    return (
      typeof decoded.exp === "number" &&
      decoded.exp > Math.floor(Date.now() / 1_000)
    );
  } catch {
    return false;
  }
}

export function setDashboardSession(
  context: Context<AppEnvironment>,
  token: string,
) {
  setCookie(context, sessionCookie, token, {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
    path: "/dashboard",
    maxAge: Number(context.env.DASHBOARD_SESSION_TTL_SECONDS),
  });
}

export function clearDashboardSession(context: Context<AppEnvironment>) {
  setCookie(context, sessionCookie, "", {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
    path: "/dashboard",
    maxAge: 0,
  });
}

export function hasSameOrigin(context: Context<AppEnvironment>) {
  const origin = context.req.header("origin");
  const requestOrigin = new URL(context.req.url).origin;
  if (origin && origin !== "null") {
    return origin === requestOrigin;
  }

  const referer = context.req.header("referer");
  if (referer) {
    try {
      return new URL(referer).origin === requestOrigin;
    } catch {
      return false;
    }
  }

  return (
    context.req.header("sec-fetch-site") === "same-origin" &&
    ["navigate", "same-origin"].includes(
      context.req.header("sec-fetch-mode") || "",
    )
  );
}
