import { readOnboardingStatus } from "@/lib/account-onboarding-server";
import { onboardingUrl } from "@/lib/account-onboarding";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { renderAndroidReturnPage } from "@/lib/android-return-page";
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
    const nonce = crypto.randomUUID().replaceAll("-", "");
    const script =
      'var seconds=5;var counter=document.getElementById("return-seconds");var ticker=setInterval(function(){seconds=Math.max(0,seconds-1);if(counter)counter.textContent=String(seconds);if(seconds===0)clearInterval(ticker)},1000);setTimeout(function(){location.assign(document.getElementById("android-return").href)},5000);';
    return new NextResponse(
      renderAndroidReturnPage({
        brand: "pasa",
        name: "AkiPasa",
        locale: safeLocale,
        target: handoff,
        nonce,
        script,
        id: "android-return",
      }),
      {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
          "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
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
