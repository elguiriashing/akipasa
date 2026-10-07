"use client";

import { useState } from "react";
import { updateEvent } from "@/app/[locale]/business/venue/[id]/actions";

type MediaOption = { id: string; url: string; alt: string };

export function BusinessEventEditPanel({
  locale,
  venueId,
  event,
  media,
  coverMediaId = "",
  galleryMediaIds = [],
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
  galleryMediaIds?: string[];
}) {
  const es = locale === "es";
  const [priceMode, setPriceMode] = useState<"show" | "hide">(
    event.priceDisplayMode,
  );
  const [cover, setCover] = useState(coverMediaId);
  const [gallery, setGallery] = useState(galleryMediaIds);

  function toggleGallery(id: string) {
    setGallery((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id].slice(0, 8),
    );
  }

  return (
    <details className="event-edit-studio">
      <summary>{es ? "Editar ficha" : "Edit listing"}</summary>
      <form action={updateEvent} className="event-edit-studio-form">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="venueId" value={venueId} />
        <input type="hidden" name="eventId" value={event.id} />
        <input type="hidden" name="priceDisplayMode" value={priceMode} />
        <input type="hidden" name="coverMediaId" value={cover} />
        {gallery.map((id) => (
          <input key={id} type="hidden" name="galleryMediaId" value={id} />
        ))}

        <section className="event-edit-section">
          <header>
            <span>01</span>
            <div>
              <strong>{es ? "Lo esencial" : "Essentials"}</strong>
              <small>{es ? "Nombre, descripción y reserva." : "Name, description and booking."}</small>
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
              className={priceMode === "hide" ? "event-price-option selected" : "event-price-option"}
              onClick={() => setPriceMode("hide")}
            >
              <span>◌</span>
              <strong>{es ? "No mostrar precio" : "Hide price"}</strong>
              <small>{es ? "No aparecerá “Gratis”." : "“Free” will not be shown."}</small>
            </button>
            <button
              type="button"
              className={priceMode === "show" ? "event-price-option selected" : "event-price-option"}
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

        <section className="event-edit-section">
          <header>
            <span>03</span>
            <div>
              <strong>{es ? "Imágenes" : "Images"}</strong>
              <small>{es ? "Portada y galería reutilizando tu biblioteca." : "Cover and gallery from your library."}</small>
            </div>
          </header>
          {media.length ? (
            <>
              <strong className="event-edit-subtitle">{es ? "Portada" : "Cover"}</strong>
              <div className="event-media-picker compact">
                <button
                  type="button"
                  className={!cover ? "event-media-tile event-media-clear selected" : "event-media-tile event-media-clear"}
                  onClick={() => setCover("")}
                >
                  <span>×</span>
                  <small>{es ? "Usar local" : "Use venue"}</small>
                </button>
                {media.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={cover === item.id ? "event-media-tile selected" : "event-media-tile"}
                    onClick={() => setCover(item.id)}
                  >
                    <img src={item.url} alt={item.alt} />
                    <span>{cover === item.id ? "✓" : ""}</span>
                  </button>
                ))}
              </div>

              <strong className="event-edit-subtitle">{es ? "Galería" : "Gallery"} · {gallery.length}/8</strong>
              <div className="event-media-picker compact">
                {media.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={gallery.includes(item.id) ? "event-media-tile selected" : "event-media-tile"}
                    onClick={() => toggleGallery(item.id)}
                  >
                    <img src={item.url} alt={item.alt} />
                    <span>{gallery.includes(item.id) ? "✓" : ""}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="event-media-empty">
              {es
                ? "Añade imágenes a la biblioteca del local y aparecerán aquí."
                : "Add images to the venue media library and they will appear here."}
            </p>
          )}
        </section>

        <section className="event-edit-section">
          <header>
            <span>04</span>
            <div>
              <strong>{es ? "Accesibilidad" : "Accessibility"}</strong>
              <small>{es ? "Solo si necesitas añadir algo específico." : "Only if something specific needs explaining."}</small>
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
          <span>{es ? "Los cambios se enviarán a revisión." : "Changes will be sent for review."}</span>
          <button className="button" type="submit">
            {es ? "Guardar cambios" : "Save changes"}
          </button>
        </div>
      </form>
    </details>
  );
}
