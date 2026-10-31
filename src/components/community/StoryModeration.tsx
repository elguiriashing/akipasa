"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { CityStory } from "@/lib/community-stories/contracts";
import styles from "./StoryModeration.module.css";

export type ModerationStory = CityStory & {
  status: "pending" | "approved";
  reportCount: number;
};
type Queue = "pending" | "reported";
type Decision = "approve" | "reject" | "remove";
function isModerationStory(value: unknown): value is ModerationStory {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      row.id,
    ) &&
    ["citySlug", "venueName", "caption", "mediaUrl"].every(
      (key) => typeof row[key] === "string",
    ) &&
    (row.status === "pending" || row.status === "approved") &&
    (row.kind === "selfie" || row.kind === "venue") &&
    typeof row.createdAt === "string" &&
    Number.isFinite(Date.parse(row.createdAt)) &&
    typeof row.expiresAt === "string" &&
    Number.isFinite(Date.parse(row.expiresAt)) &&
    Number.isSafeInteger(row.reportCount) &&
    Number(row.reportCount) >= 0
  );
}
function StoryPreview({
  story,
  es,
  onReady,
}: {
  story: ModerationStory;
  es: boolean;
  onReady: (ready: boolean) => void;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={styles.preview}>
      {!failed &&
      story.mediaUrl === `/api/community/stories/${story.id}/media` ? (
        <Image
          unoptimized
          width={640}
          height={800}
          src={story.mediaUrl}
          alt={
            es
              ? "Contenido enviado para revisión"
              : "Content submitted for review"
          }
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => onReady(true)}
          onError={() => {
            setFailed(true);
            onReady(false);
          }}
        />
      ) : (
        <p>{es ? "Vista previa no disponible" : "Preview unavailable"}</p>
      )}
    </div>
  );
}

// The API must independently authenticate and authorize every queue, preview and
// decision. Rendering this client component never grants moderation authority.
export function StoryModeration({ locale }: { locale: "en" | "es" }) {
  const es = locale === "es";
  const [queue, setQueue] = useState<Queue>("pending");
  const [stories, setStories] = useState<ModerationStory[]>([]);
  const [state, setState] = useState<
    "loading" | "ready" | "error" | "restricted"
  >("loading");
  const [previews, setPreviews] = useState<Record<string, boolean>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const loading = useRef<AbortController | null>(null);
  const mutation = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    loading.current?.abort();
    const controller = new AbortController();
    loading.current = controller;
    setState("loading");
    setStories([]);
    setPreviews({});
    try {
      const response = await fetch(
        `/api/community/stories/moderation?queue=${queue}`,
        {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        },
      );
      if (controller.signal.aborted) return;
      if (response.status === 401 || response.status === 403) {
        setState("restricted");
        return;
      }
      if (!response.ok) throw new Error("queue-unavailable");
      const data = await response.json();
      if (
        !data.available ||
        !Array.isArray(data.stories) ||
        !data.stories.every(isModerationStory)
      )
        throw new Error("queue-unavailable");
      if (controller.signal.aborted) return;
      setStories(data.stories);
      setState("ready");
    } catch {
      if (!controller.signal.aborted) setState("error");
    }
  }, [queue]);
  useEffect(() => {
    void load();
    return () => loading.current?.abort();
  }, [load]);
  useEffect(() => () => mutation.current?.abort(), []);

  async function decide(story: ModerationStory, decision: Decision) {
    if (
      busy ||
      mutation.current ||
      (decision === "approve" && !previews[story.id])
    )
      return;
    const reason = (reasons[story.id] || "").trim();
    if (reason.length < 3 || reason.length > 240) {
      setError(
        es
          ? "Escribe un motivo de entre 3 y 240 caracteres."
          : "Enter a reason between 3 and 240 characters.",
      );
      document.getElementById(`story-reason-${story.id}`)?.focus();
      return;
    }
    const controller = new AbortController();
    mutation.current = controller;
    setBusy(story.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/community/stories/${encodeURIComponent(story.id)}/moderate`,
        {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision, reason }),
          signal: controller.signal,
        },
      );
      if (response.status === 401 || response.status === 403) {
        setStories([]);
        setState("restricted");
        return;
      }
      if (!response.ok) throw new Error("decision-unavailable");
      if (controller.signal.aborted) return;
      setReasons((previous) => {
        const next = { ...previous };
        delete next[story.id];
        return next;
      });
      setNotice(
        es
          ? "Decisión registrada. Actualizando la cola…"
          : "Decision recorded. Refreshing the queue…",
      );
      await load();
    } catch {
      if (!controller.signal.aborted)
        setError(
          es
            ? "No se pudo confirmar la decisión. Revisa la cola antes de volver a intentarlo."
            : "The decision could not be confirmed. Review the queue before trying again.",
        );
    } finally {
      mutation.current = null;
      if (!controller.signal.aborted) setBusy(null);
    }
  }

  return (
    <section
      className={styles.section}
      aria-labelledby="story-moderation-title"
      aria-busy={state === "loading" || !!busy}
    >
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            {es ? "Confianza · historias" : "Trust · stories"}
          </span>
          <h2 id="story-moderation-title">
            {es ? "Revisión de historias" : "Story review"}
          </h2>
          <p>
            {es
              ? "Revisa el contenido antes de publicarlo. Cada decisión requiere un motivo y queda registrada."
              : "Review content before publication. Every decision needs a reason and is recorded."}
          </p>
        </div>
        <button
          type="button"
          disabled={!!busy || state === "loading"}
          onClick={() => void load()}
        >
          {es ? "Actualizar" : "Refresh"}
        </button>
      </header>
      <div
        className={styles.tabs}
        role="group"
        aria-label={es ? "Cola de revisión" : "Review queue"}
      >
        {(["pending", "reported"] as const).map((value) => (
          <button
            type="button"
            key={value}
            disabled={!!busy}
            aria-pressed={queue === value}
            onClick={() => {
              setQueue(value);
              setError("");
              setNotice("");
            }}
          >
            {value === "pending"
              ? es
                ? "Pendientes de publicación"
                : "Awaiting publication"
              : es
                ? "Denuncias y retirada"
                : "Reports and takedown"}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {state === "loading" && (
        <p role="status">{es ? "Cargando cola…" : "Loading queue…"}</p>
      )}
      {state === "restricted" && (
        <p role="alert">
          {es
            ? "Necesitas una sesión de personal autorizado para revisar historias."
            : "An authorized staff session is required to review stories."}
        </p>
      )}
      {state === "error" && (
        <div role="alert" className={styles.error}>
          <p>
            {es
              ? "No se pudo cargar la cola. No se muestran resultados incompletos."
              : "The queue could not load. Incomplete results are not shown."}
          </p>
          <button type="button" disabled={!!busy} onClick={() => void load()}>
            {es ? "Reintentar" : "Retry"}
          </button>
        </div>
      )}
      {state === "ready" && !stories.length && (
        <div className={styles.empty}>
          <h3>
            {queue === "pending"
              ? es
                ? "No hay historias pendientes"
                : "No stories awaiting review"
              : es
                ? "No hay denuncias pendientes"
                : "No reports awaiting review"}
          </h3>
          <p>
            {es
              ? "Esta cola está al día. Actualiza para buscar nuevas entradas."
              : "This queue is up to date. Refresh to check for new entries."}
          </p>
        </div>
      )}
      <div className={styles.list}>
        {state === "ready" &&
          stories.map((story) => (
            <article key={story.id} className={styles.card}>
              <StoryPreview
                story={story}
                es={es}
                onReady={(ready) =>
                  setPreviews((previous) => ({
                    ...previous,
                    [story.id]: ready,
                  }))
                }
              />
              <div className={styles.details}>
                <span className={styles.badge}>
                  {story.status === "pending"
                    ? es
                      ? "No publicada"
                      : "Not published"
                    : es
                      ? "Publicada · revisión de denuncias"
                      : "Published · report review"}
                </span>
                <h3>{story.venueName}</h3>
                <p>
                  {story.citySlug} ·{" "}
                  {story.kind === "selfie"
                    ? es
                      ? "Selfie"
                      : "Selfie"
                    : es
                      ? "Local"
                      : "Venue"}
                </p>
                {story.caption && (
                  <p className={styles.caption}>{story.caption}</p>
                )}
                {queue === "reported" && (
                  <p>
                    {es ? "Denuncias recibidas" : "Reports received"}:{" "}
                    {story.reportCount}
                  </p>
                )}
                <p>
                  <time dateTime={story.createdAt}>
                    {es ? "Enviada" : "Submitted"}:{" "}
                    {new Date(story.createdAt).toLocaleString(locale, {
                      timeZone: "Europe/Madrid",
                    })}
                  </time>
                </p>
                <label htmlFor={`story-reason-${story.id}`}>
                  {es
                    ? "Motivo de la decisión (obligatorio)"
                    : "Decision reason (required)"}
                </label>
                <textarea
                  id={`story-reason-${story.id}`}
                  value={reasons[story.id] || ""}
                  onChange={(event) =>
                    setReasons((previous) => ({
                      ...previous,
                      [story.id]: event.target.value,
                    }))
                  }
                  minLength={3}
                  maxLength={240}
                  required
                  disabled={!!busy}
                />
                <div className={styles.actions}>
                  {story.status === "pending" ? (
                    <>
                      <button
                        type="button"
                        disabled={!!busy || !previews[story.id]}
                        onClick={() => void decide(story, "approve")}
                      >
                        {es ? "Aprobar publicación" : "Approve publication"}
                      </button>
                      <button
                        type="button"
                        className={styles.danger}
                        disabled={!!busy}
                        onClick={() => void decide(story, "reject")}
                      >
                        {es ? "Rechazar historia" : "Reject story"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className={styles.danger}
                      disabled={!!busy}
                      onClick={() => void decide(story, "remove")}
                    >
                      {es ? "Retirar publicación" : "Take down story"}
                    </button>
                  )}
                </div>
                {busy === story.id && (
                  <p role="status">
                    {es ? "Registrando decisión…" : "Recording decision…"}
                  </p>
                )}
              </div>
            </article>
          ))}
      </div>
      <p className={styles.footnote}>
        {es
          ? "La vista previa es privada y requiere autorización del servidor. No se muestra la identidad privada ni la ubicación de quien comparte."
          : "Previews are private and require server authorization. The contributor’s private identity and location are not shown."}
      </p>
    </section>
  );
}
