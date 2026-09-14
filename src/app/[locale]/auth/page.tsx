import { notFound } from "next/navigation";
import { config, isLocale } from "@/lib/config";
import {
  requestMagicLink,
  requestPasswordReset,
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
} from "./actions";

export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const es = locale === "es";
  const next = query.next || `/${locale}/account`;
  const businessIntent = next.startsWith(`/${locale}/business/apply`);
  const mode = ["signup", "magic", "recover"].includes(query.mode ?? "")
    ? query.mode
    : "signin";
  const modeHref = (target: string) => {
    const search = new URLSearchParams({ mode: target });
    if (query.next) search.set("next", query.next);
    return `/${locale}/auth?${search.toString()}`;
  };
  return (
    <main className="auth-page">
      <section className="auth-intro">
        <div className="auth-intro-copy">
          <div className="eyebrow">
            {businessIntent
              ? es
                ? "Paso 1 de 3 · Añade tu negocio"
                : "Step 1 of 3 · Add your business"
              : es
                ? "Cuenta"
                : "Account"}
          </div>
          <h1>
            {businessIntent
              ? es
                ? "Primero, crea tu cuenta gratuita"
                : "First, create your free account"
              : es
                ? "Tu cuenta AkiPasa"
                : "Your AkiPasa account"}
          </h1>
          <p className="lede">
            {businessIntent
              ? es
                ? "Después volverás directamente a la solicitud de tu negocio. No pagarás nada hoy."
                : "Afterwards, we will take you straight back to your business application. You will not pay anything today."
              : es
                ? "Crea una cuenta con email, entra con Google o usa un enlace seguro."
                : "Create an account with email, continue with Google, or use a secure link."}
          </p>
        </div>
        <div className="auth-intro-note" aria-hidden="true">
          <span>{es ? "Tu lugar para" : "Your place for"}</span>
          <strong>
            {es
              ? "descubrir · conectar · volver"
              : "discover · connect · return"}
          </strong>
        </div>
      </section>
      {businessIntent && (
        <aside
          className="auth-journey"
          aria-label={es ? "Siguiente paso" : "Next step"}
        >
          <strong>
            {es ? "Lo siguiente: datos del negocio" : "Next: business details"}
          </strong>
          <span>
            {es
              ? "Solo te pediremos el nombre, la localidad y una breve descripción."
              : "We will only ask for its name, town or city, and a short description."}
          </span>
        </aside>
      )}
      <section className="auth-focus-panel">
        {query.sent && (
          <p className="notice">
            {es
              ? "Enlace enviado. Revisa tu correo."
              : "Link sent. Check your email."}
          </p>
        )}
        {query.registered && (
          <p className="notice">
            {es
              ? "Cuenta creada. Confirma tu dirección de email para entrar."
              : "Account created. Confirm your email address to sign in."}
          </p>
        )}
        {query.recovery === "sent" && (
          <p className="notice">
            {es
              ? "Si existe una cuenta con ese email, recibirás un enlace para restablecer la contraseña."
              : "If an account exists for that email, you will receive a password-reset link."}
          </p>
        )}
        {query.reset && (
          <p className="notice">
            {es
              ? "Contraseña actualizada. Ya puedes entrar."
              : "Password updated. You can now sign in."}
          </p>
        )}
        {query.error && (
          <p className="notice">
            {es
              ? "No se pudo completar el acceso. Revisa los datos e inténtalo de nuevo."
              : "Authentication could not be completed. Check the details and try again."}
          </p>
        )}
        <nav
          className="auth-modes"
          aria-label={es ? "Opciones de acceso" : "Access options"}
        >
          <a
            className={mode === "signin" ? "active" : ""}
            href={modeHref("signin")}
          >
            {es ? "Entrar" : "Sign in"}
          </a>
          <a
            className={mode === "signup" ? "active" : ""}
            href={modeHref("signup")}
          >
            {es ? "Crear cuenta" : "Create account"}
          </a>
        </nav>
        <div className="auth-form-head">
          <span>
            {mode === "signup"
              ? es
                ? "Empieza gratis"
                : "Start for free"
              : mode === "magic"
                ? es
                  ? "Enlace seguro"
                  : "Secure link"
                : mode === "recover"
                  ? es
                    ? "Recupera tu acceso"
                    : "Recover access"
                  : es
                    ? "Te damos la bienvenida"
                    : "Welcome back"}
          </span>
          <h2>
            {mode === "signup"
              ? es
                ? "Crea tu cuenta"
                : "Create your account"
              : mode === "magic"
                ? es
                  ? "Entra sin contraseña"
                  : "Sign in without a password"
                : mode === "recover"
                  ? es
                    ? "Restablece tu contraseña"
                    : "Reset your password"
                  : es
                    ? "Entra en AkiPasa"
                    : "Sign in to AkiPasa"}
          </h2>
        </div>
        {config.googleAuthEnabled && mode !== "recover" && mode !== "magic" && (
          <>
            <form action={signInWithGoogle} className="stack">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="next" value={next} />
              <TermsConsent locale={locale} suffix="google" />
              <button className="button google-button" type="submit">
                <span aria-hidden="true">G</span>
                {es ? "Continuar con Google" : "Continue with Google"}
              </button>
            </form>
            <div className="auth-divider">
              <span>{es ? "o con email" : "or with email"}</span>
            </div>
          </>
        )}
        {mode === "signup" && (
          <form action={signUpWithPassword} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="next" value={next} />
            <label>
              Email
              <input name="email" type="email" required autoComplete="email" />
            </label>
            <label>
              {es ? "Contraseña" : "Password"}
              <input
                name="password"
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                aria-describedby="password-help"
              />
            </label>
            <small id="password-help">
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
            <TermsConsent locale={locale} suffix="password" />
            <button className="button" type="submit">
              {es ? "Crear cuenta" : "Create account"}
            </button>
          </form>
        )}
        {mode === "signin" && (
          <form action={signInWithPassword} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="next" value={next} />
            <label>
              Email
              <input name="email" type="email" required autoComplete="email" />
            </label>
            <label>
              <span className="auth-label-line">
                {es ? "Contraseña" : "Password"}
                <a href={modeHref("recover")}>
                  {es ? "¿La has olvidado?" : "Forgot it?"}
                </a>
              </span>
              <input
                name="password"
                type="password"
                required
                maxLength={128}
                autoComplete="current-password"
              />
            </label>
            <button className="button" type="submit">
              {es ? "Entrar" : "Sign in"}
            </button>
          </form>
        )}
        {mode === "magic" && (
          <form action={requestMagicLink} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="next" value={next} />
            <label htmlFor="magic-email">Email</label>
            <input
              id="magic-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
            <button className="button" type="submit">
              {es ? "Enviar enlace" : "Send sign-in link"}
            </button>
          </form>
        )}
        {mode === "recover" && (
          <form action={requestPasswordReset} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <label htmlFor="recovery-email">Email</label>
            <input
              id="recovery-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
            <button className="button" type="submit">
              {es ? "Enviar enlace de recuperación" : "Send recovery link"}
            </button>
          </form>
        )}
        <div className="auth-secondary">
          {mode !== "magic" && (
            <a href={modeHref("magic")}>
              {es ? "Usar un enlace de acceso" : "Use a sign-in link"}
            </a>
          )}
          {(mode === "magic" || mode === "recover") && (
            <a href={modeHref("signin")}>
              {es ? "Volver a entrar" : "Back to sign in"}
            </a>
          )}
        </div>
      </section>
    </main>
  );
}

function TermsConsent({
  locale,
  suffix,
}: {
  locale: "es" | "en";
  suffix: string;
}) {
  const es = locale === "es";
  return (
    <label className="consent-row" htmlFor={`accept-terms-${suffix}`}>
      <input
        id={`accept-terms-${suffix}`}
        name="acceptTerms"
        type="checkbox"
        value="accepted"
        required
      />
      <span>
        {es ? "Acepto las " : "I accept the "}
        <a href={`/${locale}/terms`}>{es ? "condiciones" : "terms"}</a>
        {es ? " y he leído la " : " and have read the "}
        <a href={`/${locale}/privacy`}>
          {es ? "política de privacidad" : "privacy policy"}
        </a>
        .
      </span>
    </label>
  );
}
