import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { isAdministrator } from "@/lib/roles";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { AwardManager } from "./AwardManager";
export default async function AwardsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase, user } = await requireUser(
    locale,
    `/${locale}/admin/passports/awards`,
  );
  const { data } = await supabase
    .from("profiles")
    .select("app_role")
    .eq("id", user.id)
    .maybeSingle();
  if (!data || !isAdministrator(data.app_role)) notFound();
  return (
    <>
      <WorkspacePageHeader
        eyebrow="AkiPasa"
        title={
          locale === "es" ? "Sellos y reconocimientos" : "Stamps and awards"
        }
        description={
          locale === "es"
            ? "Otorga niveles manuales sin modificar visitas, XP ni recompensas."
            : "Grant manual tiers without changing visits, XP or rewards."
        }
      />
      <nav className="action-row">
        <Link href={`/${locale}/admin/passports`}>
          {locale === "es" ? "Rutas" : "Routes"}
        </Link>
        <Link href={`/${locale}/admin/achievements/venues`}>
          {locale === "es" ? "Clasificar locales" : "Classify venues"}
        </Link>
      </nav>
      <AwardManager locale={locale} />
    </>
  );
}
