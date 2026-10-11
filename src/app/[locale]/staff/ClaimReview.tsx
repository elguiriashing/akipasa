import Link from "next/link";
import { stayHref } from "@/lib/akiduermo-routing";
import { moderateItem } from "../moderation/actions";
import type { StaffQueueItem } from "./StaffQueue";

function Icon({
  name,
}: {
  name:
    | "person"
    | "mail"
    | "phone"
    | "web"
    | "date"
    | "place"
    | "store"
    | "check"
    | "deny"
    | "chat"
    | "info"
    | "file"
    | "shield";
}) {
  const symbols = {
    person: (
      <>
        <circle cx="12" cy="7" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </>
    ),
    mail: (
      <>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m2 6 10 8L22 6" />
      </>
    ),
    phone: (
      <path d="M22 17v3a2 2 0 0 1-2 2A19 19 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2l.5 3-2 2a16 16 0 0 0 6.5 6.5l2-2 3 .5a2 2 0 0 1 3 3Z" />
    ),
    web: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2c-6 6-6 14 0 20M12 2c6 6 6 14 0 20" />
      </>
    ),
    date: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4m8-4v4M3 10h18" />
      </>
    ),
    place: (
      <>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    store: (
      <>
        <path d="M3 10 5 3h14l2 7M4 10v11h16V10M3 10h18M9 21v-7h6v7" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-5" />
      </>
    ),
    deny: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m9 9 6 6m0-6-6 6" />
      </>
    ),
    chat: (
      <path d="M20 3H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9l5 3v-3h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z" />
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 11v6m0-10h.01" />
      </>
    ),
    file: (
      <>
        <path d="M6 2h9l5 5v15H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm9 0v5h5M8 12h8M8 16h8" />
      </>
    ),
    shield: (
      <>
        <path d="M12 2 20 6v6c0 5-3 8-8 10-5-2-8-5-8-10V6Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  };
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {symbols[name]}
    </svg>
  );
}

function ClaimDate({
  value,
  locale,
  zone,
}: {
  value?: string | null;
  locale: "es" | "en";
  zone?: string | null;
}) {
  if (!value || Number.isNaN(Date.parse(value)))
    return <>{locale === "es" ? "No facilitado" : "Not provided"}</>;
  let tz = zone || "Europe/Madrid";
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
  } catch {
    tz = "Europe/Madrid";
  }
  return (
    <time dateTime={value}>
      {new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: tz,
      }).format(new Date(value))}
      <small> ({tz})</small>
    </time>
  );
}

function ClaimFact({
  icon,
  label,
  children,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="claim-modern-fact">
      <span className="claim-modern-fact-icon">
        <Icon name={icon} />
      </span>
      <div>
        <dt>{label}</dt>
        <dd>{children}</dd>
      </div>
    </div>
  );
}

export function ClaimReview({
  item,
  locale,
  approve,
  claimPage,
}: {
  item: StaffQueueItem;
  locale: "es" | "en";
  approve: "approved" | "published";
  claimPage: number;
}) {
  const es = locale === "es";
  const missing = es ? "No facilitado" : "Not provided";
  const venue = item.venues;
  const submission = item.claimant?.submission;
  const name =
    venue?.name || (es ? "Local no disponible" : "Venue unavailable");
  const url = venue?.slug
    ? venue.discovery_vertical === "accommodation"
      ? stayHref(venue.slug, locale)
      : "/" + locale + "/venues/" + encodeURIComponent(venue.slug)
    : null;
  const phone = (value?: string | null) =>
    value ? (
      <a href={"tel:" + value.replace(/[^+0-9]/g, "")}>{value}</a>
    ) : (
      missing
    );
  const email = (value?: string | null) =>
    value ? (
      <a href={"mailto:" + encodeURIComponent(value)}>{value}</a>
    ) : (
      missing
    );
  const website = (value?: string | null) =>
    value ? (
      /^https:\/\/[^/\s]+/i.test(value) ? (
        <a href={value} target="_blank" rel="noopener noreferrer">
          {value}
        </a>
      ) : (
        value
      )
    ) : (
      missing
    );
  const role =
    (
      {
        owner: es ? "Propietario/a" : "Owner",
        manager: es ? "Gerente / responsable" : "Manager",
        authorized: es
          ? "Representante autorizado/a"
          : "Authorised representative",
        employee: es ? "Empleado/a" : "Employee",
        other: es ? "Otra relación" : "Other",
      } as Record<string, string>
    )[submission?.relationship || ""] || missing;
  const mailSubject = es
    ? "Información adicional sobre la reclamación: "
    : "Additional claim information: ";
  const message = es
    ? "Hola,\n\nNecesitamos más información para verificar tu solicitud de acceso a " +
      name +
      ".\n\nEquipo de soporte de AkiPasa"
    : "Hello,\n\nWe need more information to verify your access request for " +
      name +
      ".\n\nAkiPasa Support";
  const requestMail = item.claimant?.email
    ? "mailto:" +
      encodeURIComponent(item.claimant.email) +
      "?subject=" +
      encodeURIComponent(mailSubject + name) +
      "&body=" +
      encodeURIComponent(message)
    : null;
  return (
    <article
      className="claim-modern"
      aria-label={(es ? "Reclamación: " : "Claim: ") + name}
    >
      <header className="claim-modern-hero">
        <span className="claim-modern-avatar">
          <Icon name="store" />
        </span>
        <div className="claim-modern-hero-copy">
          <div className="claim-modern-hero-top">
            <span className="claim-modern-eyebrow">
              {es ? "REVISIÓN DE TITULARIDAD" : "VENUE OWNERSHIP REVIEW"}
            </span>
            <code>#{item.id.slice(0, 8).toUpperCase()}</code>
          </div>
          <h3>{name}</h3>
          <div className="claim-modern-badges">
            <span className="claim-modern-status">
              ● {item.status || "pending"}
            </span>
            <span className="claim-modern-kind">
              <Icon name="store" />
              {venue?.discovery_vertical === "accommodation"
                ? "AkiDuermo"
                : "AkiBusiness"}
            </span>
            <span className="claim-modern-warning">
              <Icon name="info" />
              {es ? "Datos sin verificar" : "Unverified details"}
            </span>
          </div>
          <dl className="claim-modern-summary">
            <div>
              <Icon name="date" />
              <dt>{es ? "Solicitud recibida" : "Received"}</dt>
              <dd>
                <ClaimDate
                  value={item.created_at}
                  locale={locale}
                  zone={venue?.timezone}
                />
              </dd>
            </div>
            <div>
              <Icon name="mail" />
              <dt>{es ? "Email de la cuenta" : "Account email"}</dt>
              <dd>{email(item.claimant?.email)}</dd>
            </div>
            <div>
              <Icon name="place" />
              <dt>{es ? "Dirección del local" : "Venue address"}</dt>
              <dd>{venue?.address || missing}</dd>
            </div>
          </dl>
        </div>
      </header>
      <div className="claim-modern-columns">
        <div className="claim-modern-column">
          <section
            className="claim-modern-panel"
            aria-labelledby={"submitted-" + item.id}
          >
            <h4 id={"submitted-" + item.id}>
              <Icon name="person" />
              {es ? "Datos del solicitante" : "Applicant-submitted details"}
            </h4>
            <dl className="claim-modern-facts">
              <ClaimFact
                icon="person"
                label={es ? "Nombre de contacto" : "Contact name"}
              >
                {submission?.applicant_name || missing}
              </ClaimFact>
              <ClaimFact
                icon="shield"
                label={es ? "Relación con el negocio" : "Role at business"}
              >
                {role}
              </ClaimFact>
              <ClaimFact
                icon="phone"
                label={es ? "Teléfono facilitado" : "Submitted phone"}
              >
                {phone(submission?.applicant_phone)}
              </ClaimFact>
              <ClaimFact
                icon="mail"
                label={
                  es
                    ? "Email del negocio facilitado"
                    : "Submitted business email"
                }
              >
                {email(submission?.business_email)}
              </ClaimFact>
              <ClaimFact
                icon="web"
                label={es ? "Web facilitada" : "Submitted website"}
              >
                {website(submission?.business_website)}
              </ClaimFact>
              <ClaimFact
                icon="phone"
                label={
                  es ? "Teléfono del local facilitado" : "Submitted venue phone"
                }
              >
                {phone(submission?.business_phone)}
              </ClaimFact>
            </dl>
            <p className="claim-modern-caution">
              <Icon name="info" />
              <span>
                {es
                  ? "Datos declarados por el solicitante. No se han verificado ni aplicado a la ficha pública."
                  : "Applicant-supplied details. These have not been verified or applied to the public listing."}
              </span>
            </p>
          </section>
          <section className="claim-modern-panel">
            <h4>
              <Icon name="file" />
              {es ? "Pruebas de la solicitud" : "Claim evidence"}
              <span className="claim-modern-count">
                {item.evidence
                  ? es
                    ? "1 elemento"
                    : "1 item"
                  : es
                    ? "Sin pruebas"
                    : "No evidence"}
              </span>
            </h4>
            <div className="claim-modern-proof">
              <span className="claim-modern-fact-icon">
                <Icon name="file" />
              </span>
              <div>
                <strong>
                  {es ? "Explicación facilitada" : "Submitted explanation"}
                </strong>
                <p className="claim-evidence">{item.evidence || missing}</p>
              </div>
            </div>
            <small className="claim-modern-helper">
              {es
                ? "No hay archivos adjuntos en el sistema actual."
                : "The current claim system has no file attachments."}
            </small>
          </section>
          <details className="claim-modern-references">
            <summary>
              <Icon name="web" />
              {es ? "Referencias" : "References"}
              <span aria-hidden="true">⌄</span>
            </summary>
            <dl>
              <div>
                <dt>{es ? "ID de solicitud" : "Claim ID"}</dt>
                <dd>
                  <code>{item.id}</code>
                </dd>
              </div>
              <div>
                <dt>{es ? "ID de solicitante" : "Applicant ID"}</dt>
                <dd>
                  <code>{item.claimant_id || missing}</code>
                </dd>
              </div>
            </dl>
          </details>
        </div>
        <div className="claim-modern-column">
          <section className="claim-modern-panel">
            <h4>
              <Icon name="store" />
              {es
                ? "Ficha actual del local y cuenta"
                : "Existing venue and account data"}
              {url && (
                <Link
                  className="claim-modern-venue-link"
                  href={url}
                  aria-label={es ? "Ver local" : "View venue"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {es ? "Ver local" : "View venue"} ↗
                </Link>
              )}
            </h4>
            <dl className="claim-modern-existing">
              <ClaimFact
                icon="person"
                label={es ? "Nombre del perfil" : "Profile name"}
              >
                {item.claimant?.display_name || missing}
              </ClaimFact>
              <ClaimFact
                icon="phone"
                label={es ? "Teléfono del perfil" : "Profile phone"}
              >
                {phone(item.claimant?.phone)}
              </ClaimFact>
              <ClaimFact
                icon="date"
                label={es ? "Cuenta creada" : "Account created"}
              >
                <ClaimDate
                  value={item.claimant?.created_at}
                  locale={locale}
                  zone={venue?.timezone}
                />
              </ClaimFact>
              <ClaimFact
                icon="phone"
                label={es ? "Teléfono publicado" : "Published venue phone"}
              >
                {phone(venue?.contact_phone)}
              </ClaimFact>
              <ClaimFact
                icon="web"
                label={es ? "Web publicada" : "Published venue website"}
              >
                {website(venue?.website_url)}
              </ClaimFact>
            </dl>
          </section>
          <section className="claim-modern-panel claim-modern-actions">
            <h4>
              <Icon name="shield" />
              {es ? "Decisión de moderación" : "Moderation decision"}
            </h4>
            <form className="claim-modern-form" action={moderateItem}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="targetType" value="venue_claim" />
              <input type="hidden" name="targetId" value={item.id} />
              <input type="hidden" name="claimPage" value={claimPage} />
              <label htmlFor={"decision-reason-" + item.id}>
                {es ? "Motivo de la decisión" : "Decision reason"}
              </label>
              <textarea
                id={"decision-reason-" + item.id}
                name="reason"
                minLength={3}
                maxLength={2000}
                rows={2}
                required
                placeholder={
                  es
                    ? "Indica los datos verificados o el motivo del rechazo..."
                    : "State the verification or reason for rejection..."
                }
              />
              <button
                type="submit"
                className="claim-modern-approve"
                name="decision"
                value={approve}
              >
                <Icon name="check" />
                {es ? "Aprobar reclamación" : "Approve claim"}
              </button>
              {requestMail ? (
                <a className="claim-modern-request" href={requestMail}>
                  <Icon name="chat" />
                  {es
                    ? "Solicitar más información"
                    : "Request more information"}
                </a>
              ) : (
                <span className="claim-modern-muted">
                  {es
                    ? "No se ha facilitado email de contacto."
                    : "No contact email is available."}
                </span>
              )}
              <button
                type="submit"
                className="claim-modern-deny"
                name="decision"
                value="rejected"
              >
                <Icon name="deny" />
                {es ? "Denegar" : "Deny claim"}
              </button>
              <p className="claim-modern-helper">
                {es
                  ? "Solicitar información abre tu aplicación de correo y no cambia el estado de la solicitud. Aprobar o denegar registra una decisión auditada."
                  : "Request information opens your email app and does not change claim status. Approve or deny records an audited decision."}
              </p>
            </form>
          </section>
          <section className="claim-modern-panel claim-modern-checklist">
            <h4>
              <Icon name="check" />
              {es ? "Lista de verificación" : "Verification checklist"}
            </h4>
            <p className="claim-modern-helper">
              {es
                ? "Guía visual sin guardar ni registrar en auditoría."
                : "Visual aid only; not saved or recorded in the audit."}
            </p>
            <label>
              <input type="checkbox" />
              {es
                ? "Verificar que la web pertenece al negocio"
                : "Check website ownership"}
            </label>
            <label>
              <input type="checkbox" />
              {es
                ? "Confirmar el teléfono del local"
                : "Confirm the venue phone"}
            </label>
            <label>
              <input type="checkbox" />
              {es
                ? "Comprobar dirección, nombre y ficha"
                : "Match address, name and venue listing"}
            </label>
          </section>
        </div>
      </div>
    </article>
  );
}
