import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/middleware";
import { shouldNoindex } from "@/lib/seo";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.hostname === "www.akipasa.com") {
    const target = request.nextUrl.clone();
    target.hostname = "akipasa.com";
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
  return response;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
