/** Public product roles never redefine historical permission or offer keys. */
export function resolveProductRoles(options: {
  roleSwap?: string;
  managementUrl?: string;
  operationsUrl?: string;
}) {
  const swapped = options.roleSwap === "true";
  function origin(
    value: string | undefined,
    legacy: string,
    target: string,
    aliases: string[],
  ) {
    const fallback = swapped ? target : legacy;
    if (!value) return fallback;
    try {
      const url = new URL(value);
      const loopback = ["localhost", "127.0.0.1"].includes(url.hostname);
      if (
        (url.protocol !== "https:" &&
          !(loopback && url.protocol === "http:")) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== "/"
      )
        return fallback;
      if (swapped && aliases.includes(url.origin)) return target;
      return url.origin;
    } catch {
      return fallback;
    }
  }
  return {
    swapped,
    managementName: swapped ? "AkiHQ" : "AkiBusiness",
    operationsName: swapped ? "AkiBusiness" : "AkiHQ",
    managementLogo: swapped ? ("hq" as const) : ("business" as const),
    operationsLogo: swapped ? ("business" as const) : ("hq" as const),
    managementUrl: origin(
      options.managementUrl,
      "https://business.akipasa.com",
      "https://akihq.app",
      [
        "https://business.akipasa.com",
        "https://akibusiness.com",
        "https://www.akibusiness.com",
      ],
    ),
    operationsUrl: origin(
      options.operationsUrl,
      "https://crm.akipasa.com",
      "https://akibusiness.com",
      ["https://crm.akipasa.com", "https://akihq.app", "https://www.akihq.app"],
    ),
  };
}

export const productRoles = resolveProductRoles({
  roleSwap: process.env.NEXT_PUBLIC_AKISUITE_ROLE_SWAP,
  managementUrl: process.env.NEXT_PUBLIC_BUSINESS_URL,
  operationsUrl: process.env.NEXT_PUBLIC_CRM_URL,
});
