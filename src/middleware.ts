import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.hostname === "www.akipasa.com") {
    const target = request.nextUrl.clone();
    target.hostname = "akipasa.com";
    return NextResponse.redirect(target, 308);
  }
  const response = await refreshSession(request);
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
