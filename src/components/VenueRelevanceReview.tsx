"use client";
import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@/lib/config";
import {
  relevanceActions,
  type RelevanceProposal,
} from "@/lib/venue-relevance";

export function VenueRelevanceReview({ locale }: { locale: Locale }) {
  const es = locale === "es";
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<RelevanceProposal[]>([]);
  const [total, setTotal] = useState(0);
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
        if (!response.ok) throw new Error(data.error);
        setRows(data.rows);
        setTotal(data.total);
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError"))
          setError(e instanceof Error ? e.message : "Review unavailable");
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
  async function save(
    event: React.FormEvent<HTMLFormElement>,
    row: RelevanceProposal,
  ) {
    event.preventDefault();
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
      if (!response.ok) throw new Error(data.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Decision unavailable");
    } finally {
      setSaving("");
    }
  }
  return (
    <section className="surface space-y-5 p-5">
      <header>
        <h1 className="text-2xl font-semibold">
          {es ? "Relevancia del catálogo" : "Catalogue relevance"}
        </h1>
        <p>
          {es
            ? "Revisa las propuestas pendientes. Los cambios conservan la ficha y su historial."
            : "Review pending proposals. Decisions preserve the listing and its history."}
        </p>
      </header>
      <div className="flex flex-wrap gap-3">
        <input
          className="field"
          aria-label={es ? "Buscar propuestas" : "Search proposals"}
          placeholder={es ? "Nombre o dirección" : "Name or address"}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOffset(0);
          }}
        />
        <select
          className="field"
          aria-label={es ? "Tipo de propuesta" : "Proposal type"}
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setOffset(0);
          }}
        >
          <option value="">
            {es ? "Todas las pendientes" : "All pending"}
          </option>
          {relevanceActions.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <button
          className="button-secondary"
          onClick={() => void load()}
          disabled={loading}
        >
          {es ? "Actualizar" : "Refresh"}
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      <p aria-live="polite">
        {loading
          ? es
            ? "Cargando…"
            : "Loading…"
          : `${total.toLocaleString()} ${es ? "propuestas pendientes" : "pending proposals"}`}
      </p>
      {rows.map((row) => (
        <article key={row.id} className="space-y-3 rounded-xl border p-4">
          <h2 className="text-lg font-semibold">
            <a
              href={`/${locale}/venues/${row.slug}`}
              target="_blank"
              rel="noreferrer"
            >
              {row.name}
            </a>
          </h2>
          <p>{row.address}</p>
          <p>
            {row.action} · {row.relevance_class}
            {row.chain_name ? ` · ${row.chain_name}` : ""}
          </p>
          <p>{row.reason}</p>
          <p className="text-sm">
            {es ? "Categoría original" : "Original category"}:{" "}
            {row.source_categories || "—"} · {row.confidence}
          </p>
          {row.manual_override && (
            <p>
              {es
                ? "Existe una decisión manual previa."
                : "An earlier manual decision exists."}
            </p>
          )}
          {row.stale ? (
            <p>
              {es
                ? "La ficha cambió desde esta propuesta; necesita una nueva evaluación."
                : "This listing changed after the proposal; it needs a fresh assessment."}
            </p>
          ) : (
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(e) => void save(e, row)}
            >
              <label>
                {es ? "Decisión" : "Decision"}
                <select name="decision" className="field" defaultValue="KEEP">
                  <option value="KEEP">{es ? "Mantener" : "Keep"}</option>
                  <option value="DOWNRANK">
                    {es ? "Prioridad menor" : "Lower priority"}
                  </option>
                  <option value="HIDE">
                    {es
                      ? "Ocultar de búsquedas y descubrimiento"
                      : "Hide from search and discovery"}
                  </option>
                </select>
              </label>
              <label>
                {es ? "Peso de prioridad menor" : "Lower-priority weight"}
                <input
                  name="weight"
                  type="number"
                  className="field"
                  min="0.01"
                  max="1"
                  step="0.01"
                  defaultValue="0.5"
                  required
                />
              </label>
              <label className="grow">
                {es ? "Motivo" : "Reason"}
                <input
                  name="reason"
                  className="field w-full"
                  minLength={10}
                  maxLength={1000}
                  required
                />
              </label>
              <button className="button-primary" disabled={saving === row.id}>
                {saving === row.id
                  ? es
                    ? "Guardando…"
                    : "Saving…"
                  : es
                    ? "Guardar decisión"
                    : "Save decision"}
              </button>
            </form>
          )}
        </article>
      ))}
      {!loading && rows.length === 0 && (
        <p>
          {es
            ? "No hay propuestas con este filtro."
            : "No proposals match this filter."}
        </p>
      )}
      <div className="flex gap-3">
        <button
          className="button-secondary"
          disabled={offset === 0 || loading}
          onClick={() => setOffset(Math.max(0, offset - 40))}
        >
          {es ? "Anterior" : "Previous"}
        </button>
        <button
          className="button-secondary"
          disabled={offset + 40 >= total || loading}
          onClick={() => setOffset(offset + 40)}
        >
          {es ? "Siguiente" : "Next"}
        </button>
      </div>
    </section>
  );
}
