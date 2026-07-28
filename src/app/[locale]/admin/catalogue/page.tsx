import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { FocusedCatalogue } from "../FocusedCatalogue";

export default async function AdminCataloguePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const section = query.section === "cities" ? "cities" : "categories";
  const { supabase } = await requireUser(locale, `/${locale}/admin/catalogue`);
  const response =
    section === "categories"
      ? await supabase
          .from("categories")
          .select("id,slug,name_es,name_en")
          .order("slug")
      : await supabase
          .from("cities")
          .select("id,slug,name_es,name_en,center,timezone")
          .order("name_es")
          .limit(100);
  const categories =
    section === "categories"
      ? (response.data as Array<{
          id: string;
          slug: string;
          name_es: string;
          name_en: string;
        }>)
      : [];
  const cities =
    section === "cities"
      ? (response.data as Array<{
          id: string;
          slug: string;
          name_es: string;
          name_en: string | null;
          center: unknown;
          timezone: string;
        }>)
      : [];
  const es = locale === "es";
  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Estructura" : "Structure"}
        title={es ? "Catálogo de plataforma" : "Platform catalogue"}
        description={
          es
            ? "Abre una taxonomía y después el registro que quieras editar."
            : "Open one taxonomy, then disclose only the record you need to edit."
        }
      />
      <nav
        className="workspace-subnav"
        aria-label={es ? "Secciones de catálogo" : "Catalogue sections"}
      >
        <Link
          href={`/${locale}/admin/catalogue?section=categories`}
          className={section === "categories" ? "active" : undefined}
        >
          {es ? "Categorías" : "Categories"}
        </Link>
        <Link
          href={`/${locale}/admin/catalogue?section=cities`}
          className={section === "cities" ? "active" : undefined}
        >
          {es ? "Localidades" : "Localities"}
        </Link>
      </nav>
      <FocusedCatalogue
        locale={locale}
        section={section}
        categories={categories || []}
        cities={cities || []}
      />
    </>
  );
}
