"use client";

import { SafeMediaFileInput } from "@/components/SafeMediaFileInput";
import {
  clearVenueMediaPlacement,
  removeVenueImage,
  setVenueMediaPlacement,
  uploadVenueImage,
} from "@/app/[locale]/business/venue/[id]/actions";

export type VenueMediaStudioItem = {
  id: string;
  url: string;
  alt: string;
  sizeBytes: number;
  isLogo: boolean;
  isCover: boolean;
};

export function VenueMediaStudio({
  locale,
  venueId,
  media,
}: {
  locale: "es" | "en";
  venueId: string;
  media: VenueMediaStudioItem[];
}) {
  const es = locale === "es";
  const logo = media.find((item) => item.isLogo);
  const cover = media.find((item) => item.isCover);

  return (
    <section className="media-studio">
      <header className="media-studio-header">
        <div>
          <span className="eyebrow">{es ? "Biblioteca multimedia" : "Media library"}</span>
          <h2>{es ? "Sube una vez. Úsalo donde quieras." : "Upload once. Use it everywhere."}</h2>
          <p>
            {es
              ? "Nada de recordar si la foto 0 era el logo y la 1 la portada. Aquí se ve exactamente dónde va cada imagen."
              : "No more remembering whether photo 0 was the logo and photo 1 the cover. Every placement is visual."}
          </p>
        </div>
      </header>

      <div className="media-placement-board">
        <article className="media-placement-card media-placement-logo">
          <div className="media-placement-preview square">
            {logo ? <img src={logo.url} alt={logo.alt} /> : <span>＋</span>}
          </div>
          <div>
            <strong>{es ? "Logo / avatar" : "Logo / avatar"}</strong>
            <small>{es ? "Explorar, cabecera y perfil." : "Explore, headers and profile."}</small>
          </div>
          {logo && (
            <form action={clearVenueMediaPlacement}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="venueId" value={venueId} />
              <input type="hidden" name="placement" value="venue_logo" />
              <button type="submit" className="text-button">
                {es ? "Quitar" : "Remove"}
              </button>
            </form>
          )}
        </article>

        <article className="media-placement-card media-placement-cover">
          <div className="media-placement-preview landscape">
            {cover ? <img src={cover.url} alt={cover.alt} /> : <span>＋</span>}
          </div>
          <div>
            <strong>{es ? "Portada del local" : "Venue cover"}</strong>
            <small>{es ? "Imagen grande de la ficha." : "Large image on the venue page."}</small>
          </div>
          {cover && (
            <form action={clearVenueMediaPlacement}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="venueId" value={venueId} />
              <input type="hidden" name="placement" value="venue_cover" />
              <button type="submit" className="text-button">
                {es ? "Quitar" : "Remove"}
              </button>
            </form>
          )}
        </article>

        <article className="media-placement-card media-placement-gallery">
          <div className="media-placement-stack">
            {media.slice(0, 3).map((item) => (
              <img key={item.id} src={item.url} alt="" />
            ))}
            {!media.length && <span>▧</span>}
          </div>
          <div>
            <strong>{es ? "Galería" : "Gallery"}</strong>
            <small>
              {es
                ? "Todas tus imágenes siguen disponibles para eventos y carta."
                : "All media stays available for events and menu items."}
            </small>
          </div>
        </article>
      </div>

      <details className="media-upload-drawer" open={!media.length}>
        <summary>＋ {es ? "Añadir a la biblioteca" : "Add to library"}</summary>
        <form
          action={uploadVenueImage}
          className="media-upload-form"
          encType="multipart/form-data"
        >
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="venueId" value={venueId} />
          <input type="hidden" name="sortOrder" value={media.length} />
          <label>
            {es ? "Imagen o PDF" : "Image or PDF"}
            <SafeMediaFileInput locale={locale} name="image" required />
          </label>
          <label>
            {es ? "Qué aparece en la imagen" : "What is in the image"}
            <input
              name="alt"
              required
              minLength={3}
              maxLength={300}
              placeholder={es ? "Ej. terraza principal" : "e.g. main terrace"}
            />
          </label>
          <button className="button" type="submit">
            {es ? "Subir" : "Upload"}
          </button>
        </form>
      </details>

      {media.length ? (
        <div className="media-library-grid">
          {media.map((item) => (
            <article className="media-library-item" key={item.id}>
              <div className="media-library-thumb">
                <img src={item.url} alt={item.alt} />
                {(item.isLogo || item.isCover) && (
                  <div className="media-library-badges">
                    {item.isLogo && <span>Logo</span>}
                    {item.isCover && <span>{es ? "Portada" : "Cover"}</span>}
                  </div>
                )}
              </div>
              <div className="media-library-copy">
                <strong>{item.alt}</strong>
                <small>{Math.round(item.sizeBytes / 1024)} KB</small>
              </div>
              <div className="media-library-actions">
                <form action={setVenueMediaPlacement}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="venueId" value={venueId} />
                  <input type="hidden" name="mediaId" value={item.id} />
                  <input type="hidden" name="placement" value="venue_logo" />
                  <button type="submit" aria-pressed={item.isLogo}>
                    {es ? "Logo" : "Logo"}
                  </button>
                </form>
                <form action={setVenueMediaPlacement}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="venueId" value={venueId} />
                  <input type="hidden" name="mediaId" value={item.id} />
                  <input type="hidden" name="placement" value="venue_cover" />
                  <button type="submit" aria-pressed={item.isCover}>
                    {es ? "Portada" : "Cover"}
                  </button>
                </form>
                <form action={removeVenueImage}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="venueId" value={venueId} />
                  <input type="hidden" name="mediaId" value={item.id} />
                  <button type="submit" className="danger">
                    {es ? "Eliminar" : "Delete"}
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <div className="media-placement-explainer">
        <strong>{es ? "Dónde puedes reutilizar estas imágenes" : "Where these images can be reused"}</strong>
        <div>
          <span>⌂ {es ? "Perfil" : "Profile"}</span>
          <span>▣ {es ? "Portada" : "Cover"}</span>
          <span>☰ {es ? "Carta" : "Menu"}</span>
          <span>◫ {es ? "Eventos" : "Events"}</span>
          <span>◎ {es ? "Explorar" : "Explore"}</span>
        </div>
      </div>
    </section>
  );
}
