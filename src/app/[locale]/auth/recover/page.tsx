import { AuthBrand } from "@/components/AuthBrand";
import styles from "./recovery.module.css";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { config, isLocale } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeAuthDestinationForOrigin } from "@/lib/auth-security";
import { publicRequestOrigin } from "@/lib/public-request-origin";
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
  const query = await searchParams;
  const requestHeaders = await headers();
  const origin = publicRequestOrigin(
    new Headers(requestHeaders),
    config.siteUrl,
  );
  const next = safeAuthDestinationForOrigin(locale, query.next, origin);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    redirect(
      `/${locale}/auth?${new URLSearchParams({ error: "recovery", next })}`,
    );
  const es = locale === "es";
  const product = requestHeaders.get("x-akipasa-product");
  const consumer = !["akibusiness", "akiduermo", "akiconduzco"].includes(
    product ?? "",
  );

  return (
    <main className={consumer ? styles.recovery : "shell"}>
      {consumer && <AuthBrand locale={locale} />}
      <section className={consumer ? styles.intro : "hero"}>
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
          <p className="notice" role="alert">
            {es
              ? "No se pudo guardar la contraseña. Revisa los requisitos."
              : "The password could not be saved. Check the requirements."}
          </p>
        )}
        <form action={updateRecoveredPassword} className="stack">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="next" value={next} />
          <label>
            {es ? "Nueva contraseña" : "New password"}
            <input
              aria-describedby="recovery-password-requirements"
              name="password"
              type="password"
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
            />
          </label>
          <small id="recovery-password-requirements">
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
