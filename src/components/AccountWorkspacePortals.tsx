import React from "react";
import Link from "next/link";
import { canModerate, isAdministrator } from "../lib/roles";
import { config } from "../lib/config";
import { WorkspacePageHeader } from "./WorkspaceShell";

const staffDestinations = [
  ["", "Operations", "Operaciones"],
  ["/support", "Customer support", "Soporte"],
  ["/moderation", "Moderation", "Moderacion"],
  ["/catalogue", "Venues and events", "Locales y eventos"],
  ["/promotions", "Promotions", "Promociones"],
  ["/audit", "Audit history", "Auditoria"],
] as const;

const adminDestinations = [
  ["", "Administration overview", "Resumen de administracion"],
  ["/users", "Users and roles", "Usuarios y roles"],
  ["/privacy", "Privacy requests", "Solicitudes de privacidad"],
  ["/catalogue", "Platform catalogue", "Catalogo de plataforma"],
  ["/promotions", "Commercial operations", "Operaciones comerciales"],
  ["/passports", "Passports", "Pasaportes"],
  ["/settings", "Platform settings", "Ajustes de plataforma"],
  ["/audit", "Audit history", "Auditoria"],
] as const;

export function AccountWorkspacePortals({
  locale,
  role = "consumer",
}: {
  locale: "es" | "en";
  role?: string;
}) {
  const es = locale === "es";
  return (
    <>
      {canModerate(role) && (
        <section className="workspace-portal-section">
          <WorkspacePageHeader
            eyebrow={es ? "Acceso directo" : "Direct access"}
            title={es ? "Operaciones de staff" : "Staff operations"}
            description={
              es
                ? "Abre cualquier cola o catalogo directamente desde tu cuenta."
                : "Open any queue or catalogue directly from your account."
            }
          />
          <div className="workspace-portal-grid">
            {staffDestinations.map(([path, enLabel, esLabel]) => (
              <Link
                className="panel workspace-portal-link"
                href={`/${locale}/staff${path}`}
                key={path}
              >
                <strong>{es ? esLabel : enLabel}</strong>
                <span aria-hidden="true">-&gt;</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {isAdministrator(role) && (
        <section className="workspace-portal-section">
          <WorkspacePageHeader
            eyebrow={es ? "Gobernanza" : "Governance"}
            title={es ? "Administracion" : "Administration"}
            description={
              es
                ? "Usuarios, privacidad y configuracion sin pasar por Ajustes."
                : "Users, privacy, and platform settings without going through Settings."
            }
          />
          <div className="workspace-portal-grid">
            {adminDestinations.map(([path, enLabel, esLabel]) => (
              <Link
                className="panel workspace-portal-link"
                href={`/${locale}/admin${path}`}
                key={path}
              >
                <strong>{es ? esLabel : enLabel}</strong>
                <span aria-hidden="true">-&gt;</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="workspace-portal-section">
        <WorkspacePageHeader
          eyebrow={es ? "Gestión Empresarial" : "Business OS"}
          title={es ? "CRM & Operaciones (AkiHQ)" : "CRM & Operations (AkiHQ)"}
          description={
            es
              ? "Accede a crm.akipasa.com para gestionar contactos, ventas, facturación y tareas."
              : "Access crm.akipasa.com to manage contacts, deals, billing, and tasks."
          }
        />
        <div className="workspace-portal-grid">
          <a
            className="panel workspace-portal-link"
            href={config.crmUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <strong>
              {es
                ? "Abrir CRM (crm.akipasa.com)"
                : "Open CRM (crm.akipasa.com)"}
            </strong>
            <span aria-hidden="true">-&gt;</span>
          </a>
        </div>
      </section>
    </>
  );
}
