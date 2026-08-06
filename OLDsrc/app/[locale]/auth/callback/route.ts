import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { config, isLocale } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const safeLocale = isLocale(locale) ? locale : "es";
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requested = url.searchParams.get("next");
  const next = requested?.startsWith(`/${safeLocale}/`)
    ? requested
    : `/${safeLocale}/account`;
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
              new URL(`/${safeLocale}/auth?error=terms`, url.origin),
            );
        }
        cookieStore.delete("akipasa_terms_ack");
      }
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }
  return NextResponse.redirect(
    new URL(`/${safeLocale}/auth?error=callback`, url.origin),
  );
}
