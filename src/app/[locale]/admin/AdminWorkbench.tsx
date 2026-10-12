"use client";

import React, { useMemo, useState, type ReactNode } from "react";

export type AdminWorkbenchItem = {
  id: string;
  title: string;
  subtitle?: string;
  keywords?: string;
  status?: string;
  content: ReactNode;
};

export function AdminWorkbench({
  locale,
  title,
  items,
  createLabel,
  createContent,
  emptyMessage,
  statusLabels,
}: {
  locale: "es" | "en";
  title: string;
  items: AdminWorkbenchItem[];
  createLabel?: string;
  createContent?: ReactNode;
  emptyMessage?: string;
  statusLabels?: Record<string, string>;
}) {
  const es = locale === "es";
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [mobilePane, setMobilePane] = useState<"list" | "editor">("list");
  const [selection, setSelection] = useState(items[0]?.id ?? (createContent ? "__new__" : ""));
  const statuses = useMemo(
    () => [...new Set(items.map((item) => item.status).filter((value): value is string => Boolean(value)))],
    [items],
  );
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase(locale);
    return items.filter(
      (item) =>
        (status === "all" || item.status === status) &&
        (!term || [item.title, item.subtitle, item.keywords, item.status]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase(locale)
          .includes(term)),
    );
  }, [items, locale, query, status]);

  const chosen =
    selection === "__new__" && createContent
      ? null
      : visible.find((item) => item.id === selection) ?? visible[0];
  const creating = selection === "__new__" && Boolean(createContent);
  const label = creating ? createLabel : chosen?.title;

  return (
    <section className={"admin-master-detail admin-master-detail--" + mobilePane} aria-label={title}>
      <div className="admin-workbench-mobile-tabs" role="group" aria-label={es ? "Vista del editor" : "Editor view"}>
        <button type="button" aria-pressed={mobilePane === "list"} onClick={() => setMobilePane("list")}>
          {es ? "Registros" : "Records"} ({visible.length})
        </button>
        <button type="button" aria-pressed={mobilePane === "editor"} onClick={() => setMobilePane("editor")}>
          {es ? "Editor" : "Editor"}{label ? ` · ${label}` : ""}
        </button>
      </div>
      <aside className="admin-master-list">
        <header className="admin-master-list-head">
          <div>
            <span className="admin-overline">{es ? "Directorio" : "Directory"}</span>
            <h3>{title}</h3>
            <small>{visible.length} / {items.length} {es ? "visibles" : "visible"}</small>
          </div>
          {createContent && createLabel && (
            <button
              type="button"
              className="admin-master-create"
              aria-pressed={creating}
              onClick={() => { setSelection("__new__"); setMobilePane("editor"); }}
            >
              <span aria-hidden="true">+</span> {createLabel}
            </button>
          )}
        </header>

        <div className="admin-master-filters">
          <label>
            <span className="sr-only">{es ? "Buscar en" : "Search"} {title}</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={es ? "Buscar nombre o clave…" : "Search name or key…"}
              aria-label={es ? `Buscar en ${title}` : `Search ${title}`}
            />
          </label>
          {statuses.length > 0 && (
            <label>
              <span className="sr-only">{es ? "Filtrar" : "Filter"} {title}</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                aria-label={es ? `Estado de ${title}` : `Status of ${title}`}
              >
                <option value="all">{es ? "Todos" : "All"}</option>
                {statuses.map((value) => (
                  <option value={value} key={value}>{statusLabels?.[value] || value}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        <nav className="admin-master-rows" aria-label={es ? "Seleccionar registro" : "Select record"}>
          {visible.map((item) => (
            <button
              type="button"
              key={item.id}
              className={chosen?.id === item.id && !creating ? "admin-master-row selected" : "admin-master-row"}
              aria-pressed={chosen?.id === item.id && !creating}
              onClick={() => { setSelection(item.id); setMobilePane("editor"); }}
            >
              <span>
                <strong>{item.title}</strong>
                {item.subtitle && <small>{item.subtitle}</small>}
              </span>
              {item.status && (
                <span className={"admin-master-pill " + (item.status === "enabled" ? "on" : "")}>
                  {statusLabels?.[item.status] || item.status}
                </span>
              )}
            </button>
          ))}
        </nav>
        {visible.length === 0 && (
          <div className="admin-master-empty">
            <p>{items.length === 0
              ? (emptyMessage || (es ? "Sin registros todavía." : "No records yet."))
              : (es ? "No hay coincidencias." : "No matching records.")}</p>
            {(query || status !== "all") && (
              <button type="button" onClick={() => { setQuery(""); setStatus("all"); }}>
                {es ? "Limpiar filtros" : "Clear filters"}
              </button>
            )}
          </div>
        )}
      </aside>
      <section className="admin-master-editor" aria-label={es ? "Editor" : "Editor"}>
        {creating || chosen ? (
          <>
            <header className="admin-master-editor-head">
              <span className="admin-overline">{creating ? (es ? "Nuevo registro" : "New record") : (es ? "Editar registro" : "Edit record")}</span>
              <h3>{label}</h3>
              {!creating && chosen?.subtitle && <p>{chosen.subtitle}</p>}
            </header>
            <div className="admin-master-editor-body" key={creating ? "__new__" : chosen?.id}>
              {creating ? createContent : chosen?.content}
            </div>
          </>
        ) : (
          <div className="admin-master-placeholder">
            {es ? "Selecciona un registro para abrir su editor." : "Select a record to open its editor."}
          </div>
        )}
      </section>
    </section>
  );
}
