import { AdminReadFailure, AdminMutationNotice } from "../AdminReadState";
import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { FocusedCatalogue } from "../FocusedCatalogue";

export default async function PlatformSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = (await searchParams) || {};
  const { supabase } = await requireUser(locale, `/${locale}/admin/settings`);
  const { data, error } = await supabase
    .from("feature_flags")
    .select("key,enabled,label_es,label_en,updated_at")
    .order("key");
  const es = locale === "es";
  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Configuración" : "Configuration"}
        title={es ? "Controles de plataforma" : "Platform controls"}
        description={
          es
            ? "Los interruptores permanecen cerrados hasta que selecciones uno. Cada cambio requiere un motivo."
            : "Controls stay collapsed until selected. Every change requires a reason."
        }
      />
      <AdminMutationNotice locale={locale} query={query} />
      {error ? (
        <AdminReadFailure locale={locale} href={`/${locale}/admin/settings`} />
      ) : (
        <FocusedCatalogue locale={locale} section="flags" flags={data || []} />
      )}
    </>
  );
}
