/* eslint-disable @next/next/no-img-element -- Venue media uses native images with existing layout controls. */
"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { SafeMediaFileInput } from "@/components/SafeMediaFileInput";
import {
  addStayHeaderPhoto,
  clearVenueMediaPlacement,
  removeStayHeaderPhoto,
  removeVenueImage,
  setVenueMediaPlacement,
} from "@/app/[locale]/business/venue/[id]/actions";

export type VenueMediaStudioItem = {
  id: string;
  url: string;
  alt: string;
  sizeBytes: number;
};

export type VenueMediaPlacement =
  | "venue_profile"
  | "venue_cover"
  | "venue_menu"
  | "venue_events"
  | "venue_explore";

const slots: Array<{
  key: VenueMediaPlacement;
  icon: string;
  en: string;
  es: string;
  enHelp: string;
  esHelp: string;
}> = [
  {
    key: "venue_profile",
    icon: "⌂",
    en: "Profile / logo",
    es: "Perfil / logo",
    enHelp: "Small identity image beside the venue name.",
    esHelp: "Imagen pequeña de identidad junto al nombre del local.",
  },
  {
    key: "venue_cover",
    icon: "▣",
    en: "Venue banner",
    es: "Banner del local",
    enHelp: "Wide hero image at the top of the venue page.",
    esHelp: "Imagen panorámica en la cabecera de la ficha del local.",
  },
  {
    key: "venue_menu",
    icon: "☰",
    en: "Menu",
    es: "Carta",
    enHelp: "Default visual for the public menu/catalogue.",
    esHelp: "Imagen por defecto de la carta/catálogo público.",
  },
  {
    key: "venue_events",
    icon: "◫",
    en: "Event fallback",
    es: "Eventos",
    enHelp: "Fallback image for venue events without their own media.",
    esHelp: "Imagen de respaldo para eventos sin imágenes propias.",
  },
  {
    key: "venue_explore",
    icon: "◎",
    en: "Explore",
    es: "Explorar",
    enHelp: "Default venue artwork used in discovery cards.",
    esHelp: "Imagen del local usada por defecto en tarjetas de descubrimiento.",
  },
];

export function VenueMediaStudio({
  locale,
  venueId,
  media,
  placements,
  accommodation = false,
  stayHeaderIds = [],
}: {
  locale: "es" | "en";
  venueId: string;
  media: VenueMediaStudioItem[];
  placements: Partial<Record<VenueMediaPlacement, string>>;
  accommodation?: boolean;
  stayHeaderIds?: string[];
}) {
  const es = locale === "es";
  const [items, setItems] = useState(media);
  const [headerIds, setHeaderIds] = useState(stayHeaderIds);
  const [slotState, setSlotState] =
    useState<Partial<Record<VenueMediaPlacement, string>>>(placements);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [uploadError, setUploadError] = useState("");
  const uploadFormRef = useRef<HTMLFormElement>(null);
  const fallback = items[0] || null;

  function selectedFor(slot: VenueMediaPlacement) {
    const explicit = slotState[slot]
      ? items.find((item) => item.id === slotState[slot])
      : null;
    return explicit || (accommodation ? null : fallback);
  }

  async function setPlacement(slot: VenueMediaPlacement, mediaId: string) {
    setBusy(true);
    const fd = new FormData();
    fd.set("inline", "1");
    fd.set("locale", locale);
    fd.set("venueId", venueId);
    fd.set("mediaId", mediaId);
    fd.set("placement", slot);
    const result = await setVenueMediaPlacement(fd);
    if (result?.ok) {
      setSlotState((current) => ({ ...current, [slot]: mediaId }));
      setStatus("saved");
    } else {
      setStatus("error");
    }
    setBusy(false);
    window.setTimeout(() => setStatus("idle"), 1800);
  }

  async function clearPlacement(slot: VenueMediaPlacement) {
    setBusy(true);
    const fd = new FormData();
    fd.set("inline", "1");
    fd.set("locale", locale);
    fd.set("venueId", venueId);
    fd.set("placement", slot);
    const result = await clearVenueMediaPlacement(fd);
    if (result?.ok) {
      setSlotState((current) => {
        const next = { ...current };
        delete next[slot];
        return next;
      });
      setStatus("saved");
    } else {
      setStatus("error");
    }
    setBusy(false);
    window.setTimeout(() => setStatus("idle"), 1800);
  }

  async function updateHeader(mediaId: string, add: boolean) {
    setBusy(true);
    const fd = new FormData();
    fd.set("locale", locale);
    fd.set("venueId", venueId);
    fd.set("mediaId", mediaId);
    try {
      const result = add
        ? await addStayHeaderPhoto(fd)
        : await removeStayHeaderPhoto(fd);
      if (result.ok) {
        setHeaderIds((current) =>
          add ? [...new Set([...current, mediaId])] : current.filter((id) => id !== mediaId),
        );
        setStatus("saved");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  async function uploadMedia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const source = new FormData(form);
    const files = source
      .getAll("image")
      .filter(
        (value): value is File => value instanceof File && value.size > 0,
      );
    if (!files.length) return;

    const sharedAlt = String(source.get("alt") || "").trim();
    const toHeader = source.get("destination") === "stay_header";
    if (toHeader && files.length + headerIds.length > 12) {
      setUploadError(es
        ? "La cabecera admite un máximo de 12 fotos. Quita algunas o selecciona menos."
        : "The header holds up to 12 photos. Remove some or select fewer.");
      return;
    }
    setBusy(true);
    setUploadError("");
    setUploadProgress({ done: 0, total: files.length });

    const uploaded: VenueMediaStudioItem[] = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const fallbackAlt =
        file.name
          .replace(/\.[^.]+$/, "")
          .replace(/[-_]+/g, " ")
          .trim() || (es ? "Imagen del local" : "Venue image");
      const safeAlt =
        fallbackAlt.length >= 3
          ? fallbackAlt
          : es
            ? `Imagen del local ${index + 1}`
            : `Venue image ${index + 1}`;
      const fd = new FormData();
      fd.set("inline", "1");
      fd.set("locale", locale);
      fd.set("venueId", venueId);
      fd.set("sortOrder", String(items.length + index));
      fd.set("image", file);
      fd.set(
        "alt",
        files.length === 1 && sharedAlt
          ? sharedAlt
          : sharedAlt
            ? `${sharedAlt} ${index + 1}`
            : safeAlt,
      );

      let result;
      try {
        const response = await fetch("/api/business/venue-media", {
          method: "POST",
          body: fd,
          credentials: "same-origin",
          cache: "no-store",
        });
        result = await response
          .json()
          .catch(() => ({ ok: false, error: "unavailable" }));
      } catch {
        setUploadError(
          es
            ? `Falló la subida de ${file.name}. Comprueba la conexión.`
            : `Upload failed for ${file.name}. Check your connection.`,
        );
        setItems((current) => [...current, ...uploaded]);
        setStatus("error");
        setBusy(false);
        setUploadProgress(null);
        return;
      }
      if (!result?.ok || !result.media?.url) {
        const reason = result?.error;
        const explanation =
          reason === "invalid-file"
            ? es
              ? "Archivo inválido o demasiado grande."
              : "Invalid or oversized file."
            : reason === "storage"
              ? es
                ? "El almacenamiento rechazó el archivo."
                : "Storage rejected the file."
              : reason === "database"
                ? es
                  ? "No se pudo guardar el archivo en la biblioteca."
                  : "Could not save the file to the media library."
                : reason === "translation"
                  ? es
                    ? "Falló la traducción de la descripción."
                    : "Description translation failed."
                  : reason === "unavailable" || reason === "origin"
                    ? es
                      ? "El servidor no pudo procesar la subida. Vuelve a iniciar sesión y reinténtalo."
                      : "The server could not process the upload. Sign in again and retry."
                    : es
                      ? "No se pudo completar la subida."
                      : "Upload could not be completed.";
        setUploadError(`${file.name}: ${explanation}`);
        setItems((current) => [...current, ...uploaded]);
        setStatus("error");
        setBusy(false);
        setUploadProgress(null);
        return;
      }
      uploaded.push(result.media);
      if (toHeader) {
        const placement = new FormData();
        placement.set("locale", locale);
        placement.set("venueId", venueId);
        placement.set("mediaId", result.media.id);
        const assigned = await addStayHeaderPhoto(placement).catch(() => ({ ok: false }));
        if (!assigned.ok) {
          setItems((current) => [...current, ...uploaded]);
          setUploadError(es
            ? "La imagen se guardó en la biblioteca, pero no se pudo añadir a la cabecera. Selecciónala abajo."
            : "Photo saved to the library, but could not be added to the header. Select it below.");
          setStatus("error");
          setBusy(false);
          setUploadProgress(null);
          return;
        }
        setHeaderIds((current) => [...current, result.media.id]);
      }
      setUploadProgress({ done: index + 1, total: files.length });
    }

    setItems((current) => [...current, ...uploaded]);
    form.reset();
    setStatus("saved");
    setBusy(false);
    setUploadProgress(null);
    window.setTimeout(() => setStatus("idle"), 1800);
  }

  async function removeMedia(mediaId: string) {
    setBusy(true);
    const fd = new FormData();
    fd.set("inline", "1");
    fd.set("locale", locale);
    fd.set("venueId", venueId);
    fd.set("mediaId", mediaId);
    const result = await removeVenueImage(fd);
    if (result?.ok) {
      setItems((current) => current.filter((item) => item.id !== mediaId));
      setHeaderIds((current) => current.filter((id) => id !== mediaId));
      setSlotState((current) => {
        const next = { ...current };
        (Object.keys(next) as VenueMediaPlacement[]).forEach((key) => {
          if (next[key] === mediaId) delete next[key];
        });
        return next;
      });
      setStatus("saved");
    } else {
      setStatus("error");
    }
    setBusy(false);
    window.setTimeout(() => setStatus("idle"), 1800);
  }

  const usedBy = useMemo(() => {
    const map = new Map<string, string[]>();
    slots.forEach((slot) => {
      const mediaId = slotState[slot.key];
      if (!mediaId) return;
      const labels = map.get(mediaId) || [];
      labels.push(es ? slot.es : slot.en);
      map.set(mediaId, labels);
    });
    return map;
  }, [slotState, es]);

  return (
    <section className="media-studio media-studio-five">
      <header className="media-studio-header">
        <div>
          <span className="eyebrow">
            {accommodation ? (es ? "Imágenes del alojamiento" : "Property images") : (es ? "Imágenes del local" : "Venue images")}
          </span>
          <h2>
            {es
              ? "Cinco superficies, una biblioteca."
              : "Five surfaces, one media library."}
          </h2>
          <p>
            {accommodation
              ? es
                ? "Elige las cinco imágenes de la ficha. Las fotos de la cabecera se gestionan por separado."
                : "Choose the five listing images. Manage public header photos separately below."
              : es
                ? "Elige cada imagen sin salir de la página. Si una ranura queda vacía, AkiPasa usa la primera imagen de la biblioteca."
                : "Assign each image without leaving the page. Empty slots automatically use the first media-library image."}
          </p>
        </div>
        <small className="media-studio-live-status" aria-live="polite">
          {busy
            ? es
              ? "Guardando…"
              : "Saving…"
            : status === "saved"
              ? es
                ? "Actualizado."
                : "Updated."
              : status === "error"
                ? es
                  ? "No se pudo guardar."
                  : "Could not save."
                : ""}
        </small>
      </header>

      <div className="media-five-slots">
        {slots.map((slot) => {
          const selected = selectedFor(slot.key);
          const explicit = Boolean(slotState[slot.key]);
          return (
            <article className="media-five-slot" key={slot.key}>
              <div className="media-five-preview">
                {selected ? (
                  <img src={selected.url} alt={selected.alt} />
                ) : (
                  <span>{slot.icon}</span>
                )}
                {!explicit && selected ? (
                  <small className="media-fallback-chip">
                    {es ? "Automático" : "Auto"}
                  </small>
                ) : null}
              </div>
              <div className="media-five-copy">
                <strong>
                  <span aria-hidden="true">{slot.icon}</span>{" "}
                  {es ? slot.es : slot.en}
                </strong>
                <small>{es ? slot.esHelp : slot.enHelp}</small>
              </div>
              <div className="media-five-picker">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={busy}
                    className={
                      slotState[slot.key] === item.id
                        ? "media-mini-tile selected"
                        : "media-mini-tile"
                    }
                    aria-label={
                      es
                        ? `Usar ${item.alt} para ${slot.es}`
                        : `Use ${item.alt} for ${slot.en}`
                    }
                    onClick={() => setPlacement(slot.key, item.id)}
                  >
                    <img src={item.url} alt="" />
                  </button>
                ))}
                {explicit ? (
                  <button
                    className="media-auto-button"
                    type="button"
                    disabled={busy}
                    onClick={() => clearPlacement(slot.key)}
                  >
                    {es ? "Auto" : "Auto"}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {accommodation ? (
        <section className="stay-header-media" aria-label={es ? "Fotos de la cabecera" : "Header photos"}>
          <span className="eyebrow">{es ? "AkiDuermo · cabecera" : "AkiDuermo · header"}</span>
          <h3>{es ? "Galería del alojamiento" : "Property header gallery"}</h3>
          <p>{es
            ? "Sube fotos aquí o elige imágenes de la biblioteca. Solo las fotos añadidas a esta galería aparecen en la cabecera pública (máximo 12)."
            : "Upload here or choose from the media bin. Only photos added to this gallery appear in the public header (up to 12)."}</p>
          <div className="media-library-grid">
            {headerIds.map((id) => {
              const photo = items.find((item) => item.id === id);
              return photo ? (
                <article className="media-library-item" key={id}>
                  <div className="media-library-thumb"><img src={photo.url} alt={photo.alt} /></div>
                  <div className="media-library-actions">
                    <button type="button" disabled={busy} onClick={() => updateHeader(id, false)}>
                      {es ? "Quitar de la cabecera" : "Remove from header"}
                    </button>
                  </div>
                </article>
              ) : null;
            })}
          </div>
          {!headerIds.length ? <p>{es ? "Aún no hay fotos públicas." : "No public header photos yet."}</p> : null}
          <form onSubmit={uploadMedia} className="media-upload-form" encType="multipart/form-data">
            <input type="hidden" name="destination" value="stay_header" />
            <label>{es ? "Subir fotos a la cabecera" : "Upload header photos"}
              <SafeMediaFileInput locale={locale} name="image" required multiple maxFiles={12} />
            </label>
            <button className="button" type="submit" disabled={busy || headerIds.length >= 12}>
              {busy ? (es ? "Subiendo…" : "Uploading…") : (es ? "Subir a la cabecera" : "Upload to header")}
            </button>
          </form>
          {items.some((item) => !headerIds.includes(item.id)) && headerIds.length < 12 ? (
            <div className="media-five-picker">
              {items.filter((item) => !headerIds.includes(item.id)).map((item) => (
                <button key={item.id} type="button" className="media-mini-tile" disabled={busy}
                  aria-label={es ? `Añadir ${item.alt} a la cabecera` : `Add ${item.alt} to header`}
                  onClick={() => updateHeader(item.id, true)}>
                  <img src={item.url} alt="" />
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="media-bin-heading">
        <div>
          <span className="eyebrow">
            {es ? "Biblioteca multimedia" : "Media bin"}
          </span>
          <h3>{es ? "Imágenes internas" : "Internal media"}</h3>
          <p>
            {es
              ? "Esta biblioteca es privada de gestión. Subir una imagen aquí no la publica automáticamente en la ficha."
              : "This is an internal management library. Uploading media here does not automatically publish it on the venue page."}
          </p>
        </div>
        <span>{items.length}</span>
      </div>

      {uploadError ? (
        <p role="alert" className="safe-media-status error">
          {uploadError}
        </p>
      ) : null}
      <details className="media-upload-drawer" open={!items.length}>
        <summary>
          ＋ {es ? "Añadir a la biblioteca" : "Add to media bin"}
        </summary>
        <form
          ref={uploadFormRef}
          onSubmit={uploadMedia}
          className="media-upload-form"
          encType="multipart/form-data"
        >
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="venueId" value={venueId} />
          <label>
            {es ? "Imágenes o PDF" : "Images or PDFs"}
            <SafeMediaFileInput
              locale={locale}
              name="image"
              required
              multiple
              maxFiles={20}
            />
          </label>
          <label>
            {es
              ? "Descripción común (opcional)"
              : "Shared description (optional)"}
            <input
              name="alt"
              minLength={3}
              maxLength={300}
              placeholder={
                es
                  ? "Déjalo vacío para usar los nombres de archivo"
                  : "Leave blank to use filenames"
              }
            />
          </label>
          <button className="button" type="submit" disabled={busy}>
            {busy
              ? uploadProgress
                ? es
                  ? `Subiendo ${uploadProgress.done}/${uploadProgress.total}…`
                  : `Uploading ${uploadProgress.done}/${uploadProgress.total}…`
                : es
                  ? "Subiendo…"
                  : "Uploading…"
              : es
                ? "Subir archivos"
                : "Upload files"}
          </button>
        </form>
      </details>

      {items.length ? (
        <div className="media-library-grid">
          {items.map((item, index) => (
            <article className="media-library-item" key={item.id}>
              <div className="media-library-thumb">
                <img src={item.url} alt={item.alt} />
                {index === 0 ? (
                  <span className="media-primary-chip">
                    {es ? "Principal" : "Primary"}
                  </span>
                ) : null}
              </div>
              <div className="media-library-copy">
                <strong>{item.alt}</strong>
                <small>
                  {Math.round(item.sizeBytes / 1024)} KB
                  {usedBy.get(item.id)?.length
                    ? " · " + usedBy.get(item.id)!.join(", ")
                    : ""}
                </small>
              </div>
              <div className="media-library-actions media-library-actions-simple">
                <button
                  type="button"
                  className="danger"
                  disabled={busy}
                  onClick={() => removeMedia(item.id)}
                >
                  {es ? "Eliminar" : "Delete"}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="event-media-empty">
          <span>▧</span>
          <strong>{es ? "Todavía no hay imágenes" : "No media yet"}</strong>
        </div>
      )}
    </section>
  );
}
