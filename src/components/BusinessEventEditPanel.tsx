"use client";

import {
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { SafeMediaFileInput } from "@/components/SafeMediaFileInput";
import {
  addVenueMediaToEventBin,
  removeMediaFromEventBin,
  updateEvent,
  uploadEventImage,
} from "@/app/[locale]/business/venue/[id]/actions";

type MediaOption = { id: string; url: string; alt: string };

type EventSlotKey =
  | "banner"
  | "explore"
  | "profile"
  | "background"
  | "map";

const eventSlots: Array<{
  key: EventSlotKey;
  en: string;
  es: string;
  enHelp: string;
  esHelp: string;
}> = [
  {
    key: "banner",
    en: "1 · Event banner",
    es: "1 · Banner del evento",
    enHelp: "Wide hero image at the top of the event page.",
    esHelp: "Imagen panorámica en la cabecera de la ficha del evento.",
  },
  {
    key: "explore",
    en: "2 · Explore card",
    es: "2 · Tarjeta Explorar",
    enHelp: "Landscape image used on Discover cards.",
    esHelp: "Imagen horizontal usada en las tarjetas de Descubrir.",
  },
  {
    key: "profile",
    en: "3 · Event profile image",
    es: "3 · Imagen de perfil",
    enHelp: "Small event identity image beside its title and on cards.",
    esHelp: "Imagen pequeña de identidad junto al título y en tarjetas.",
  },
  {
    key: "background",
    en: "4 · Event page background",
    es: "4 · Fondo de la ficha",
    enHelp: "Blurred/full-page event background, independent of the banner.",
    esHelp: "Fondo de página independiente del banner del evento.",
  },
  {
    key: "map",
    en: "5 · Map vertical",
    es: "5 · Vertical para mapa",
    enHelp: "Portrait artwork used specifically in map/list cards.",
    esHelp: "Imagen vertical usada específicamente en tarjetas del mapa/lista.",
  },
];

export function BusinessEventEditPanel({
  locale,
  venueId,
  verifiedVenue = false,
  event,
  media,
  venueMediaIds = [],
  bannerMediaId = "",
  exploreMediaId = "",
  profileMediaId = "",
  backgroundMediaId = "",
  mapMediaId = "",
  eventBinMediaIds = [],
}: {
  locale: "es" | "en";
  venueId: string;
  verifiedVenue?: boolean;
  event: {
    id: string;
    title: string;
    description: string;
    priceCents: number;
    priceDisplayMode: "show" | "hide";
    bookingUrl: string;
    minimumAge: number | null;
    accessibilityNotes: string;
  };
  media: MediaOption[];
  venueMediaIds?: string[];
  bannerMediaId?: string;
  exploreMediaId?: string;
  profileMediaId?: string;
  backgroundMediaId?: string;
  mapMediaId?: string;
  eventBinMediaIds?: string[];
}) {
  const es = locale === "es";
  const [priceMode, setPriceMode] = useState<"show" | "hide">(
    event.priceDisplayMode,
  );
  const [slots, setSlots] = useState<Record<EventSlotKey, string>>({
    banner: bannerMediaId,
    explore: exploreMediaId,
    profile: profileMediaId,
    background: backgroundMediaId,
    map: mapMediaId,
  });
  const [allMedia, setAllMedia] = useState<MediaOption[]>(media);
  const [binIds, setBinIds] = useState<string[]>(eventBinMediaIds);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [mediaState, setMediaState] = useState<
    "idle" | "working" | "saved" | "error"
  >("idle");
  const uploadFormRef = useRef<HTMLFormElement>(null);

  const eventBin = useMemo(
    () => allMedia.filter((item) => binIds.includes(item.id)),
    [allMedia, binIds],
  );
  const venueLibrary = useMemo(
    () => allMedia.filter((item) => venueMediaIds.includes(item.id)),
    [allMedia, venueMediaIds],
  );
  const eventFallback = eventBin[0] || venueLibrary[0] || allMedia[0] || null;

  function selectedFor(key: EventSlotKey) {
    const explicit = slots[key]
      ? allMedia.find((item) => item.id === slots[key])
      : null;
    return explicit || eventFallback;
  }

  async function saveEvent(eventSubmit: FormEvent<HTMLFormElement>) {
    eventSubmit.preventDefault();
    const form = eventSubmit.currentTarget;
    if (!form.reportValidity()) return;
    setSaveState("saving");
    const formData = new FormData(form);
    formData.set("inline", "1");
    const result = await updateEvent(formData);
    if (result?.ok) {
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 2200);
    } else {
      setSaveState("error");
    }
  }

  async function uploadMedia(eventSubmit: FormEvent<HTMLFormElement>) {
    eventSubmit.preventDefault();
    const form = eventSubmit.currentTarget;
    if (!form.reportValidity()) return;
    setMediaState("working");
    const formData = new FormData(form);
    formData.set("inline", "1");
    formData.set("sortOrder", String(binIds.length));
    const result = await uploadEventImage(formData);
    if (result?.ok && result.media?.url) {
      setAllMedia((current) => [
        ...current.filter((item) => item.id !== result.media!.id),
        result.media!,
      ]);
      setBinIds((current) =>
        current.includes(result.media!.id)
          ? current
          : [...current, result.media!.id],
      );
      form.reset();
      setMediaState("saved");
      window.setTimeout(() => setMediaState("idle"), 1800);
      return;
    }
    setMediaState("error");
  }

  async function addToEvent(mediaId: string) {
    setMediaState("working");
    const formData = new FormData();
    formData.set("inline", "1");
    formData.set("locale", locale);
    formData.set("venueId", venueId);
    formData.set("eventId", event.id);
    formData.set("mediaId", mediaId);
    const result = await addVenueMediaToEventBin(formData);
    if (result?.ok) {
      setBinIds((current) =>
        current.includes(mediaId) ? current : [...current, mediaId],
      );
      setMediaState("saved");
      window.setTimeout(() => setMediaState("idle"), 1600);
    } else {
      setMediaState("error");
    }
  }

  async function removeFromEvent(mediaId: string) {
    setMediaState("working");
    const formData = new FormData();
    formData.set("inline", "1");
    formData.set("locale", locale);
    formData.set("venueId", venueId);
    formData.set("eventId", event.id);
    formData.set("mediaId", mediaId);
    const result = await removeMediaFromEventBin(formData);
    if (result?.ok) {
      setBinIds((current) => current.filter((id) => id !== mediaId));
      setSlots((current) => {
        const next = { ...current };
        (Object.keys(next) as EventSlotKey[]).forEach((key) => {
          if (next[key] === mediaId) next[key] = "";
        });
        return next;
      });
      setMediaState("saved");
      window.setTimeout(() => setMediaState("idle"), 1600);
    } else {
      setMediaState("error");
    }
  }

  return (
    <details className="event-edit-studio" open>
      <summary>
        <span>{es ? "Editar ficha y multimedia" : "Edit listing & media"}</span>
        <small className="event-editor-live-state">
          {verifiedVenue
            ? es
              ? "Local verificado · cambios directos"
              : "Verified venue · changes publish directly"
            : es
              ? "Los cambios pueden requerir revisión"
              : "Changes may require review"}
        </small>
      </summary>

      <form onSubmit={saveEvent} className="event-edit-studio-form">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="venueId" value={venueId} />
        <input type="hidden" name="eventId" value={event.id} />
        <input type="hidden" name="priceDisplayMode" value={priceMode} />
        <input type="hidden" name="bannerMediaId" value={slots.banner} />
        <input type="hidden" name="exploreMediaId" value={slots.explore} />
        <input type="hidden" name="profileMediaId" value={slots.profile} />
        <input type="hidden" name="backgroundMediaId" value={slots.background} />
        <input type="hidden" name="mapMediaId" value={slots.map} />

        <section className="event-edit-section">
          <header>
            <span>01</span>
            <div>
              <strong>{es ? "Lo esencial" : "Essentials"}</strong>
              <small>
                {es
                  ? "Nombre, descripción y reserva."
                  : "Name, description and booking."}
              </small>
            </div>
          </header>
          <label className="event-studio-big-field">
            {es ? "Título" : "Title"}
            <input name="title" defaultValue={event.title} required />
          </label>
          <label className="event-studio-big-field">
            {es ? "Descripción" : "Description"}
            <textarea
              name="description"
              defaultValue={event.description}
              required
              minLength={20}
              rows={4}
            />
          </label>
          <div className="event-studio-grid">
            <label>
              {es ? "Enlace de reserva" : "Booking link"}
              <input
                name="bookingUrl"
                type="url"
                defaultValue={event.bookingUrl}
              />
            </label>
            <label>
              {es ? "Edad mínima" : "Minimum age"}
              <input
                name="minimumAge"
                type="number"
                min="0"
                max="99"
                defaultValue={event.minimumAge ?? ""}
              />
            </label>
          </div>
        </section>

        <section className="event-edit-section">
          <header>
            <span>02</span>
            <div>
              <strong>{es ? "Precio de entrada" : "Entry price"}</strong>
              <small>
                {es
                  ? "Ocúltalo cuando no exista una entrada real."
                  : "Hide it when there is no actual entry fee."}
              </small>
            </div>
          </header>
          <div className="event-price-mode">
            <button
              type="button"
              className={
                priceMode === "hide"
                  ? "event-price-option selected"
                  : "event-price-option"
              }
              onClick={() => setPriceMode("hide")}
            >
              <span>◌</span>
              <strong>{es ? "No mostrar precio" : "Hide price"}</strong>
              <small>
                {es ? "No aparecerá “Gratis”." : "“Free” will not be shown."}
              </small>
            </button>
            <button
              type="button"
              className={
                priceMode === "show"
                  ? "event-price-option selected"
                  : "event-price-option"
              }
              onClick={() => setPriceMode("show")}
            >
              <span>€</span>
              <strong>{es ? "Mostrar precio" : "Show price"}</strong>
              <small>
                {es ? "0 € se verá como Gratis." : "€0 displays as Free."}
              </small>
            </button>
          </div>
          {priceMode === "show" ? (
            <label className="event-price-input">
              {es ? "Precio (€)" : "Price (€)"}
              <input
                name="priceEuros"
                type="number"
                min="0"
                max="10000"
                step="0.01"
                defaultValue={(event.priceCents / 100).toFixed(2)}
              />
            </label>
          ) : (
            <input
              type="hidden"
              name="priceEuros"
              value={event.priceCents / 100}
            />
          )}
        </section>

        <section className="event-edit-section event-five-slot-editor">
          <header>
            <span>03</span>
            <div>
              <strong>
                {es ? "Cinco superficies del evento" : "Five event surfaces"}
              </strong>
              <small>
                {es
                  ? "Cada imagen tiene un destino concreto. Las ranuras vacías usan automáticamente la primera imagen del bin."
                  : "Each image has one defined job. Empty slots automatically use the first image in the bin."}
              </small>
            </div>
          </header>

          <div className="event-five-slots">
            {eventSlots.map((slot) => {
              const selected = selectedFor(slot.key);
              const explicit = Boolean(slots[slot.key]);
              return (
                <article className="event-five-slot" data-media-slot={slot.key} key={slot.key}>
                  <div className="event-five-preview">
                    {selected ? (
                      <img src={selected.url} alt={selected.alt} />
                    ) : (
                      <span>＋</span>
                    )}
                    {!explicit && selected ? (
                      <small className="media-fallback-chip">
                        {es ? "Automático" : "Auto"}
                      </small>
                    ) : null}
                  </div>
                  <div>
                    <strong>{es ? slot.es : slot.en}</strong>
                    <small>{es ? slot.esHelp : slot.enHelp}</small>
                  </div>
                  <div className="media-five-picker">
                    {(eventBin.length ? eventBin : venueLibrary).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={
                          slots[slot.key] === item.id
                            ? "media-mini-tile selected"
                            : "media-mini-tile"
                        }
                        onClick={() => {
                          setSlots((current) => ({
                            ...current,
                            [slot.key]: item.id,
                          }));
                          setSaveState("idle");
                        }}
                      >
                        <img src={item.url} alt="" />
                      </button>
                    ))}
                    {explicit ? (
                      <button
                        type="button"
                        className="media-auto-button"
                        onClick={() => {
                          setSlots((current) => ({
                            ...current,
                            [slot.key]: "",
                          }));
                          setSaveState("idle");
                        }}
                      >
                        {es ? "Auto" : "Auto"}
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="event-edit-section">
          <header>
            <span>04</span>
            <div>
              <strong>{es ? "Accesibilidad" : "Accessibility"}</strong>
              <small>
                {es
                  ? "Solo si necesitas añadir algo específico."
                  : "Only if something specific needs explaining."}
              </small>
            </div>
          </header>
          <label>
            {es ? "Información de accesibilidad" : "Accessibility information"}
            <textarea
              name="accessibilityNotes"
              maxLength={1000}
              defaultValue={event.accessibilityNotes}
              rows={3}
            />
          </label>
        </section>

        <div className="event-edit-savebar">
          <span aria-live="polite">
            {saveState === "saving"
              ? es
                ? "Guardando…"
                : "Saving…"
              : saveState === "saved"
                ? verifiedVenue
                  ? es
                    ? "Guardado y publicado."
                    : "Saved and published."
                  : es
                    ? "Guardado."
                    : "Saved."
                : saveState === "error"
                  ? es
                    ? "No se pudo guardar. Revisa los campos."
                    : "Could not save. Check the fields."
                  : verifiedVenue
                    ? es
                      ? "Los cambios del local verificado se publican directamente."
                      : "Verified venue changes publish directly."
                    : es
                      ? "Los cambios pueden pasar por revisión."
                      : "Changes may go through review."}
          </span>
          <button
            className="button"
            type="submit"
            disabled={saveState === "saving"}
          >
            {saveState === "saving"
              ? es
                ? "Guardando…"
                : "Saving…"
              : es
                ? "Guardar cambios"
                : "Save changes"}
          </button>
        </div>
      </form>

      <section className="event-media-bin-editor">
        <div className="media-bin-heading">
          <div>
            <span className="eyebrow">
              {es ? "Bin multimedia del evento" : "Event media bin"}
            </span>
            <h3>
              {es ? "Imágenes para este evento" : "Media for this event"}
            </h3>
            <p>
              {es
                ? "Sube, añade y quita imágenes sin recargar la página. El editor permanece exactamente donde lo dejaste."
                : "Upload, add and remove images without reloading the page. The editor stays exactly where you left it."}
            </p>
          </div>
          <span>{eventBin.length}</span>
        </div>

        <form
          ref={uploadFormRef}
          onSubmit={uploadMedia}
          className="media-upload-form"
          encType="multipart/form-data"
        >
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="venueId" value={venueId} />
          <input type="hidden" name="eventId" value={event.id} />
          <label>
            {es ? "Subir imagen / PDF" : "Upload image / PDF"}
            <SafeMediaFileInput locale={locale} name="image" required />
          </label>
          <label>
            {es ? "Descripción" : "Description"}
            <input
              name="alt"
              required
              minLength={3}
              maxLength={300}
              placeholder={es ? "Ej. escenario principal" : "e.g. main stage"}
            />
          </label>
          <button
            className="button"
            type="submit"
            disabled={mediaState === "working"}
          >
            {mediaState === "working"
              ? es
                ? "Subiendo…"
                : "Uploading…"
              : es
                ? "Subir al evento"
                : "Upload to event"}
          </button>
        </form>

        <p className="event-media-live-status" aria-live="polite">
          {mediaState === "saved"
            ? es
              ? "Multimedia actualizada."
              : "Media updated."
            : mediaState === "error"
              ? es
                ? "No se pudo actualizar la multimedia."
                : "Could not update media."
              : ""}
        </p>

        {eventBin.length ? (
          <div className="media-library-grid event-bin-grid">
            {eventBin.map((item, index) => (
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
                </div>
                <div className="media-library-actions media-library-actions-simple">
                  <button
                    type="button"
                    disabled={mediaState === "working"}
                    onClick={() => removeFromEvent(item.id)}
                  >
                    {es ? "Quitar del evento" : "Remove from event"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="event-media-empty">
            <span>▧</span>
            <strong>
              {es
                ? "Este evento aún usa las imágenes del local"
                : "This event is still using venue media"}
            </strong>
          </div>
        )}

        {venueLibrary.filter((item) => !binIds.includes(item.id)).length ? (
          <details className="event-library-import">
            <summary>
              ＋{" "}
              {es
                ? "Traer desde la biblioteca del local"
                : "Add from venue library"}
            </summary>
            <div className="media-library-grid">
              {venueLibrary
                .filter((item) => !binIds.includes(item.id))
                .map((item) => (
                  <article className="media-library-item" key={item.id}>
                    <div className="media-library-thumb">
                      <img src={item.url} alt={item.alt} />
                    </div>
                    <div className="media-library-copy">
                      <strong>{item.alt}</strong>
                    </div>
                    <div className="media-library-actions media-library-actions-simple">
                      <button
                        type="button"
                        disabled={mediaState === "working"}
                        onClick={() => addToEvent(item.id)}
                      >
                        {es ? "Añadir al evento" : "Add to event"}
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          </details>
        ) : null}
      </section>
    </details>
  );
}
