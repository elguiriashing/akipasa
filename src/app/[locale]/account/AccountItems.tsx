import React from "react";
import Link from "next/link";
import { Icon, type IconName } from "../../../components/Icons";
import { collectionHref } from "@/lib/collection-links";
import { AccountCollectionState } from "./AccountCollectionState";
import { AccountCollectionRemoveButton } from "./AccountCollectionRemoveButton";
import { removeAccountCollectionItem } from "./collection-actions";
import { accountCollectionHref } from "@/lib/account-collection-query";

export function AccountItems({
  items,
  locale,
  emptyTitle,
  emptyDescription,
  kind = "saved",
  failed = false,
  total,
  page = 1,
  pageSize = 24,
  query = "",
  basePath,
}: {
  items: { id: string; label: string; href: string; date?: string }[];
  locale: "es" | "en";
  emptyTitle: string;
  emptyDescription: string;
  kind?: "saved" | "following" | "activity";
  failed?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
  query?: string;
  basePath?: string;
}) {
  const es = locale === "es";
  const labels = {
    saved: {
      icon: "saved" as IconName,
      title: es ? "Eventos guardados" : "Saved events",
      date: es ? "Guardado el" : "Saved on",
      open: es ? "Ver evento" : "View event",
      remove: es ? "Quitar" : "Remove",
      removing: es ? "Quitando…" : "Removing…",
    },
    following: {
      icon: "heart" as IconName,
      title: es ? "Locales seguidos" : "Followed venues",
      date: es ? "Siguiendo desde" : "Following since",
      open: es ? "Ver local" : "View venue",
      remove: es ? "Dejar de seguir" : "Unfollow",
      removing: es ? "Quitando…" : "Removing…",
    },
    activity: {
      icon: "activity" as IconName,
      title: es ? "Eventos consultados" : "Viewed events",
      date: es ? "Visto el" : "Viewed on",
      open: es ? "Volver al evento" : "View event again",
      remove: "",
      removing: "",
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

  if (!items.length && !query) {
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
  const managed = kind !== "activity" && Boolean(basePath);
  const itemTotal = total ?? items.length;
  const pageCount = Math.max(1, Math.ceil(itemTotal / pageSize));
  const returnTo = basePath
    ? accountCollectionHref({ basePath, query })
    : undefined;
  return (
    <section className="account-collection" aria-label={labels.title}>
      {managed && (
        <form className="account-collection-search" role="search">
          <label htmlFor={`collection-search-${kind}`}>
            {es ? "Buscar en esta lista" : "Search this list"}
          </label>
          <div>
            <input
              id={`collection-search-${kind}`}
              name="q"
              type="search"
              defaultValue={query}
              maxLength={80}
              placeholder={
                kind === "saved"
                  ? es
                    ? "Nombre del evento"
                    : "Event name"
                  : es
                    ? "Nombre del local"
                    : "Venue name"
              }
            />
            <button className="button secondary" type="submit">
              {es ? "Buscar" : "Search"}
            </button>
            {query && (
              <Link className="button ghost" href={basePath!}>
                {es ? "Borrar búsqueda" : "Clear search"}
              </Link>
            )}
          </div>
        </form>
      )}
      <div className="account-collection-meta">
        <span>
          <strong>{itemTotal.toLocaleString(locale)}</strong>{" "}
          {labels.title.toLocaleLowerCase(locale)}
        </span>
        {kind === "activity" && (
          <small>{es ? "Últimos 25 eventos" : "Latest 25 events"}</small>
        )}
      </div>
      {!items.length ? (
        <AccountCollectionState
          locale={locale}
          icon={labels.icon}
          title={es ? "No hay coincidencias" : "No matches found"}
          description={
            es
              ? "Prueba con otro nombre o borra la búsqueda."
              : "Try another name or clear the search."
          }
        />
      ) : (
        <ul className="account-collection-grid">
          {items.map((item) => {
            const date = item.date ? new Date(item.date) : null;
            return (
              <li key={item.id} className="account-collection-card">
                <Link
                  className="account-collection-card-link"
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
                {managed && returnTo && (
                  <form action={removeAccountCollectionItem}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="kind" value={kind} />
                    <input type="hidden" name="key" value={item.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <AccountCollectionRemoveButton
                      idle={labels.remove}
                      pending={labels.removing}
                    />
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {managed && pageCount > 1 && (
        <nav
          className="account-collection-pager"
          aria-label={es ? "Páginas de la colección" : "Collection pages"}
        >
          {page > 1 ? (
            <Link
              className="button secondary"
              href={accountCollectionHref({
                basePath: basePath!,
                page: page - 1,
                query,
              })}
            >
              {es ? "Anterior" : "Previous"}
            </Link>
          ) : (
            <span />
          )}
          <span>
            {es ? "Página" : "Page"} {page.toLocaleString(locale)}{" "}
            {es ? "de" : "of"} {pageCount.toLocaleString(locale)}
          </span>
          {page < pageCount ? (
            <Link
              className="button secondary"
              href={accountCollectionHref({
                basePath: basePath!,
                page: page + 1,
                query,
              })}
            >
              {es ? "Siguiente" : "Next"}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </section>
  );
}
