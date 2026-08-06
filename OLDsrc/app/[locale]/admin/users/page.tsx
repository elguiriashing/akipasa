import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { isLocale } from "@/lib/config";
import { UserSearch } from "./UserSearch";

export default async function UsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const es = locale === "es";
  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Directorio" : "Directory"}
        title={es ? "Usuarios y roles" : "Users and roles"}
        description={
          es
            ? "Busca una cuenta antes de abrirla. No se descarga el directorio completo al navegador."
            : "Search before opening an account. The full directory is never downloaded to the browser."
        }
      />
      <UserSearch locale={locale} />
    </>
  );
}
