import { readOnboardingStatus } from "@/lib/account-onboarding-server";
import { onboardingUrl } from "@/lib/account-onboarding";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { config, isLocale } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicRequestOrigin } from "@/lib/public-request-origin";
import {
  safeAuthDestinationForOrigin,
  taskFromAuthCallback,
} from "@/lib/auth-security";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const safeLocale = isLocale(locale) ? locale : "es";
  const url = new URL(request.url);
  const publicOrigin = publicRequestOrigin(request.headers, url.origin);
  const code = url.searchParams.get("code");
  // Chrome cannot read the WebView's PKCE verifier cookie. Give a locally
  // installed Android app an explicit return link before exchanging the code.
  if (
    url.searchParams.get("android") === "1" &&
    url.searchParams.get("native") !== "1"
  ) {
    const handoff = new URL("akipasa://auth/callback");
    handoff.searchParams.set("locale", safeLocale);
    if (code) handoff.searchParams.set("code", code);
    const requestedNext = url.searchParams.get("next");
    if (requestedNext) handoff.searchParams.set("next", requestedNext);
    for (const key of ["error", "error_code", "error_description"]) {
      const value = url.searchParams.get(key);
      if (value) handoff.searchParams.set(key, value);
    }
    return new NextResponse(
      `<!doctype html><html lang="${safeLocale}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>AkiPasa</title></head><body style="font:16px system-ui;background:#fbf7f1;color:#14213d;padding:24px;max-width:30rem;margin:12vh auto"><h1>AkiPasa</h1><p>${safeLocale === "es" ? "Vuelve a AkiPasa para terminar de iniciar sesión." : "Return to AkiPasa to finish signing in."}</p><a style="display:inline-block;padding:16px 24px;background:#f26b1d;color:#14213d;border-radius:16px;font-weight:700" href="${handoff.toString().replaceAll("&", "&amp;").replaceAll('"', "&quot;")}">${safeLocale === "es" ? "Volver a AkiPasa" : "Return to AkiPasa"}</a></body></html>`,
      {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
          "Content-Security-Policy":
            "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
        },
      },
    );
  }
  const requested = url.searchParams.get("next");
  const next = safeAuthDestinationForOrigin(
    safeLocale,
    requested ?? undefined,
    publicOrigin,
  );
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const cookieStore = await cookies();
      if (
        cookieStore.get("akipasa_terms_ack")?.value ===
        config.currentTermsVersion
      ) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { error: acceptanceError } = await supabase.rpc(
            "accept_current_terms",
            {
              p_version: config.currentTermsVersion,
              p_locale: safeLocale,
            },
          );
          if (acceptanceError)
            return NextResponse.redirect(
              new URL(`/${safeLocale}/auth?error=terms`, publicOrigin),
            );
        }
        cookieStore.delete("akipasa_terms_ack");
      }
      // Password recovery must remain accessible even while account features are locked.
      if (!/^\/(en|es)\/auth\/recover(?:\?|$)/.test(next)) {
        const status = await readOnboardingStatus(supabase);
        if (status === "pending" || status === "underage")
          return NextResponse.redirect(
            new URL(onboardingUrl(safeLocale, next), publicOrigin),
          );
      }
      return NextResponse.redirect(new URL(next, publicOrigin));
    }
  }
  return NextResponse.redirect(
    new URL(
      `/${safeLocale}/auth?${new URLSearchParams({
        error: "callback",
        next: taskFromAuthCallback(
          safeLocale,
          requested ?? undefined,
          publicOrigin,
        ),
      })}`,
      publicOrigin,
    ),
  );
}
