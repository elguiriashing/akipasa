import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { updateAccountProfile } from "../actions";

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const { supabase, user } = await requireUser(locale);
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,preferred_locale")
    .eq("id", user.id)
    .maybeSingle();
  const es = locale === "es";

  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Identidad" : "Identity"}
        title={es ? "Perfil" : "Profile"}
        description={
          es
            ? "La información que usas dentro de AkiPasa."
            : "The information you use inside AkiPasa."
        }
      />
      {query.updated && (
        <p className="notice">
          {es ? "Perfil actualizado." : "Profile updated."}
        </p>
      )}
      {query.error && (
        <p className="notice">
          {es ? "No se pudo actualizar." : "Update failed."}
        </p>
      )}
      <form action={updateAccountProfile} className="panel stack focused-form">
        <input type="hidden" name="locale" value={locale} />
        <label>
          {es ? "Nombre visible" : "Display name"}
          <input
            name="displayName"
            defaultValue={profile?.display_name || ""}
            minLength={2}
            maxLength={100}
          />
        </label>
        <label>
          Email
          <input value={user.email || ""} readOnly disabled />
          <small>
            {es
              ? "El email se gestiona con tu método de acceso."
              : "Email is managed by your sign-in method."}
          </small>
        </label>
        <label>
          {es ? "Idioma preferido" : "Preferred language"}
          <select
            name="preferredLocale"
            defaultValue={profile?.preferred_locale || locale}
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </label>
        <button className="button" type="submit">
          {es ? "Guardar perfil" : "Save profile"}
        </button>
      </form>
    </>
  );
}
