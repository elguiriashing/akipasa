"use client";

import { useMemo, useState } from "react";
import { SafeMediaFileInput } from "@/components/SafeMediaFileInput";
import {
  addVenueMediaToEventBin,
  removeMediaFromEventBin,
  updateEvent,
  uploadEventImage,
} from "@/app/[locale]/business/venue/[id]/actions";

type MediaOption = { id: string; url: string; alt: string };

type EventSlotKey =
  | "cover"
  | "explore"
  | "gallery1"
  | "gallery2"
  | "gallery3";

const eventSlots: Array<{
  key: EventSlotKey;
  en: string;
  es: string;
  enHelp: string;
  esHelp: string;
}> = [
  {
    key: "cover",
    en: "Event cover",
    es: "Portada del evento",
    enHelp: "Large image on the event page.",
    esHelp: "Imagen grande de la ficha del evento.",
  },
  {
    key: "explore",
    en: "Explore card",
    es: "Tarjeta Explorar",
    enHelp: "Image shown in discovery and map cards.",
    esHelp: "Imagen que aparece en descubrimiento y tarjetas del mapa.",
  },
  {
    key: "gallery1",
    en: "Gallery 1",
    es: "Galería 1",
    enHelp: "First supporting event image.",
    esHelp: "Primera imagen de apoyo del evento.",
  },
  {
    key: "gallery2",
    en: "Gallery 2",
    es: "Galería 2",
    enHelp: "Second supporting event image.",
    esHelp: "Segunda imagen de apoyo del evento.",
  },
  {
    key: "gallery3",
    en: "Gallery 3",
    es: "Galería 3",
    enHelp: "Third supporting event image.",
    esHelp: "Tercera imagen de apoyo del evento.",
  },
];

export function BusinessEventEditPanel({
  locale,
  venueId,
  event,
  media,
  coverMediaId = "",
  exploreMediaId = "",
  galleryMediaIds = [],
  eventBinMediaIds = [],
}: {
  locale: "es" | "en";
  venueId: string;
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
  coverMediaId?: string;
  exploreMediaId?: string;
  galleryMediaIds?: string[];
  eventBinMediaIds?: string[];
}) {
  const es = locale === "es";
  const [priceMode, setPriceMode] = useState<"show" | "hide">(
    event.priceDisplayMode,
  );
  const [slots, setSlots] = useState<Record<EventSlotKey, string>>({
    cover: coverMediaId,
    explore: exploreMediaId,
    gallery1: galleryMediaIds[0] || "",
    gallery2: galleryMediaIds[1] || "",
    gallery3: galleryMediaIds[2] || "",
  });

  const eventBin = useMemo(
    () => media.filter((item) => eventBinMediaIds.includes(item.id)),
    [eventBinMediaIds, media],
  );
  const eventFallback = eventBin[0] || media[0] || null;

  function selectedFor(key: EventSlotKey) {
    const explicit = slots[key]
      ? media.find((item) => item.id === slots[key])
      : null;
    return explicit || eventFallback;
  }

  return (
    <details className="event-edit-studio">
      <summary>{es ? "Editar ficha y multimedia" : "Edit listing & media"}</summary>

      <form action={updateEvent} className="event-edit-studio-form">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="venueId" value={venueId} />
        <input type="hidden" name="eventId" value={event.id} />
        <input type="hidden" name="priceDisplayMode" value={priceMode} />
        <input type="hidden" name="coverMediaId" value={slots.cover} />
        <input type="hidden" name="exploreMediaId" value={slots.explore} />
        <input type="hidden" name="galleryMediaId1" value={slots.gallery1} />
        <input type="hidden" name="galleryMediaId2" value={slots.gallery2} />
        <input type="hidden" name="galleryMediaId3" value={slots.gallery3} />

        <section className="event-edit-section">
          <header>
            <span>01</span>
            <div>
              <strong>{es ? "Lo esencial" : "Essentials"}</strong>
              <small>
                {es ? "Nombre, descripción y reserva." : "Name, description and booking."}
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
              <input name="bookingUrl" type="url" defaultValue={event.bookingUrl} />
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
              <small>{es ? "No aparecerá “Gratis”." : "“Free” will not be shown."}</small>
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
              <small>{es ? "0 € se verá como Gratis." : "€0 displays as Free."}</small>
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
            <input type="hidden" name="priceEuros" value={event.priceCents / 100} />
          )}
        </section>

        <section className="event-edit-section event-five-slot-editor">
          <header>
            <span>03</span>
            <div>
              <strong>{es ? "Cinco imágenes del evento" : "Five event images"}</strong>
              <small>
                {es
                  ? "Cada zona puede tener una imagen distinta. Las vacías usan automáticamente la primera imagen del bin del evento."
                  : "Each surface can have a different image. Empty slots automatically use the first image in the event bin."}
              </small>
            </div>
          </header>

          <div className="event-five-slots">
            {eventSlots.map((slot) => {
              const selected = selectedFor(slot.key);
              const explicit = Boolean(slots[slot.key]);
              return (
                <article className="event-five-slot" key={slot.key}>
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
                    {(eventBin.length ? eventBin : media).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={
                          slots[slot.key] === item.id
                            ? "media-mini-tile selected"
                            : "media-mini-tile"
                        }
                        onClick={() =>
                          setSlots((current) => ({
                            ...current,
                            [slot.key]: item.id,
                          }))
                        }
                      >
                        <img src={item.url} alt="" />
                      </button>
                    ))}
                    {explicit ? (
                      <button
                        type="button"
                        className="media-auto-button"
                        onClick={() =>
                          setSlots((current) => ({
                            ...current,
                            [slot.key]: "",
                          }))
                        }
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
          <span>
            {es ? "Los cambios se enviarán a revisión." : "Changes will be sent for review."}
          </span>
          <button className="button" type="submit">
            {es ? "Guardar cambios" : "Save changes"}
          </button>
        </div>
      </form>

      <section className="event-media-bin-editor">
        <div className="media-bin-heading">
          <div>
            <span className="eyebrow">
              {es ? "Bin multimedia del evento" : "Event media bin"}
            </span>
            <h3>{es ? "Imágenes solo para este evento" : "Media for this event"}</h3>
            <p>
              {es
                ? "Sube imágenes específicas o trae imágenes de la biblioteca del local. No borra ni duplica la biblioteca general."
                : "Upload event-specific images or pull in media from the venue library. The main library stays intact."}
            </p>
          </div>
          <span>{eventBin.length}</span>
        </div>

        <form
          action={uploadEventImage}
          className="media-upload-form"
          encType="multipart/form-data"
        >
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="venueId" value={venueId} />
          <input type="hidden" name="eventId" value={event.id} />
          <input type="hidden" name="sortOrder" value={eventBin.length} />
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
          <button className="button" type="submit">
            {es ? "Subir al evento" : "Upload to event"}
          </button>
        </form>

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
                  <form action={removeMediaFromEventBin}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="venueId" value={venueId} />
                    <input type="hidden" name="eventId" value={event.id} />
                    <input type="hidden" name="mediaId" value={item.id} />
                    <button type="submit">
                      {es ? "Quitar del evento" : "Remove from event"}
                    </button>
                  </form>
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

        {media.filter((item) => !eventBinMediaIds.includes(item.id)).length ? (
          <details className="event-library-import">
            <summary>
              ＋ {es ? "Traer desde la biblioteca del local" : "Add from venue library"}
            </summary>
            <div className="media-library-grid">
              {media
                .filter((item) => !eventBinMediaIds.includes(item.id))
                .map((item) => (
                  <article className="media-library-item" key={item.id}>
                    <div className="media-library-thumb">
                      <img src={item.url} alt={item.alt} />
                    </div>
                    <div className="media-library-copy">
                      <strong>{item.alt}</strong>
                    </div>
                    <div className="media-library-actions media-library-actions-simple">
                      <form action={addVenueMediaToEventBin}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="venueId" value={venueId} />
                        <input type="hidden" name="eventId" value={event.id} />
                        <input type="hidden" name="mediaId" value={item.id} />
                        <button type="submit">
                          {es ? "Añadir al evento" : "Add to event"}
                        </button>
                      </form>
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
