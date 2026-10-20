import { NextResponse } from "next/server";
import { requireIdentity } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import {
  accountResumeNext,
  accountTaskResume,
} from "@/lib/account-task-resume";
import { readOnboardingStatus } from "@/lib/account-onboarding-server";
import { onboardingUrl } from "@/lib/account-onboarding";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  if (!isLocale(locale)) return new NextResponse(null, { status: 404 });
  const query = new URL(request.url).searchParams;
  const product = query.get("product");
  const path = query.get("path") || undefined;
  const next = accountResumeNext(product, locale, path);
  const { supabase } = await requireIdentity(locale, next);
  const status = await readOnboardingStatus(supabase);
  if (status === "pending" || status === "underage")
    return NextResponse.redirect(
      new URL(onboardingUrl(locale, next), "https://akipasa.com"),
    );
  const target = accountTaskResume(product, locale, path);
  return NextResponse.redirect(
    target?.url || `https://akipasa.com/${locale}/account`,
  );
}
