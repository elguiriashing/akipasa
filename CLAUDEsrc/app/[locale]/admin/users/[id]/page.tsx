import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkspacePageHeader } from "@/components/WorkspaceShell";
import { safeAdminUser } from "@/lib/admin-users";
import { requireUser } from "@/lib/auth";
import { isLocale } from "@/lib/config";
import { appRoles, roleLabel } from "@/lib/roles";
import { changePlatformRole } from "../../actions";

export default async function UserRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale) || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const query = await searchParams;
  const { supabase, user: currentUser } = await requireUser(
    locale,
    `/${locale}/admin/users/${id}`,
  );
  const { data, error } = await supabase.rpc("admin_user_record", {
    p_profile: id,
  });
  if (error) notFound();
  const record = safeAdminUser(data?.[0]);
  if (!record) notFound();
  const es = locale === "es";
  return (
    <>
      <WorkspacePageHeader
        eyebrow={es ? "Registro de usuario" : "User record"}
        title={
          record.display_name ||
          record.primary_email ||
          (es ? "Cuenta" : "Account")
        }
        description={
          es
            ? "Identidad, estado y privilegios de una sola cuenta."
            : "Identity, status and privileges for one account."
        }
        actions={
          <Link className="button secondary" href={`/${locale}/admin/users`}>
            {es ? "Volver a búsqueda" : "Back to search"}
          </Link>
        }
      />
      {query.updated && (
        <p className="notice">
          {es ? "Rol actualizado y auditado." : "Role updated and audited."}
        </p>
      )}
      {query.error && (
        <p className="notice">
          {es ? "No se pudo cambiar el rol." : "Role change failed."}
        </p>
      )}
      <section className="dashboard-grid">
        <article className="panel console-card">
          <span className="status-pill">{record.account_status}</span>
          <h2>{es ? "Cuenta" : "Account"}</h2>
          <dl className="identity-facts">
            <div>
              <dt>Email</dt>
              <dd>{record.primary_email || "—"}</dd>
            </div>
            <div>
              <dt>Google</dt>
              <dd>{record.google_email || "—"}</dd>
            </div>
            <div>
              <dt>{es ? "Confirmado" : "Confirmed"}</dt>
              <dd>{record.email_confirmed ? (es ? "Sí" : "Yes") : "No"}</dd>
            </div>
            <div>
              <dt>{es ? "Locales" : "Venue memberships"}</dt>
              <dd>{record.venue_memberships}</dd>
            </div>
          </dl>
        </article>
        <article className="panel console-card">
          <span className="status-pill">
            {roleLabel(record.app_role, locale)}
          </span>
          <h2>{es ? "Rol de plataforma" : "Platform role"}</h2>
          <p>
            {es
              ? "Los roles de local (owner, manager, editor) se gestionan por separado."
              : "Venue owner, manager and editor memberships are managed separately."}
          </p>
          {record.profile_id === currentUser.id ? (
            <p className="notice">
              {es
                ? "No puedes cambiar tu propio rol."
                : "You cannot change your own role."}
            </p>
          ) : (
            <details className="sensitive-action">
              <summary>{es ? "Cambiar acceso" : "Change access"}</summary>
              <form action={changePlatformRole} className="stack">
                <input type="hidden" name="locale" value={locale} />
                <input
                  type="hidden"
                  name="profileId"
                  value={record.profile_id}
                />
                <label>
                  {es ? "Nuevo rol" : "New role"}
                  <select name="role" defaultValue={record.app_role}>
                    {appRoles.map((role) => (
                      <option value={role} key={role}>
                        {roleLabel(role, locale)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {es ? "Motivo obligatorio" : "Required reason"}
                  <textarea
                    name="reason"
                    required
                    minLength={10}
                    maxLength={500}
                  />
                </label>
                <label>
                  {es
                    ? "Escribe CONFIRM para autorizar"
                    : "Type CONFIRM to authorise"}
                  <input
                    name="confirmation"
                    required
                    pattern="CONFIRM"
                    autoComplete="off"
                  />
                </label>
                <button className="button danger" type="submit">
                  {es ? "Confirmar cambio de rol" : "Confirm role change"}
                </button>
              </form>
            </details>
          )}
        </article>
      </section>
    </>
  );
}
