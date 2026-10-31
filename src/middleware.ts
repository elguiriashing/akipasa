import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/middleware";
import { stayLocale } from "@/lib/akiduermo-i18n";
import { stayHostRoute, stayHostMethodAllowed } from "@/lib/akiduermo-routing";
import {
  conduzcoHostRoute,
  conduzcoHostMethodAllowed,
} from "@/lib/akiconduzco-routing";
import { shouldNoindex } from "@/lib/seo";
import { accountReturnPath } from "@/lib/account-return-path";
import { workspaceReturnPath } from "@/lib/workspace-return-path";
import { akiSuiteMembershipReturnPath } from "@/lib/akisuite-catalogue";

export async function middleware(request: NextRequest) {
  request.headers.delete("x-akipasa-membership-next");
  request.headers.delete("x-akipasa-account-next");
  request.headers.delete("x-akipasa-workspace-next");
  const workspace = request.nextUrl.pathname.match(
    /^\/(en|es)\/(staff|admin)(?:\/|$)/,
  );
  if (workspace) {
    const next = workspaceReturnPath(
      workspace[1] === "en" ? "en" : "es",
      workspace[2] === "staff" ? "staff" : "admin",
      request.nextUrl.pathname + request.nextUrl.search,
    );
    if (next) request.headers.set("x-akipasa-workspace-next", next);
  }
  const accountLocale = request.nextUrl.pathname.match(
    /^\/(en|es)\/account(?:\/|$)/,
  )?.[1];
  if (accountLocale)
    request.headers.set(
      "x-akipasa-account-next",
      accountReturnPath(
        accountLocale === "en" ? "en" : "es",
        request.nextUrl.pathname + request.nextUrl.search,
      ),
    );
  const hostname = (
    request.headers.get("host")?.split(":")[0] || request.nextUrl.hostname
  ).toLowerCase();
  const isAkiBusiness = hostname === "business.akipasa.com";
  const isAkiDuermo = hostname === "akiduermo.akipasa.com";
  const isAkiConduzco = hostname === "akiconduzco.akipasa.com";
  const isStayPath =
    request.nextUrl.pathname === "/akiduermo" ||
    request.nextUrl.pathname.startsWith("/akiduermo/");
  request.headers.set(
    "x-akipasa-product",
    isAkiBusiness
      ? "akibusiness"
      : isAkiConduzco
        ? "akiconduzco"
        : isAkiDuermo || isStayPath
          ? "akiduermo"
          : "akipasa",
  );
  const operationsLocale = request.nextUrl.pathname.match(
    /^\/(en|es)\/account\/subscription\/operations\/?$/,
  )?.[1];
  if (operationsLocale) {
    request.headers.set(
      "x-akipasa-membership-next",
      akiSuiteMembershipReturnPath(
        operationsLocale === "en" ? "en" : "es",
        request.nextUrl.pathname.replace(/\/$/, "") + request.nextUrl.search,
      ),
    );
  }
  const membershipAlias = request.nextUrl.pathname.match(
    /^\/(?:(en|es)\/)?(membership|memberships|account\/(?:membership|memberships|subscription))\/?$/,
  );
  if (
    membershipAlias &&
    !(isAkiDuermo && membershipAlias[2] === "membership")
  ) {
    const target = request.nextUrl.clone();
    const locale =
      membershipAlias[1] ||
      (isAkiDuermo
        ? stayLocale(
            request.nextUrl.searchParams.get("lang"),
            request.cookies.get("akiduermo_locale")?.value,
          )
        : "es");
    const account = membershipAlias[2].startsWith("account/");
    target.pathname = `/${locale}/${account ? "account/subscription" : "membership"}`;
    if (isAkiBusiness || isAkiDuermo) {
      target.hostname = "akipasa.com";
      target.protocol = "https:";
      target.port = "";
      target.searchParams.set(
        "from",
        isAkiBusiness ? "akibusiness" : "akiduermo",
      );
    }
    if (target.toString() !== request.nextUrl.toString())
      return NextResponse.redirect(target, 307);
    if (account)
      request.headers.set(
        "x-akipasa-membership-next",
        akiSuiteMembershipReturnPath(
          target.pathname.startsWith("/en/") ? "en" : "es",
          target.pathname + target.search,
        ),
      );
  }
  if (isAkiBusiness) {
    const pathname = request.nextUrl.pathname;
    const target = request.nextUrl.clone();
    const locale = pathname.split("/")[1] === "en" ? "en" : "es";
    request.headers.set("x-akipasa-locale", locale);

    if (pathname === "/") {
      target.pathname = "/es/business";
      return NextResponse.redirect(target, 308);
    }
    if (/^\/(es|en)$/.test(pathname)) {
      target.pathname = `${pathname}/business`;
      return NextResponse.redirect(target, 308);
    }

    const allowed =
      /^\/(es|en)\/(business|auth)(?:\/|$)/.test(pathname) ||
      pathname.startsWith("/api/") ||
      pathname === "/robots.txt" ||
      pathname === "/manifest.webmanifest" ||
      pathname === "/sw.js" ||
      pathname === "/offline.html";

    if (!allowed) {
      target.hostname = "akipasa.com";
      target.protocol = "https:";
      target.port = "";
      return NextResponse.redirect(target, 307);
    }

    const response = await refreshSession(request);
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  if (isAkiDuermo || isStayPath) {
    if (
      isAkiDuermo &&
      !stayHostMethodAllowed(request.nextUrl.pathname, request.method)
    )
      return new NextResponse(null, { status: 404 });
    request.headers.set(
      "x-akipasa-locale",
      stayLocale(
        request.nextUrl.searchParams.get("lang"),
        request.cookies.get("akiduermo_locale")?.value,
      ),
    );
    const route = isAkiDuermo
      ? stayHostRoute(request.nextUrl.pathname)
      : { kind: "public" as const, path: request.nextUrl.pathname };
    const target = request.nextUrl.clone();
    target.pathname = route.path;
    if (route.kind === "legacy") {
      target.searchParams.set("lang", route.locale!);
      return NextResponse.redirect(target, 308);
    }
    if (route.kind === "canonical") return NextResponse.redirect(target, 308);
    if (route.kind === "primary") {
      target.hostname = "akipasa.com";
      target.protocol = "https:";
      target.port = "";
      return NextResponse.redirect(target, 307);
    }
    if (route.kind === "reject") return new NextResponse(null, { status: 404 });
    const sessionResponse = await refreshSession(request);
    const response =
      route.kind === "rewrite"
        ? NextResponse.rewrite(target, {
            request: { headers: request.headers },
          })
        : NextResponse.next({ request: { headers: request.headers } });
    sessionResponse.cookies
      .getAll()
      .forEach(({ name, value, ...options }) =>
        response.cookies.set(name, value, options),
      );
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }
  if (isAkiConduzco) {
    if (!conduzcoHostMethodAllowed(request.nextUrl.pathname, request.method))
      return new NextResponse(null, { status: 404 });
    const route = conduzcoHostRoute(request.nextUrl.pathname);
    const target = request.nextUrl.clone();
    target.pathname = route.path;
    request.headers.set(
      "x-akipasa-locale",
      request.nextUrl.searchParams.get("lang") === "en" ||
        request.cookies.get("akiconduzco_locale")?.value === "en"
        ? "en"
        : "es",
    );
    if (route.kind === "canonical") return NextResponse.redirect(target, 308);
    if (route.kind === "primary") {
      target.hostname = "akipasa.com";
      target.protocol = "https:";
      target.port = "";
      return NextResponse.redirect(target, 307);
    }
    if (route.kind === "reject") return new NextResponse(null, { status: 404 });
    const sessionResponse = await refreshSession(request);
    const response =
      route.kind === "rewrite"
        ? NextResponse.rewrite(target, {
            request: { headers: request.headers },
          })
        : NextResponse.next({ request: { headers: request.headers } });
    sessionResponse.cookies
      .getAll()
      .forEach(({ name, value, ...options }) =>
        response.cookies.set(name, value, options),
      );
    if (
      /^\/(account|bookings)(?:\/|$)/.test(request.nextUrl.pathname) ||
      /^\/(en|es)\/auth(?:\/|$)/.test(request.nextUrl.pathname)
    )
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }
  const mainBusinessPath = /^\/(es|en)\/business(?:\/|$)/.test(
    request.nextUrl.pathname,
  );
  if (mainBusinessPath && hostname !== "business.akipasa.com") {
    const target = request.nextUrl.clone();
    target.hostname = "business.akipasa.com";
    target.protocol = "https:";
    target.port = "";
    return NextResponse.redirect(target, 307);
  }

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
  if (
    request.cookies.has("akipals_preview") &&
    /^\/(en|es)\/map$/.test(pathname)
  ) {
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("CDN-Cache-Control", "no-store");
  }
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
