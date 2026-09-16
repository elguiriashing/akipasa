import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/middleware";
import { shouldNoindex } from "@/lib/seo";

export async function middleware(request: NextRequest) {
  // Resolve the canonical landing URL before session refresh and page rendering.
  // Combine www + root normalization into one hop and preserve query parameters.
  if (
    request.nextUrl.hostname === "www.akipasa.com" ||
    request.nextUrl.pathname === "/"
  ) {
    const target = request.nextUrl.clone();
    if (target.hostname === "www.akipasa.com") target.hostname = "akipasa.com";
    if (target.pathname === "/") target.pathname = "/es";
    return NextResponse.redirect(target, 308);
  }
  const pathname = request.nextUrl.pathname;
  if (
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/sitemap-") ||
    pathname.startsWith("/sitemaps/")
  ) {
    return NextResponse.next();
  }
  // Derive the document language from the validated route, never a client header.
  request.headers.set(
    "x-akipasa-locale",
    pathname.split("/")[1] === "en" ? "en" : "es",
  );
  const response = await refreshSession(request);
  if (shouldNoindex(pathname))
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  const secure = request.nextUrl.protocol === "https:";
  if (!request.cookies.has("ak_anonymous_id")) {
    response.cookies.set("ak_anonymous_id", crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  if (!request.cookies.has("ak_session_id")) {
    response.cookies.set("ak_session_id", crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 30,
    });
  }
  return response;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
