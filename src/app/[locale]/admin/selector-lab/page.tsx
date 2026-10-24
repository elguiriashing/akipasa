import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AkiSelectorLab } from "@/components/aki-selector/AkiSelectorLab";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { isAdministrator } from "@/lib/roles";

// Deliberately absent from Admin navigation, public Explore and sitemaps.
// No feature activation, API mutation or link from consumer experiences.
export const metadata: Metadata = {
  title: "AkiSelector Lab | AkiPasa",
  robots: { index: false, follow: false },
};

export default async function SelectorLabPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase, user } = await requireUser(
    locale,
    "/" + locale + "/admin/selector-lab",
  );
  const { data: profile } = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isAdministrator(profile?.app_role ?? "")) notFound();
  return <AkiSelectorLab locale={locale} />;
}
