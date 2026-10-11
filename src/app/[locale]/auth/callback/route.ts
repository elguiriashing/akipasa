import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { config, isLocale } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicRequestOrigin } from "@/lib/public-request-origin";
import { safeStayDestination, stayOrigin } from "@/lib/akiduermo-routing";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const safeLocale = isLocale(locale) ? locale : "es";
  const url = new URL(request.url);
  const publicOrigin = publicRequestOrigin(request.headers, url.origin);
  const code = url.searchParams.get("code");
  const requested = url.searchParams.get("next");
  const next =
    publicOrigin === stayOrigin
      ? safeStayDestination(requested ?? undefined)
      : requested?.startsWith(`/${safeLocale}/`) && !requested.startsWith("//")
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
              new URL(`/${safeLocale}/auth?error=terms`, publicOrigin),
            );
        }
        cookieStore.delete("akipasa_terms_ack");
      }
      // OAuth and email-verification callback are the first verified login.
      // The once-per-portal database key prevents replayed callback duplicates.
      try {
        const {data:{user}}=await supabase.auth.getUser();
        if(user){
          const host=new URL(publicOrigin).hostname;
          const portal=publicOrigin===stayOrigin||host.startsWith("akiduermo.")
            ?"akiduermo":host.startsWith("business.")?"akibusiness":"akipasa";
          const {error: welcomeError}=await supabase.rpc("aki_register_portal_welcome",{
            p_portal:portal,p_locale:safeLocale
          });
          if(welcomeError)console.error("welcome_callback_enqueue_failed",welcomeError.code);
        }
      }catch{console.error("welcome_callback_enqueue_unavailable")}
      return NextResponse.redirect(new URL(next, publicOrigin));
    }
  }
  return NextResponse.redirect(
    new URL(`/${safeLocale}/auth?error=callback`, publicOrigin),
  );
}
