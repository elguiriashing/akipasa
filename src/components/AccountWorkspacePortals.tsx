import React from "react";
import { config } from "../lib/config";
import { WorkspacePageHeader } from "./WorkspaceShell";

export function AccountWorkspacePortals({ locale }: { locale: "es" | "en" }) {
  const es = locale === "es";
  return (
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
          <strong>{es ? "Abrir CRM (crm.akipasa.com)" : "Open CRM (crm.akipasa.com)"}</strong>
          <span aria-hidden="true">-&gt;</span>
        </a>
      </div>
    </section>
  );
}
