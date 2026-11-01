import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function GET(request: NextRequest) {
  const hostname = (
    request.headers.get("host")?.split(":")[0] || request.nextUrl.hostname
  ).toLowerCase();
  const product =
    hostname === "business.akipasa.com"
      ? "business"
      : hostname === "akiduermo.akipasa.com"
        ? "duermo"
        : hostname === "akiconduzco.akipasa.com"
          ? "coches"
          : "pasa-2026";
  // Reuse the versioned asset for historical installation URLs as well.
  return NextResponse.redirect(
    new URL(`/brand/v3/${product}.svg`, request.url),
    {
      status: 307,
      headers: { "Cache-Control": "public, max-age=3600" },
    },
  );
}
