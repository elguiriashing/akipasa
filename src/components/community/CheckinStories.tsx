"use client";

import NextImage from "next/image";
import { Icon } from "@/components/Icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckinStoryComposer } from "./CheckinStoryComposer";
import styles from "./CheckinStories.module.css";

type EligibleCheckIn = {
  id: string;
  venueName: string;
  citySlug: string;
  acceptedAt: string;
};
type OwnedStory = {
  id: string;
  venueName: string;
  citySlug: string;
  caption: string;
  kind: "selfie" | "venue";
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  expiresAt: string;
  mediaUrl: string;
};
type ReadState<T> = {
  phase: "loading" | "ready" | "error";
  rows: T[];
  code?: string;
};
const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const date = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
function isCheckIn(value: unknown): value is EligibleCheckIn {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    uuid(row.id) &&
    typeof row.venueName === "string" &&
    typeof row.citySlug === "string" &&
    date(row.acceptedAt)
  );
}
function isStory(value: unknown): value is OwnedStory {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    uuid(row.id) &&
    ["venueName", "citySlug", "caption", "mediaUrl"].every(
      (key) => typeof row[key] === "string",
    ) &&
    ["selfie", "venue"].includes(String(row.kind)) &&
    ["pending", "approved", "rejected"].includes(String(row.status)) &&
    date(row.createdAt) &&
    date(row.expiresAt)
  );
}
const initial = <T,>(): ReadState<T> => ({ phase: "loading", rows: [] });
export function CheckinStories({
  locale,
  variant = "button",
  publishingEnabled = true,
}: {
  locale: "en" | "es";
  variant?: "button" | "story";
  publishingEnabled?: boolean;
}) {
  const es = locale === "es";
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [checkIns, setCheckIns] = useState<ReadState<EligibleCheckIn>>(initial);
  const [stories, setStories] = useState<ReadState<OwnedStory>>(initial);
  const [selected, setSelected] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const [confirmId, setConfirmId] = useState("");
  const [deleting, setDeleting] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [cleanupPendingIds, setCleanupPendingIds] = useState<string[]>([]);
  const [cleanupPendingHasMore, setCleanupPendingHasMore] = useState(false);
  const [deletedNotice, setDeletedNotice] = useState<
    "complete" | "pending" | ""
  >("");
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const deletion = useRef<AbortController | null>(null);
  const deletionBusy = useRef(false);
  const close = useCallback(() => {
    setOpen(false);
    dialog.current?.close();
    trigger.current?.focus();
  }, []);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setAuthRequired(false);
    setCheckIns(initial());
    setStories(initial());
    setSelected("");
    setConfirmId("");
    setDeleteError("");
    setDeletedNotice("");
    setCleanupPendingIds([]);
    setCleanupPendingHasMore(false);
    if (!dialog.current?.open) dialog.current?.showModal();
    const load = async <T,>(
      endpoint: string,
      key: "checkIns" | "stories",
      valid: (row: unknown) => row is T,
      write: (value: ReadState<T>) => void,
    ) => {
      try {
        const response = await fetch(`/api/community/stories/${endpoint}`, {
          credentials: "same-origin",
          signal: controller.signal,
          cache: "no-store",
        });
        const data = await response.json();
        if (controller.signal.aborted) return;
        if (response.status === 401) {
          setAuthRequired(true);
          return;
        }
        const pendingIds =
          data?.cleanupPendingIds === undefined ? [] : data.cleanupPendingIds;
        if (
          !response.ok ||
          data?.available !== true ||
          !Array.isArray(data[key]) ||
          !data[key].every(valid) ||
          (key === "stories" &&
            (!Array.isArray(pendingIds) ||
              !pendingIds.every(uuid) ||
              (data.cleanupPendingHasMore !== undefined &&
                typeof data.cleanupPendingHasMore !== "boolean")))
        )
          throw new Error(
            response.status === 429 ? "rate_limited" : "unavailable",
          );
        write({ phase: "ready", rows: data[key] });
        if (key === "stories") {
          setCleanupPendingIds([...new Set<string>(pendingIds)]);
          setCleanupPendingHasMore(data.cleanupPendingHasMore === true);
        }
      } catch (error) {
        if (!controller.signal.aborted)
          write({
            phase: "error",
            rows: [],
            code: error instanceof Error ? error.message : "unavailable",
          });
      }
    };
    if (publishingEnabled)
      void load("check-ins", "checkIns", isCheckIn, setCheckIns);
    void load("mine", "stories", isStory, setStories);
    return () => {
      controller.abort();
      deletion.current?.abort();
      deletionBusy.current = false;
      setDeleting("");
    };
  }, [open, revision, publishingEnabled]);
  const remove = async (id: string, retryCleanup = false) => {
    if (
      deletionBusy.current ||
      !uuid(id) ||
      (confirmId !== id && !(retryCleanup && cleanupPendingIds.includes(id)))
    )
      return;
    deletionBusy.current = true;
    setDeleting(id);
    setDeleteError("");
    setDeletedNotice("");
    const controller = new AbortController();
    deletion.current = controller;
    try {
      const response = await fetch(`/api/community/stories/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
        signal: controller.signal,
      });
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (response.status === 401) {
        setAuthRequired(true);
        return;
      }
      if (
        !response.ok ||
        data?.deleted !== true ||
        !["removed", "pending"].includes(data?.mediaCleanup)
      )
        throw new Error(
          response.status === 409
            ? "conflict"
            : response.status === 429
              ? "rate_limited"
              : "unavailable",
        );
      setStories((current) => ({
        ...current,
        rows: current.rows.filter((row) => row.id !== id),
      }));
      setConfirmId("");
      setCleanupPendingIds((current) =>
        data.mediaCleanup === "pending"
          ? [...new Set([...current, id])]
          : current.filter((value) => value !== id),
      );
      setDeletedNotice(
        data.mediaCleanup === "pending" ? "pending" : "complete",
      );
      if (data.mediaCleanup === "removed" && cleanupPendingHasMore)
        setRevision((value) => value + 1);
    } catch (error) {
      if (!controller.signal.aborted)
        setDeleteError(error instanceof Error ? error.message : "unavailable");
    } finally {
      if (!controller.signal.aborted) {
        deletionBusy.current = false;
        setDeleting("");
      }
    }
  };
  const failure = (code?: string) => (
    <div role="alert" className={styles.notice}>
      <p>
        {code === "rate_limited"
          ? es
            ? "Espera un momento antes de reintentar."
            : "Wait a moment before trying again."
          : es
            ? "No se han podido cargar los datos. No se muestran resultados estimados."
            : "These records could not be loaded. No estimated results are shown."}
      </p>
      <button
        type="button"
        className={styles.secondary}
        disabled={Boolean(deleting)}
        onClick={() => setRevision((value) => value + 1)}
      >
        {es ? "Reintentar" : "Retry"}
      </button>
    </div>
  );
  const chosen = checkIns.rows.find((row) => row.id === selected);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={variant === "story" ? styles.storyLaunch : styles.launch}
        onClick={() => {
          setCleanupPendingIds([]);
          setCheckIns(initial());
          setStories(initial());
          setSelected("");
          setAuthRequired(false);
          setOpen(true);
        }}
      >
        {variant === "story" && (
          <span className={styles.storyCircle} aria-hidden="true">
            <Icon name="plus" size={30} />
          </span>
        )}
        <span>
          {publishingEnabled
            ? es
              ? "Añadir historia"
              : "Add story"
            : es
              ? "Mis fotos"
              : "My photos"}
        </span>
      </button>
      <dialog
        ref={dialog}
        className={styles.dialog}
        onCancel={close}
        onClose={() => {
          setOpen(false);
          trigger.current?.focus();
        }}
        aria-labelledby={`checkin-stories-title-${locale}`}
      >
        <header className={styles.header}>
          <div>
            <span>{es ? "TUS MOMENTOS REALES" : "YOUR REAL MOMENTS"}</span>
            <h2 id={`checkin-stories-title-${locale}`}>
              {publishingEnabled
                ? es
                  ? "Tus historias"
                  : "Your stories"
                : es
                  ? "Gestionar mis fotos"
                  : "Manage my photos"}
            </h2>
          </div>
          <button type="button" className={styles.secondary} onClick={close}>
            {es ? "Cerrar" : "Close"}
          </button>
        </header>
        {open && (
          <div className={styles.content}>
            <p>
              {publishingEnabled
                ? es
                  ? "Comparte una foto de un check-in verificado propio de las últimas 24 horas. Es opcional, requiere tu autorización pública y pasa por revisión antes de publicarse."
                  : "Share a photo from your own verified check-in in the last 24 hours. It is optional, requires your public-sharing permission and is reviewed before publication."
                : es
                  ? "La publicación de nuevas historias no está disponible. Puedes consultar y retirar tus fotos existentes."
                  : "New story publishing is unavailable. You can view and remove your existing photos."}
            </p>
            {authRequired ? (
              <div className={styles.notice} role="alert">
                <p>
                  {es
                    ? "Inicia sesión para ver tus check-ins e historias privadas."
                    : "Sign in to see your check-ins and private story status."}
                </p>
                <a
                  className={styles.launch}
                  href={`/${locale}/auth?${new URLSearchParams({ next: `/${locale}/community` })}`}
                >
                  {es ? "Iniciar sesión" : "Sign in"}
                </a>
              </div>
            ) : (
              <>
                {publishingEnabled && (
                  <section
                    className={styles.section}
                    aria-label={es ? "Elegir check-in" : "Choose check-in"}
                  >
                    <h3>{es ? "Elige tu check-in" : "Choose your check-in"}</h3>
                    {checkIns.phase === "loading" ? (
                      <p role="status">
                        {es
                          ? "Cargando tus check-ins…"
                          : "Loading your check-ins…"}
                      </p>
                    ) : checkIns.phase === "error" ? (
                      failure(checkIns.code)
                    ) : checkIns.rows.length === 0 ? (
                      <div className={styles.notice}>
                        <p>
                          {es
                            ? "Aún no hay check-ins verificados disponibles para compartir. Escanear o abrir una página no cuenta como asistencia."
                            : "There are no verified check-ins available to share yet. Scanning or opening a page does not count as attendance."}
                        </p>
                        <a
                          className={styles.secondary}
                          href={`/${locale}/check-in`}
                        >
                          {es ? "Ir a Check-in" : "Go to Check-in"}
                        </a>
                      </div>
                    ) : (
                      <label className={styles.select}>
                        {es ? "Lugar visitado" : "Place visited"}
                        <select
                          aria-label={es ? "Lugar visitado" : "Place visited"}
                          value={selected}
                          onChange={(event) => setSelected(event.target.value)}
                        >
                          <option value="">
                            {es
                              ? "Selecciona un check-in"
                              : "Select a check-in"}
                          </option>
                          {checkIns.rows.map((row) => (
                            <option key={row.id} value={row.id}>
                              {row.venueName} ·{" "}
                              {new Date(row.acceptedAt).toLocaleString(
                                es ? "es-ES" : "en-GB",
                                {
                                  timeZone: "Europe/Madrid",
                                  dateStyle: "short",
                                  timeStyle: "short",
                                },
                              )}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {chosen && (
                      <CheckinStoryComposer
                        key={chosen.id}
                        locale={locale}
                        checkInId={chosen.id}
                        venueName={chosen.venueName}
                      />
                    )}
                  </section>
                )}
                <section
                  className={styles.section}
                  aria-label={es ? "Tus envíos" : "Your submissions"}
                >
                  <div className={styles.sectionHead}>
                    <h3>{es ? "Tus envíos" : "Your submissions"}</h3>
                    <button
                      type="button"
                      className={styles.secondary}
                      disabled={Boolean(deleting)}
                      onClick={() => setRevision((value) => value + 1)}
                    >
                      {es ? "Actualizar historias" : "Refresh your stories"}
                    </button>
                  </div>
                  <p className={styles.hint}>
                    {es
                      ? "Actualiza después de enviar una foto para consultar su estado. Solo aparecen tus historias aún vigentes; no se inventan publicaciones."
                      : "Refresh after submitting a photo to check its status. Only your unexpired stories appear; no activity is invented."}
                  </p>
                  {deletedNotice && (
                    <p role="status" className={styles.notice}>
                      {deletedNotice === "pending"
                        ? es
                          ? "La historia ya no se comparte. La limpieza del archivo sigue pendiente."
                          : "The story is no longer shared. Media cleanup is still pending."
                        : es
                          ? "Historia retirada."
                          : "Story removed."}
                    </p>
                  )}
                  {(cleanupPendingIds.length > 0 || cleanupPendingHasMore) && (
                    <div className={styles.notice}>
                      <p>
                        {es
                          ? "Las historias retiradas ya no se comparten. Queda pendiente la limpieza de sus archivos privados."
                          : "Removed stories are no longer shared. Their private media cleanup is still pending."}
                      </p>
                      {cleanupPendingHasMore && (
                        <p>
                          {es
                            ? "Hay más archivos pendientes. Actualiza tus historias después de limpiar los mostrados para cargar el siguiente grupo."
                            : "More media cleanup is pending. Refresh your stories after cleaning up the listed files to load the next group."}
                        </p>
                      )}
                      {cleanupPendingIds.map((id) => (
                        <button
                          key={id}
                          type="button"
                          className={styles.secondary}
                          disabled={Boolean(deleting)}
                          onClick={() => void remove(id, true)}
                        >
                          {es
                            ? "Reintentar limpieza del archivo"
                            : "Retry media cleanup"}
                        </button>
                      ))}
                      {deleteError && !confirmId && (
                        <p role="alert">
                          {es
                            ? "No se ha confirmado la limpieza. Puedes reintentar; la historia sigue retirada."
                            : "Media cleanup was not confirmed. You can retry; the story remains removed."}
                        </p>
                      )}
                    </div>
                  )}
                  {stories.phase === "loading" ? (
                    <p role="status">
                      {es ? "Cargando tus historias…" : "Loading your stories…"}
                    </p>
                  ) : stories.phase === "error" ? (
                    failure(stories.code)
                  ) : stories.rows.length === 0 ? (
                    <p>
                      {es
                        ? "Todavía no tienes historias vigentes."
                        : "You have no current stories yet."}
                    </p>
                  ) : (
                    <div className={styles.list}>
                      {stories.rows.map((story) => (
                        <article key={story.id} className={styles.card}>
                          {story.mediaUrl ===
                            `/api/community/stories/${story.id}/media` && (
                            <NextImage
                              unoptimized
                              width={480}
                              height={360}
                              className={styles.photo}
                              src={story.mediaUrl}
                              alt={
                                es ? "Tu foto enviada" : "Your submitted photo"
                              }
                            />
                          )}
                          <h4>{story.venueName}</h4>
                          <strong className={styles.status}>
                            {story.status === "approved"
                              ? es
                                ? "Aprobada"
                                : "Approved"
                              : story.status === "rejected"
                                ? es
                                  ? "No publicada"
                                  : "Not published"
                                : es
                                  ? "Pendiente de revisión"
                                  : "Awaiting review"}
                          </strong>
                          <p>{story.caption}</p>
                          <p className={styles.hint}>
                            {story.status === "pending"
                              ? es
                                ? "No se publica hasta que se apruebe."
                                : "Not published until approved."
                              : story.status === "rejected"
                                ? es
                                  ? "Esta historia no se publica en la ciudad."
                                  : "This story is not published in city stories."
                                : es
                                  ? "Visible en las historias de la ciudad hasta su caducidad."
                                  : "Visible in city stories until it expires."}
                          </p>
                          {confirmId === story.id ? (
                            <div className={styles.notice}>
                              <p>
                                {es
                                  ? "¿Retirar esta historia? Dejará de compartirse en la ciudad."
                                  : "Remove this story? It will stop being shared in city stories."}
                              </p>
                              <div className={styles.actions}>
                                <button
                                  type="button"
                                  className={styles.secondary}
                                  disabled={Boolean(deleting)}
                                  onClick={() => {
                                    setConfirmId("");
                                    setDeleteError("");
                                  }}
                                >
                                  {es ? "Conservar" : "Keep story"}
                                </button>
                                <button
                                  type="button"
                                  className={styles.danger}
                                  disabled={Boolean(deleting)}
                                  onClick={() => void remove(story.id)}
                                >
                                  {deleting === story.id
                                    ? es
                                      ? "Retirando…"
                                      : "Removing…"
                                    : es
                                      ? "Confirmar retirada"
                                      : "Confirm removal"}
                                </button>
                              </div>
                              {deleteError && (
                                <p role="alert">
                                  {deleteError === "conflict"
                                    ? es
                                      ? "La historia ha cambiado. Actualiza antes de volver a intentarlo."
                                      : "The story has changed. Refresh before trying again."
                                    : deleteError === "rate_limited"
                                      ? es
                                        ? "Espera antes de reintentar. La retirada no se ha confirmado."
                                        : "Wait before retrying. Removal has not been confirmed."
                                      : es
                                        ? "No se ha podido confirmar la retirada. La historia sigue en la lista; puedes reintentar."
                                        : "Removal could not be confirmed. The story remains in the list; you can retry."}
                                </p>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              className={styles.secondary}
                              disabled={Boolean(deleting)}
                              onClick={() => {
                                setConfirmId(story.id);
                                setDeleteError("");
                                setDeletedNotice("");
                              }}
                            >
                              {es ? "Retirar historia" : "Remove story"}
                            </button>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
