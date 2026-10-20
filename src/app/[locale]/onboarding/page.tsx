import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireIdentity } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { readOnboardingStatus } from "@/lib/account-onboarding-server";
import { onboardingDestination, onboardingUrl } from "@/lib/account-onboarding";
import { signOut } from "../auth/actions";
import { completeAccount } from "./actions";
import "./onboarding.css";

export const metadata = { robots: { index: false, follow: false } };
export default async function OnboardingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const next = onboardingDestination(locale, query.next);
  const { supabase } = await requireIdentity(
    locale,
    onboardingUrl(locale, next),
  );
  const status = await readOnboardingStatus(supabase);
  if (status === "complete" || status === "exempt") redirect(next);
  const es = locale === "es";
  return (
    <main className="account-completion">
      <section className="account-completion-card">
        <p className="eyebrow">AkiPasa · {es ? "Tu cuenta" : "Your account"}</p>
        <h1>
          {status === "underage"
            ? es
              ? "Tu cuenta tiene acceso restringido"
              : "Your account has restricted access"
            : es
              ? "Hazlo tuyo"
              : "Make it yours"}
        </h1>
        {status === "underage" ? (
          <>
            <p>
              {es
                ? "Has indicado que tienes menos de 18 años. Las funciones de cuenta permanecen bloqueadas. No necesitas enviarnos documentos de identidad."
                : "You declared that you are under 18. Account features remain locked. You do not need to send us identity documents."}
            </p>
            <p>
              {es
                ? "Si te has equivocado, contacta con el equipo desde Privacidad para solicitar una revisión. Cambiar la casilla o iniciar otra sesión no elimina la restricción."
                : "If this was a mistake, contact the team through Privacy to request a review. Changing the checkbox or signing in again does not remove the restriction."}
            </p>
          </>
        ) : (
          <>
            <p>
              {es
                ? "Un nombre de usuario y dos confirmaciones. La foto y la biografía son opcionales."
                : "A username and two confirmations. Your photo and biography are optional."}
            </p>
            {query.error && (
              <p role="alert" className="notice">
                {query.error === "username"
                  ? es
                    ? "Ese nombre de usuario ya está en uso."
                    : "That username is already in use."
                  : es
                    ? "No se pudo guardar. Revisa los campos e inténtalo de nuevo."
                    : "Could not save. Check the fields and try again."}
              </p>
            )}
            <form action={completeAccount} className="stack" noValidate>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="next" value={next} />
              <label>
                {es ? "Nombre de usuario" : "Username"}
                <input
                  name="username"
                  autoComplete="username"
                  minLength={3}
                  maxLength={30}
                  pattern="[a-zA-Z0-9_]{3,30}"
                  aria-describedby="username-help"
                />
              </label>
              <small id="username-help">
                {es
                  ? "De 3 a 30 letras, números o guiones bajos."
                  : "3–30 letters, numbers or underscores."}
              </small>
              <label>
                {es ? "Foto (opcional)" : "Photo (optional)"}
                <input
                  type="file"
                  name="file"
                  accept="image/jpeg,image/png,image/webp"
                />
                <small>JPEG, PNG, WebP · 10 MB</small>
              </label>
              <label>
                {es ? "Biografía (opcional)" : "Biography (optional)"}
                <textarea name="bio" maxLength={2000} rows={3} />
              </label>
              <fieldset>
                <legend>{es ? "Edad de acceso" : "Age eligibility"}</legend>
                <label className="consent-row">
                  <input type="radio" name="adult" value="yes" />
                  {es
                    ? "Declaro que tengo al menos 18 años"
                    : "I declare that I am at least 18 years old"}
                </label>
                <label className="consent-row">
                  <input type="radio" name="adult" value="no" />
                  {es ? "Tengo menos de 18 años" : "I am under 18"}
                </label>
                <small>
                  {es
                    ? "Es una declaración, no una edad verificada."
                    : "This is a declaration, not verified age."}
                </small>
              </fieldset>
              <label className="consent-row">
                <input type="checkbox" name="acceptTerms" value="accepted" />
                <span>
                  {es ? "Acepto las " : "I accept the "}
                  <Link href={`/${locale}/terms`}>
                    {es ? "condiciones" : "terms"}
                  </Link>
                  {es ? " y he leído la " : " and have read the "}
                  <Link href={`/${locale}/privacy`}>
                    {es ? "política de privacidad" : "privacy policy"}
                  </Link>
                  .
                </span>
              </label>
              <p>
                <small>
                  {es
                    ? "El seguimiento opcional se elige por separado en Opciones de privacidad. Completar la cuenta no lo activa."
                    : "Choose optional tracking separately in Privacy choices. Completing your account does not enable it."}
                </small>
              </p>
              <button type="submit" className="button">
                {es ? "Guardar y continuar" : "Save and continue"}
              </button>
            </form>
          </>
        )}
        <nav aria-label={es ? "Control de cuenta" : "Account controls"}>
          <Link href={`/${locale}/onboarding/privacy`}>
            {es ? "Privacidad y eliminar cuenta" : "Privacy and delete account"}
          </Link>
          <Link href={`/${locale}/terms`}>{es ? "Condiciones" : "Terms"}</Link>
        </nav>
        <form action={signOut}>
          <input type="hidden" name="locale" value={locale} />
          <button className="button secondary" type="submit">
            {es ? "Cerrar sesión" : "Sign out"}
          </button>
        </form>
      </section>
    </main>
  );
}
