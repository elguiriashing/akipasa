import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { FocusedCatalogue } from "../FocusedCatalogue";

export default async function PlatformSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase } = await requireUser(locale, `/${locale}/admin/settings`);
  const { data } = await supabase
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
      <FocusedCatalogue locale={locale} section="flags" flags={data || []} />
    </>
  );
}
