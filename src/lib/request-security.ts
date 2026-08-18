export class RequestSecurityError extends Error {
  constructor(
    message: string,
    readonly status = 403,
    readonly code = "invalid_origin",
  ) {
    super(message);
  }
}

export function requireSameOriginRequest(request: Request) {
  const expected = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (origin) {
    if (origin === expected) return;
    throw new RequestSecurityError("Same-origin request required");
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "same-origin" || fetchSite === "same-site") return;

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      if (new URL(referer).origin === expected) return;
    } catch {
      // Fall through to the same generic rejection.
    }
  }
  throw new RequestSecurityError("Same-origin request required");
}
