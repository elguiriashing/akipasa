"use client";

import React, { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Icon, type IconName } from "./Icons";
import {
  getVenueDashboardSection,
  type VenueDashboardSection,
} from "../lib/venue-dashboard";
import styles from "./VenueDashboard.module.css";

type ToolSection = Exclude<VenueDashboardSection, "overview">;
type Counts = {
  photos: number;
  events: number;
  programs: number;
  credentials: number;
  requests: number;
  members: number;
};

export function VenueDashboard({
  locale,
  name,
  status,
  verified,
  publicHref,
  initialSection,
  feedback,
  counts,
  sections,
}: {
  locale: "en" | "es";
  name: string;
  status: string;
  verified: boolean;
  publicHref?: string;
  initialSection: VenueDashboardSection;
  feedback?: "success" | "error";
  counts: Counts;
  sections: Record<ToolSection, ReactNode>;
}) {
  const es = locale === "es";
  const [active, setActive] = useState(initialSection);
  const [showFeedback, setShowFeedback] = useState(Boolean(feedback));
  const tabs = useRef<
    Partial<Record<VenueDashboardSection, HTMLButtonElement | null>>
  >({});
  function countLabel(
    value: number,
    en: [string, string],
    spanish: [string, string],
  ) {
    return `${value} ${(es ? spanish : en)[value === 1 ? 0 : 1]}`;
  }
  const tools: {
    id: ToolSection;
    label: string;
    description: string;
    icon: IconName;
    detail: string;
  }[] = [
    {
      id: "profile",
      label: es ? "Perfil" : "Profile",
      description: es
        ? "Datos, contacto y fotos"
        : "Details, contact and photos",
      icon: "venue",
      detail: countLabel(counts.photos, ["photo", "photos"], ["foto", "fotos"]),
    },
    {
      id: "events",
      label: es ? "Eventos" : "Events",
      description: es
        ? "Fechas, edición y audiencia"
        : "Dates, editing and audience",
      icon: "calendar",
      detail: countLabel(
        counts.events,
        ["event", "events"],
        ["evento", "eventos"],
      ),
    },
    {
      id: "rewards",
      label: es ? "Fidelidad" : "Rewards",
      description: es
        ? "Sellos, premios y ofertas"
        : "Stamps, rewards and offers",
      icon: "gift",
      detail: countLabel(
        counts.programs,
        ["active card", "active cards"],
        ["tarjeta activa", "tarjetas activas"],
      ),
    },
    {
      id: "checkin",
      label: "Check-in",
      description: es ? "Código QR y canjes" : "QR code and redemptions",
      icon: "passport",
      detail: counts.credentials
        ? es
          ? "QR disponible"
          : "QR ready"
        : es
          ? "Configurar QR"
          : "Set up QR",
    },
    {
      id: "bookings",
      label: es ? "Reservas" : "Bookings",
      description: es
        ? "Solicitudes y disponibilidad"
        : "Requests and availability",
      icon: "inbox",
      detail: countLabel(
        counts.requests,
        ["pending", "pending"],
        ["pendiente", "pendientes"],
      ),
    },
    {
      id: "team",
      label: es ? "Equipo" : "Team",
      description: es ? "Miembros y permisos" : "Members and permissions",
      icon: "users",
      detail: countLabel(
        counts.members,
        ["member", "members"],
        ["miembro", "miembros"],
      ),
    },
  ];
  const navigation = [
    {
      id: "overview" as const,
      label: es ? "Resumen" : "Overview",
      icon: "home" as const,
    },
    ...tools,
  ];
  const statusLabels: Record<string, string> = es
    ? {
        published: "Publicado",
        pending: "En revisión",
        draft: "Borrador",
        archived: "Archivado",
        rejected: "Rechazado",
      }
    : {
        published: "Published",
        pending: "In review",
        draft: "Draft",
        archived: "Archived",
        rejected: "Rejected",
      };

  useEffect(() => {
    function restoreLocation() {
      const query = Object.fromEntries(
        new URLSearchParams(window.location.search),
      );
      const eventId = window.location.hash.slice(1);
      const event = eventId.startsWith("event-")
        ? document.getElementById(eventId)
        : null;
      setActive(event ? "events" : getVenueDashboardSection(query));
      if (event instanceof HTMLDetailsElement) {
        event.open = true;
        requestAnimationFrame(() => event.scrollIntoView({ block: "start" }));
      }
    }
    // Preserve old event links from the main business dashboard.
    if (window.location.hash.startsWith("#event-")) restoreLocation();
    window.addEventListener("popstate", restoreLocation);
    window.addEventListener("hashchange", restoreLocation);
    return () => {
      window.removeEventListener("popstate", restoreLocation);
      window.removeEventListener("hashchange", restoreLocation);
    };
  }, []);

  function selectSection(section: VenueDashboardSection) {
    setActive(section);
    setShowFeedback(false);
    const url = new URL(window.location.href);
    url.searchParams.set("section", section);
    url.searchParams.delete("updated");
    url.searchParams.delete("error");
    url.hash = "";
    window.history.pushState(window.history.state, "", url);
    tabs.current[section]?.focus({ preventScroll: true });
    tabs.current[section]?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }

  return (
    <main className={styles.dashboard}>
      <Link className={styles.back} href={`/${locale}/business`}>
        <Icon name="arrow-right" />
        {es ? "Mis locales" : "My venues"}
      </Link>
      <header className={styles.header}>
        <div className={styles.venueMark}>
          <Icon name="venue" />
        </div>
        <div className={styles.identity}>
          <span className={styles.eyebrow}>
            {es ? "Gestionar local" : "Manage venue"}
          </span>
          <h1>{name}</h1>
          <div className={styles.status}>
            <span>
              <i data-published={status === "published"} />
              {statusLabels[status] || status}
            </span>
            {verified ? (
              <span>
                <Icon name="shield" />
                {es ? "Verificado" : "Verified"}
              </span>
            ) : (
              <span>
                {es ? "Pendiente de verificación" : "Awaiting verification"}
              </span>
            )}
          </div>
        </div>
        {publicHref && (
          <Link className={styles.publicLink} href={publicHref}>
            {es ? "Ver ficha" : "View listing"}
            <Icon name="arrow-right" />
          </Link>
        )}
      </header>
      <div
        className={styles.tabs}
        role="tablist"
        aria-label={es ? "Herramientas del local" : "Venue tools"}
      >
        {navigation.map((item, index) => (
          <button
            key={item.id}
            id={`venue-tab-${item.id}`}
            ref={(element) => {
              tabs.current[item.id] = element;
            }}
            type="button"
            role="tab"
            aria-selected={active === item.id}
            aria-controls={`venue-panel-${item.id}`}
            tabIndex={active === item.id ? 0 : -1}
            onClick={() => selectSection(item.id)}
            onKeyDown={(event) => {
              let next: number | undefined;
              if (event.key === "ArrowRight")
                next = (index + 1) % navigation.length;
              if (event.key === "ArrowLeft")
                next = (index - 1 + navigation.length) % navigation.length;
              if (event.key === "Home") next = 0;
              if (event.key === "End") next = navigation.length - 1;
              if (next !== undefined) {
                event.preventDefault();
                selectSection(navigation[next].id);
              }
            }}
          >
            <Icon name={item.icon} />
            {item.label}
          </button>
        ))}
      </div>
      {showFeedback && (
        <p
          className={styles.feedback}
          role={feedback === "error" ? "alert" : "status"}
        >
          {feedback === "error"
            ? es
              ? "No se pudo guardar. Revisa los datos y permisos."
              : "Could not save. Check the data and permissions."
            : es
              ? "Cambios guardados."
              : "Changes saved."}
        </p>
      )}
      <section
        className={styles.section}
        id="venue-panel-overview"
        role="tabpanel"
        aria-labelledby="venue-tab-overview"
        hidden={active !== "overview"}
        tabIndex={0}
      >
        <div className={styles.sectionHeading}>
          <h2>{es ? "Todo tu local, a mano" : "Your venue, at a glance"}</h2>
          <p>
            {es
              ? "Elige qué quieres gestionar."
              : "Choose what you want to manage."}
          </p>
        </div>
        <div className={styles.tools}>
          {tools.map((tool) => (
            <button
              type="button"
              className={styles.tool}
              key={tool.id}
              onClick={() => selectSection(tool.id)}
            >
              <span className={styles.toolTop}>
                <Icon name={tool.icon} />
                <Icon name="arrow-right" />
              </span>
              <strong>{tool.label}</strong>
              <span className={styles.toolDescription}>{tool.description}</span>
              <span className={styles.toolDetail}>{tool.detail}</span>
            </button>
          ))}
        </div>
      </section>
      {tools.map((tool) => (
        <section
          key={tool.id}
          className={styles.section}
          id={`venue-panel-${tool.id}`}
          role="tabpanel"
          aria-labelledby={`venue-tab-${tool.id}`}
          hidden={active !== tool.id}
          tabIndex={0}
        >
          <div className={styles.sectionHeading}>
            <h2>{tool.label}</h2>
            <p>{tool.description}</p>
          </div>
          {sections[tool.id]}
        </section>
      ))}
    </main>
  );
}
