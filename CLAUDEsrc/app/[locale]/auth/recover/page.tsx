import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateRecoveredPassword } from "./actions";

export default async function RecoverPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth?error=recovery`);
  const query = await searchParams;
  const es = locale === "es";

  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">{es ? "Seguridad" : "Security"}</div>
        <h1>{es ? "Crea una nueva contraseña" : "Create a new password"}</h1>
        <p className="lede">
          {es
            ? "El enlace de recuperación se usa una sola vez."
            : "The recovery link is intended for one-time use."}
        </p>
      </section>
      <section className="panel auth-panel">
        {query.error && (
          <p className="notice">
            {es
              ? "No se pudo guardar la contraseña. Revisa los requisitos."
              : "The password could not be saved. Check the requirements."}
          </p>
        )}
        <form action={updateRecoveredPassword} className="stack">
          <input type="hidden" name="locale" value={locale} />
          <label>
            {es ? "Nueva contraseña" : "New password"}
            <input
              name="password"
              type="password"
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
            />
          </label>
          <small>
            {es
              ? "12+ caracteres, con mayúscula, minúscula y número."
              : "12+ characters with uppercase, lowercase, and a number."}
          </small>
          <label>
            {es ? "Repetir contraseña" : "Confirm password"}
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
            />
          </label>
          <button className="button" type="submit">
            {es ? "Actualizar contraseña" : "Update password"}
          </button>
        </form>
      </section>
    </main>
  );
}
