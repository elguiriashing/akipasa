import { notFound } from "next/navigation";
import { Icon } from "@/components/Icons";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { AccountPageHeader } from "../AccountPageHeader";
import {
  requestAccountEmailChange,
  requestAccountPasswordReset,
} from "../actions";
import { signOut } from "../../auth/actions";

export default async function AccountSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const { user } = await requireUser(locale);
  const es = locale === "es";
  const emailError =
    query.error === "email-validation"
      ? es
        ? "Introduce una dirección de correo válida."
        : "Enter a valid email address."
      : query.error === "email-same"
        ? es
          ? "Ese correo ya está vinculado a tu cuenta."
          : "That email is already linked to your account."
        : query.error?.startsWith("email")
          ? es
            ? "No pudimos iniciar el cambio de correo. Inténtalo de nuevo."
            : "We could not start the email change. Try again."
          : null;

  return (
    <div className="account-controls-page">
      <AccountPageHeader
        eyebrow={es ? "Preferencias" : "Preferences"}
        title={es ? "Ajustes" : "Settings"}
        description={
          es
            ? "Gestiona el acceso y la sesión de tu cuenta."
            : "Manage account access and your current session."
        }
      />
      <section className="account-settings-grid">
        <article className="account-control-card account-email-card">
          <header className="account-control-heading">
            <span className="account-control-icon">
              <Icon name="inbox" />
            </span>
            <div>
              <h2>{es ? "Correo de la cuenta" : "Account email"}</h2>
              <p>
                {es
                  ? "Tu dirección para iniciar sesión."
                  : "Your sign-in address."}
              </p>
            </div>
          </header>
          <p className="account-email-value">
            {user.email || (es ? "Sin correo vinculado" : "No linked email")}
          </p>
          {query.email === "pending" && (
            <p className="notice notice-success" role="status">
              {es
                ? "Te hemos enviado un enlace de confirmación al nuevo correo. El cambio se completará cuando lo apruebes."
                : "We sent a confirmation link to the new email. The change completes when you approve it."}
            </p>
          )}
          {query.email === "confirmed" && (
            <p className="notice notice-success" role="status">
              {es
                ? "Correo actualizado correctamente."
                : "Email updated successfully."}
            </p>
          )}
          {emailError && (
            <p className="notice notice-error" role="alert">
              {emailError}
            </p>
          )}
          <details
            className="account-control-disclosure"
            open={Boolean(emailError)}
          >
            <summary>{es ? "Cambiar correo" : "Change email"}</summary>
            <div className="account-disclosure-content">
              <p className="account-control-help">
                {es
                  ? "Confirma el nuevo correo para completar el cambio. Tus datos y tu acceso se conservan en la misma cuenta."
                  : "Confirm the new email to complete the change. Your data and access stay on the same account."}
              </p>
              <form
                action={requestAccountEmailChange}
                className="account-control-form"
              >
                <input type="hidden" name="locale" value={locale} />
                <label htmlFor="current-email">
                  {es ? "Correo actual" : "Current email"}
                  <input
                    id="current-email"
                    type="email"
                    value={user.email || ""}
                    readOnly
                    disabled
                  />
                </label>
                <label htmlFor="new-email">
                  {es ? "Nuevo correo" : "New email"}
                  <input
                    id="new-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    placeholder={es ? "nombre@ejemplo.com" : "name@example.com"}
                  />
                </label>
                <button className="button secondary" type="submit">
                  {es ? "Enviar confirmación" : "Send confirmation"}
                </button>
              </form>
            </div>
          </details>
        </article>

        <article className="account-control-card">
          <header className="account-control-heading">
            <span className="account-control-icon">
              <Icon name="lock" />
            </span>
            <div>
              <h2>{es ? "Contraseña" : "Password"}</h2>
              <p>
                {es
                  ? "Recupera o renueva tu acceso."
                  : "Recover or update your access."}
              </p>
            </div>
          </header>
          <p className="account-control-help">
            {es
              ? "Te enviaremos un enlace seguro a tu correo para elegir una nueva contraseña."
              : "We will email you a secure link to choose a new password."}
          </p>
          {query.password === "sent" && (
            <p className="notice notice-success" role="status">
              {es
                ? "Enlace enviado. Revisa tu correo para cambiar la contraseña."
                : "Link sent. Check your email to change your password."}
            </p>
          )}
          {query.error?.startsWith("password") && (
            <p className="notice notice-error" role="alert">
              {es
                ? "No pudimos enviar el enlace de cambio de contraseña."
                : "We could not send the password-change link."}
            </p>
          )}
          <form
            action={requestAccountPasswordReset}
            className="account-card-action"
          >
            <input type="hidden" name="locale" value={locale} />
            <button className="button secondary" type="submit">
              {es ? "Cambiar mi contraseña" : "Change my password"}
            </button>
          </form>
        </article>

        <article className="account-control-card">
          <header className="account-control-heading">
            <span className="account-control-icon">
              <Icon name="person" />
            </span>
            <div>
              <h2>{es ? "Sesión" : "Session"}</h2>
              <p>{es ? "Este navegador" : "This browser"}</p>
            </div>
          </header>
          <p className="account-control-help">
            {es
              ? "Cierra la sesión en este navegador."
              : "Sign out on this browser."}
          </p>
          <form action={signOut} className="account-card-action">
            <input type="hidden" name="locale" value={locale} />
            <button className="button secondary" type="submit">
              {es ? "Cerrar sesión" : "Sign out"}
            </button>
          </form>
        </article>
      </section>
    </div>
  );
}
