const productionHosts = new Set([
  "akipasa.com",
  "www.akipasa.com",
  "business.akipasa.com",
  "crm.akipasa.com",
]);

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || "";
}

function allowedHost(host: string) {
  const hostname = host.split(":")[0]?.toLowerCase() || "";
  return (
    productionHosts.has(hostname) ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  );
}

export function publicRequestOrigin(headers: Headers, fallback = "https://akipasa.com") {
  const forwardedHost = firstHeaderValue(headers.get("x-forwarded-host"));
  const host = forwardedHost || firstHeaderValue(headers.get("host"));

  if (host && allowedHost(host)) {
    const forwardedProto = firstHeaderValue(headers.get("x-forwarded-proto"));
    const hostname = host.split(":")[0]?.toLowerCase();
    const proto =
      forwardedProto === "http" || forwardedProto === "https"
        ? forwardedProto
        : hostname === "localhost" || hostname === "127.0.0.1"
          ? "http"
          : "https";
    return `${proto}://${host}`;
  }

  const origin = headers.get("origin");
  if (origin) {
    try {
      const parsed = new URL(origin);
      if (allowedHost(parsed.host)) return parsed.origin;
    } catch {
      // Ignore malformed or untrusted Origin headers.
    }
  }

  return fallback;
}
