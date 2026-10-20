import React from "react";
import Link from "next/link";
import { canModerate, isAdministrator } from "../lib/roles";
import { suiteHref } from "../lib/suite-navigation";
import { Icon } from "./Icons";

const personalDestinations = [
  ["/following", "Followed venues", "Locales seguidos", "venue"],
  ["/activity", "Recent activity", "Actividad reciente", "activity"],
  ["/privacy", "Privacy and data", "Privacidad y datos", "lock"],
  ["/subscription", "Membership", "Membresía", "gift"],
] as const;

export function AccountWorkspacePortals({
  locale,
  role = "consumer",
}: {
  locale: "es" | "en";
  role?: string;
}) {
  const es = locale === "es";
  const hasOperationsAccess = canModerate(role) || isAdministrator(role);

  return (
    <>
      <section className="workspace-portal-section account-more-section">
        <header className="account-utility-heading">
          <span>{es ? "Tu cuenta" : "Your account"}</span>
          <h2>{es ? "Más opciones" : "More options"}</h2>
        </header>
        <div className="workspace-portal-grid account-more-grid">
          {personalDestinations.map(([path, enLabel, esLabel, icon]) => (
            <Link
              className="workspace-portal-link account-more-link"
              href={`/${locale}/account${path}`}
              key={path}
            >
              <Icon name={icon} />
              <strong>{es ? esLabel : enLabel}</strong>
              <Icon name="chevron" />
            </Link>
          ))}
        </div>
      </section>

      {hasOperationsAccess && (
        <section className="workspace-portal-section account-operations-link">
          <header className="account-utility-heading">
            <span>{es ? "Equipo" : "Team"}</span>
            <h2>{es ? "Operaciones AkiBusiness" : "AkiBusiness operations"}</h2>
          </header>
          <a
            className="workspace-portal-link account-more-link"
            href={suiteHref("business", locale)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="business" />
            <strong>{es ? "Abrir AkiBusiness" : "Open AkiBusiness"}</strong>
            <Icon name="arrow-right" />
          </a>
        </section>
      )}
    </>
  );
}
