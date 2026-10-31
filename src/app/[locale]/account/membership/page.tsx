import { redirect } from "next/navigation";
import { isLocale } from "@/lib/config";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";

export default async function MembershipRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requireUser(locale, `/${locale}/account/membership`);
  redirect(`/${locale}/account/subscription`);
}
