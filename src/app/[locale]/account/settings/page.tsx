import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
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
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Preferencias" : "Preferences"}
        title={es ? "Ajustes" : "Settings"}
        description={
          es
            ? "Gestiona el acceso y la sesión de tu cuenta."
            : "Manage account access and your current session."
        }
      />
      <section className="dashboard-grid">
        <article className="panel console-card">
          <h2>{es ? "Correo de la cuenta" : "Account email"}</h2>
          <p>
            {es
              ? "Cambia el correo con el que inicias sesión. Tus pases, Passport, negocios, logros y demás datos siguen en la misma cuenta."
              : "Change the email you use to sign in. Your passes, Passport, businesses, achievements and other data stay on the same account."}
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
          <form action={requestAccountEmailChange} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <label htmlFor="current-email">
              {es ? "Correo actual" : "Current email"}
            </label>
            <input
              id="current-email"
              type="email"
              value={user.email || ""}
              readOnly
              disabled
            />
            <label htmlFor="new-email">
              {es ? "Nuevo correo" : "New email"}
            </label>
            <input
              id="new-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              placeholder="nombre@ejemplo.com"
            />
            <button className="button secondary" type="submit">
              {es ? "Enviar confirmación" : "Send confirmation"}
            </button>
          </form>
        </article>

        <article className="panel console-card">
          <h2>{es ? "Contraseña" : "Password"}</h2>
          <p>
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
          <form action={requestAccountPasswordReset}>
            <input type="hidden" name="locale" value={locale} />
            <button className="button secondary" type="submit">
              {es ? "Cambiar mi contraseña" : "Change my password"}
            </button>
          </form>
        </article>

        <article className="panel console-card">
          <h2>{es ? "Sesión" : "Session"}</h2>
          <p>
            {es
              ? "Cierra la sesión en este navegador."
              : "Sign out on this browser."}
          </p>
          <form action={signOut}>
            <input type="hidden" name="locale" value={locale} />
            <button className="button secondary" type="submit">
              {es ? "Cerrar sesión" : "Sign out"}
            </button>
          </form>
        </article>
      </section>
    </>
  );
}
