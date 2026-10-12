"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { Locale } from "../lib/config";
import {
  relevanceActions,
  type RelevanceProposal,
} from "../lib/venue-relevance";

export function VenueRelevanceReview({ locale }: { locale: Locale }) {
  const es = locale === "es";
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<RelevanceProposal[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [mobilePane, setMobilePane] = useState<"list" | "editor">("list");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState("");

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/admin/venue-relevance?${new URLSearchParams({ q, action, offset: String(offset) })}`,
          { signal },
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Review unavailable");
        setRows(data.rows || []);
        setTotal(data.total || 0);
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          setError(e instanceof Error ? e.message : "Review unavailable");
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [q, action, offset],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const selected = rows.find((row) => row.id === selectedId) || rows[0];

  async function save(
    event: React.FormEvent<HTMLFormElement>,
    row: RelevanceProposal,
  ) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    setSaving(row.id);
    setError("");
    try {
      const response = await fetch("/api/admin/venue-relevance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId: row.id,
          fingerprint: row.fingerprint,
          action: form.get("decision"),
          weight: Number(form.get("weight")),
          reason: form.get("reason"),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Decision unavailable");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Decision unavailable");
    } finally {
      setSaving("");
    }
  }

  return (
    <section
      className={
        "admin-relevance-workspace admin-relevance-workspace--" + mobilePane
      }
    >
      <header className="admin-relevance-heading">
        <div>
          <span className="admin-overline">
            {es ? "Cola de revisión" : "Review queue"}
          </span>
          <h1>{es ? "Relevancia del catálogo" : "Catalogue relevance"}</h1>
          <p>
            {es
              ? "Compara propuestas y decide sin perder de vista el catálogo."
              : "Review proposals and make decisions without leaving the queue."}
          </p>
        </div>
        <div className="admin-relevance-count">
          <strong>{total.toLocaleString(es ? "es-ES" : "en-GB")}</strong>
          <small>{es ? "pendientes" : "pending"}</small>
        </div>
      </header>

      <div
        className="admin-workbench-mobile-tabs"
        role="group"
        aria-label={es ? "Vista de revisión" : "Review view"}
      >
        <button
          type="button"
          aria-pressed={mobilePane === "list"}
          onClick={() => setMobilePane("list")}
        >
          {es ? "Propuestas" : "Proposals"}
        </button>
        <button
          type="button"
          aria-pressed={mobilePane === "editor"}
          onClick={() => setMobilePane("editor")}
          disabled={!selected}
        >
          {es ? "Revisar" : "Review"}
          {selected ? " · " + selected.name : ""}
        </button>
      </div>

      <div className="admin-relevance-body">
        <aside className="admin-relevance-sidebar">
          <div className="admin-relevance-filters">
            <label>
              <span className="sr-only">
                {es ? "Buscar propuestas" : "Search proposals"}
              </span>
              <input
                type="search"
                aria-label={es ? "Buscar propuestas" : "Search proposals"}
                placeholder={es ? "Nombre o dirección…" : "Name or address…"}
                value={q}
                onChange={(event) => {
                  setQ(event.target.value);
                  setOffset(0);
                }}
              />
            </label>
            <label>
              <span className="sr-only">
                {es ? "Tipo de propuesta" : "Proposal type"}
              </span>
              <select
                aria-label={es ? "Tipo de propuesta" : "Proposal type"}
                value={action}
                onChange={(event) => {
                  setAction(event.target.value);
                  setOffset(0);
                }}
              >
                <option value="">
                  {es ? "Todas las propuestas" : "All proposals"}
                </option>
                {relevanceActions.map((value) => (
                  <option value={value} key={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="admin-relevance-refresh"
              onClick={() => void load()}
              disabled={loading}
            >
              {loading
                ? es
                  ? "Cargando…"
                  : "Loading…"
                : es
                  ? "Actualizar"
                  : "Refresh"}
            </button>
          </div>
          <div
            className="admin-relevance-items"
            aria-label={es ? "Propuestas pendientes" : "Pending proposals"}
          >
            {rows.map((row) => (
              <button
                type="button"
                key={row.id}
                aria-pressed={selected?.id === row.id}
                className={
                  selected?.id === row.id
                    ? "admin-relevance-item selected"
                    : "admin-relevance-item"
                }
                onClick={() => {
                  setSelectedId(row.id);
                  setMobilePane("editor");
                }}
              >
                <span className="admin-relevance-item-top">
                  <strong>{row.name}</strong>
                  <span className="admin-relevance-tag">
                    {row.action.replaceAll("_", " ")}
                  </span>
                </span>
                <small>{row.address}</small>
                <span className="admin-relevance-item-foot">
                  {row.relevance_class.replaceAll("_", " ")}
                  {row.stale && <span>{es ? "Desactualizada" : "Stale"}</span>}
                </span>
              </button>
            ))}
            {!loading && rows.length === 0 && (
              <div className="admin-relevance-no-results">
                {es
                  ? "No hay propuestas con estos filtros."
                  : "No proposals match these filters."}
              </div>
            )}
          </div>
          <div className="admin-relevance-pagination">
            <button
              type="button"
              disabled={offset === 0 || loading}
              onClick={() => setOffset(Math.max(0, offset - 40))}
            >
              {es ? "Anterior" : "Previous"}
            </button>
            <small>
              {total
                ? `${offset + 1}–${Math.min(offset + rows.length, total)} / ${total}`
                : "0 / 0"}
            </small>
            <button
              type="button"
              disabled={offset + 40 >= total || loading}
              onClick={() => setOffset(offset + 40)}
            >
              {es ? "Siguiente" : "Next"}
            </button>
          </div>
        </aside>

        <article
          className="admin-relevance-editor"
          aria-label={es ? "Revisión de propuesta" : "Proposal review"}
        >
          {selected ? (
            <>
              <header className="admin-relevance-editor-heading">
                <div>
                  <span className="admin-overline">
                    {es ? "Ficha seleccionada" : "Selected venue"}
                  </span>
                  <h2>
                    <a
                      href={`/${locale}/venues/${selected.slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {selected.name}
                    </a>
                  </h2>
                  <p>{selected.address}</p>
                </div>
                <span className="admin-relevance-tag">
                  {selected.action.replaceAll("_", " ")}
                </span>
              </header>
              <div className="admin-relevance-evidence">
                <div>
                  <span>{es ? "Clasificación" : "Classification"}</span>
                  <strong>
                    {selected.relevance_class.replaceAll("_", " ")}
                  </strong>
                </div>
                <div>
                  <span>{es ? "Confianza" : "Confidence"}</span>
                  <strong>{selected.confidence}</strong>
                </div>
                <div>
                  <span>{es ? "Categoría original" : "Source category"}</span>
                  <strong>{selected.source_categories || "—"}</strong>
                </div>
                {selected.chain_name && (
                  <div>
                    <span>{es ? "Cadena" : "Chain"}</span>
                    <strong>{selected.chain_name}</strong>
                  </div>
                )}
              </div>
              <div className="admin-relevance-reason">
                <span className="admin-overline">
                  {es ? "Motivo propuesto" : "Proposal rationale"}
                </span>
                <p>{selected.reason}</p>
              </div>
              {selected.manual_override && (
                <p className="admin-relevance-alert">
                  {es
                    ? "Ya existe una decisión manual para esta ficha."
                    : "An earlier manual decision exists for this listing."}
                </p>
              )}
              {selected.stale ? (
                <p className="admin-relevance-alert" role="status">
                  {es
                    ? "La ficha cambió desde esta propuesta. Necesita una nueva evaluación."
                    : "This listing changed since the proposal. A fresh assessment is required."}
                </p>
              ) : (
                <form
                  key={selected.id}
                  className="admin-relevance-decision"
                  onSubmit={(event) => void save(event, selected)}
                >
                  <label>
                    {es ? "Decisión" : "Decision"}
                    <select name="decision" defaultValue="KEEP">
                      <option value="KEEP">{es ? "Mantener" : "Keep"}</option>
                      <option value="DOWNRANK">
                        {es ? "Prioridad menor" : "Lower priority"}
                      </option>
                      <option value="HIDE">
                        {es
                          ? "Ocultar del descubrimiento"
                          : "Hide from discovery"}
                      </option>
                    </select>
                  </label>
                  <label>
                    {es ? "Peso" : "Weight"}
                    <input
                      name="weight"
                      type="number"
                      min="0.01"
                      max="1"
                      step="0.01"
                      defaultValue="0.5"
                      required
                    />
                  </label>
                  <label className="admin-relevance-reason-field">
                    {es ? "Motivo auditado" : "Audited reason"}
                    <textarea
                      name="reason"
                      minLength={10}
                      maxLength={1000}
                      rows={3}
                      required
                      placeholder={
                        es ? "Explica tu decisión…" : "Explain your decision…"
                      }
                    />
                  </label>
                  <button
                    className="button primary"
                    type="submit"
                    disabled={Boolean(saving)}
                  >
                    {saving === selected.id
                      ? es
                        ? "Guardando…"
                        : "Saving…"
                      : es
                        ? "Guardar decisión"
                        : "Save decision"}
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="admin-master-placeholder">
              {es
                ? "Selecciona una propuesta para revisarla."
                : "Select a proposal to review."}
            </div>
          )}
        </article>
      </div>
      {error && (
        <p className="admin-relevance-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
