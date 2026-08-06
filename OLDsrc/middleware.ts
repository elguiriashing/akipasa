import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.hostname === "www.akipasa.com") {
    const target = request.nextUrl.clone();
    target.hostname = "akipasa.com";
    return NextResponse.redirect(target, 308);
  }
  return refreshSession(request);
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
