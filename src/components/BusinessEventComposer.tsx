"use client";

import { useMemo, useState } from "react";
import { createEvent } from "@/app/[locale]/business/actions";
import { GuardedActionForm } from "@/components/GuardedActionForm";

type VenueOption = { id: string; name: string };
type CategoryOption = { id: string; label: string };
export type BusinessMediaOption = {
  id: string;
  venueId: string;
  url: string;
  alt: string;
};

export function BusinessEventComposer({
  locale,
  venues,
  categories,
  media,
}: {
  locale: "es" | "en";
  venues: VenueOption[];
  categories: CategoryOption[];
  media: BusinessMediaOption[];
}) {
  const es = locale === "es";
  const [venueId, setVenueId] = useState(venues[0]?.id || "");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [priceMode, setPriceMode] = useState<"show" | "hide">("hide");
  const [price, setPrice] = useState("0");
  const [coverMediaId, setCoverMediaId] = useState("");
  const [galleryIds, setGalleryIds] = useState<string[]>([]);

  const venueMedia = useMemo(
    () => media.filter((item) => item.venueId === venueId),
    [media, venueId],
  );

  function selectVenue(next: string) {
    setVenueId(next);
    setCoverMediaId("");
    setGalleryIds([]);
  }

  function toggleGallery(id: string) {
    setGalleryIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id].slice(0, 8),
    );
  }

  return (
    <section className="event-studio">
      <header className="event-studio-hero">
        <div>
          <span className="eyebrow">{es ? "Nuevo evento" : "New event"}</span>
          <h2>{es ? "Crea la ficha visualmente" : "Build the event visually"}</h2>
          <p>
            {es
              ? "Elige las opciones como si estuvieras montando una ficha, no rellenando una declaración de la renta."
              : "Choose the options like you are building a listing, not filing a tax return."}
          </p>
        </div>
        <div className="event-studio-progress" aria-hidden="true">
          <span className="done">1</span>
          <i />
          <span>2</span>
          <i />
          <span>3</span>
        </div>
      </header>

      <GuardedActionForm action={createEvent} className="event-studio-form">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="venueId" value={venueId} />
        <input type="hidden" name="categoryId" value={categoryId} />
        <input type="hidden" name="priceDisplayMode" value={priceMode} />
        <input type="hidden" name="coverMediaId" value={coverMediaId} />
        {galleryIds.map((id) => (
          <input key={id} type="hidden" name="galleryMediaId" value={id} />
        ))}

        <section className="event-studio-card">
          <div className="event-studio-card-head">
            <span className="event-studio-step">1</span>
            <div>
              <h3>{es ? "Qué y dónde" : "What and where"}</h3>
              <p>{es ? "Local, categoría y nombre." : "Venue, category and name."}</p>
            </div>
          </div>

          <div className="event-choice-grid event-choice-grid-venues">
            {venues.map((venue) => (
              <button
                key={venue.id}
                type="button"
                className={venueId === venue.id ? "event-choice selected" : "event-choice"}
                aria-pressed={venueId === venue.id}
                onClick={() => selectVenue(venue.id)}
              >
                <span className="event-choice-icon">⌂</span>
                <strong>{venue.name}</strong>
                <small>{es ? "Publicar aquí" : "Publish here"}</small>
              </button>
            ))}
          </div>

          <div className="event-category-strip" role="radiogroup" aria-label={es ? "Categoría" : "Category"}>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                role="radio"
                aria-checked={categoryId === category.id}
                className={categoryId === category.id ? "event-category-pill selected" : "event-category-pill"}
                onClick={() => setCategoryId(category.id)}
              >
                {category.label}
              </button>
            ))}
          </div>

          <label className="event-studio-big-field">
            <span>{es ? "Nombre del evento" : "Event name"}</span>
            <input
              name="title"
              required
              minLength={3}
              maxLength={160}
              placeholder={es ? "Ej. Desayuno de los domingos" : "e.g. Sunday Breakfast"}
            />
          </label>
        </section>

        <section className="event-studio-card">
          <div className="event-studio-card-head">
            <span className="event-studio-step">2</span>
            <div>
              <h3>{es ? "Cómo se verá" : "How it looks"}</h3>
              <p>
                {es
                  ? "Reutiliza imágenes que ya has subido. Una foto, mil usos, porque duplicar archivos por diversión sería muy humano."
                  : "Reuse media you already uploaded. One image, many placements."}
              </p>
            </div>
          </div>

          {venueMedia.length ? (
            <>
              <div className="event-media-slot">
                <div>
                  <strong>{es ? "Portada del evento" : "Event cover"}</strong>
                  <small>{es ? "Se usa en Explorar y en la ficha." : "Used in Explore and on the event page."}</small>
                </div>
                <button
                  type="button"
                  className={!coverMediaId ? "event-media-none selected" : "event-media-none"}
                  onClick={() => setCoverMediaId("")}
                >
                  {es ? "Usar portada del local" : "Use venue cover"}
                </button>
              </div>
              <div className="event-media-picker">
                {venueMedia.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={coverMediaId === item.id ? "event-media-tile selected" : "event-media-tile"}
                    aria-pressed={coverMediaId === item.id}
                    onClick={() => setCoverMediaId(item.id)}
                  >
                    <img src={item.url} alt={item.alt} />
                    <span>{coverMediaId === item.id ? "✓" : ""}</span>
                  </button>
                ))}
              </div>

              <div className="event-media-slot">
                <div>
                  <strong>{es ? "Galería del evento" : "Event gallery"}</strong>
                  <small>{es ? "Elige hasta 8 imágenes." : "Choose up to 8 images."}</small>
                </div>
                <span className="event-media-count">{galleryIds.length}/8</span>
              </div>
              <div className="event-media-picker compact">
                {venueMedia.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={galleryIds.includes(item.id) ? "event-media-tile selected" : "event-media-tile"}
                    aria-pressed={galleryIds.includes(item.id)}
                    onClick={() => toggleGallery(item.id)}
                  >
                    <img src={item.url} alt={item.alt} />
                    <span>{galleryIds.includes(item.id) ? "✓" : ""}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="event-media-empty">
              <span>▧</span>
              <strong>{es ? "Aún no hay imágenes en este local" : "No media for this venue yet"}</strong>
              <p>
                {es
                  ? "Añádelas desde Gestionar local → Perfil → Biblioteca multimedia. Después podrás reutilizarlas aquí."
                  : "Add them in Manage venue → Profile → Media library, then reuse them here."}
              </p>
            </div>
          )}
        </section>

        <section className="event-studio-card">
          <div className="event-studio-card-head">
            <span className="event-studio-step">3</span>
            <div>
              <h3>{es ? "Detalles prácticos" : "Practical details"}</h3>
              <p>{es ? "Cuándo, precio y descripción." : "When, price and description."}</p>
            </div>
          </div>

          <label className="event-studio-big-field">
            <span>{es ? "Descripción" : "Description"}</span>
            <textarea name="description" required minLength={20} rows={4} />
          </label>

          <div className="event-price-mode">
            <button
              type="button"
              className={priceMode === "hide" ? "event-price-option selected" : "event-price-option"}
              onClick={() => setPriceMode("hide")}
            >
              <span>◌</span>
              <strong>{es ? "Sin precio de entrada" : "No entry price"}</strong>
              <small>
                {es
                  ? "No mostramos “Gratis”. Ideal para desayunos, mercados, bares, etc."
                  : "Do not show “Free”. Good for breakfasts, markets, bars, etc."}
              </small>
            </button>
            <button
              type="button"
              className={priceMode === "show" ? "event-price-option selected" : "event-price-option"}
              onClick={() => setPriceMode("show")}
            >
              <span>€</span>
              <strong>{es ? "Mostrar precio" : "Show a price"}</strong>
              <small>{es ? "0 € se mostrará como Gratis." : "€0 will display as Free."}</small>
            </button>
          </div>

          <div className="event-studio-grid">
            {priceMode === "show" ? (
              <label>
                {es ? "Precio de entrada (€)" : "Entry price (€)"}
                <input
                  name="priceEuros"
                  type="number"
                  min="0"
                  max="10000"
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  required
                />
              </label>
            ) : (
              <input type="hidden" name="priceEuros" value="0" />
            )}
            <label>
              {es ? "Enlace de reserva (opcional)" : "Booking link (optional)"}
              <input name="bookingUrl" type="url" placeholder="https://" />
            </label>
            <label>
              {es ? "Empieza" : "Starts"}
              <input name="startsAt" type="datetime-local" required />
            </label>
            <label>
              {es ? "Termina" : "Ends"}
              <input name="endsAt" type="datetime-local" required />
            </label>
          </div>
        </section>

        <div className="event-studio-save">
          <div>
            <strong>{es ? "Listo cuando tú lo estés" : "Ready when you are"}</strong>
            <span>
              {es
                ? "El botón se activará cuando estén completos los campos obligatorios."
                : "The button activates once required fields are complete."}
            </span>
          </div>
          <button className="button primary event-studio-submit" type="submit">
            {es ? "Crear evento" : "Create event"}
          </button>
        </div>
      </GuardedActionForm>
    </section>
  );
}
