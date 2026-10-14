import React from "react";
import Link from "next/link";
import { Icon, type IconName } from "../../../components/Icons";
import { collectionHref } from "@/lib/collection-links";
import { AccountCollectionState } from "./AccountCollectionState";

export function AccountItems({
  items,
  locale,
  emptyTitle,
  emptyDescription,
  kind = "saved",
  failed = false,
}: {
  items: { id: string; label: string; href: string; date?: string }[];
  locale: "es" | "en";
  emptyTitle: string;
  emptyDescription: string;
  kind?: "saved" | "following" | "activity";
  failed?: boolean;
}) {
  const es = locale === "es";
  const labels = {
    saved: {
      icon: "saved" as IconName,
      title: es ? "Eventos guardados" : "Saved events",
      date: es ? "Guardado el" : "Saved on",
      open: es ? "Ver evento" : "View event",
    },
    following: {
      icon: "heart" as IconName,
      title: es ? "Locales seguidos" : "Followed venues",
      date: es ? "Siguiendo desde" : "Following since",
      open: es ? "Ver local" : "View venue",
    },
    activity: {
      icon: "activity" as IconName,
      title: es ? "Eventos consultados" : "Viewed events",
      date: es ? "Visto el" : "Viewed on",
      open: es ? "Volver al evento" : "View event again",
    },
  }[kind];

  if (failed) {
    return (
      <AccountCollectionState
        locale={locale}
        icon={labels.icon}
        title={
          es
            ? "No se ha podido cargar la lista"
            : "This list could not be loaded"
        }
        description={
          es
            ? "No se han podido consultar tus datos. Vuelve a intentarlo."
            : "Your data could not be retrieved. Please try again."
        }
        failed
      />
    );
  }

  if (!items.length) {
    return (
      <AccountCollectionState
        locale={locale}
        icon={labels.icon}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  const formatDate = new Intl.DateTimeFormat(es ? "es-ES" : "en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return (
    <section className="account-collection" aria-label={labels.title}>
      <div className="account-collection-meta">
        <span>
          <strong>{items.length.toLocaleString(locale)}</strong>{" "}
          {labels.title.toLocaleLowerCase(locale)}
        </span>
        {kind === "activity" && (
          <small>{es ? "Últimos 25 eventos" : "Latest 25 events"}</small>
        )}
      </div>
      <ul className="account-collection-grid">
        {items.map((item) => {
          const date = item.date ? new Date(item.date) : null;
          return (
            <li key={item.id}>
              <Link
                className="account-collection-card"
                href={collectionHref(item.href, locale)}
                aria-label={`${labels.open}: ${item.label}`}
              >
                <span className="account-collection-icon" aria-hidden="true">
                  <Icon name={labels.icon} size={22} />
                </span>
                <span className="account-collection-card-copy">
                  <strong>{item.label}</strong>
                  {date && Number.isFinite(date.getTime()) && (
                    <small>
                      {labels.date}{" "}
                      <time dateTime={item.date}>
                        {formatDate.format(date)}
                      </time>
                    </small>
                  )}
                  <span className="account-collection-card-action">
                    {labels.open}
                  </span>
                </span>
                <Icon name="arrow-right" size={18} />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
