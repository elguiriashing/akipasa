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
    en: "Profile",
    es: "Perfil",
    enHelp: "Logo/avatar beside the venue identity.",
    esHelp: "Logo/avatar junto a la identidad del local.",
  },
  {
    key: "venue_cover",
    icon: "▣",
    en: "Cover",
    es: "Portada",
    enHelp: "Large hero image on the venue page.",
    esHelp: "Imagen grande de la ficha del local.",
  },
  {
    key: "venue_menu",
    icon: "☰",
    en: "Menu",
    es: "Carta",
    enHelp: "Default visual for the menu/catalogue.",
    esHelp: "Imagen por defecto para carta/catálogo.",
  },
  {
    key: "venue_events",
    icon: "◫",
    en: "Events",
    es: "Eventos",
    enHelp: "Fallback visual for venue events.",
    esHelp: "Imagen de respaldo para eventos del local.",
  },
  {
    key: "venue_explore",
    icon: "◎",
    en: "Explore",
    es: "Explorar",
    enHelp: "Default image used in discovery cards.",
    esHelp: "Imagen por defecto en tarjetas de descubrimiento.",
  },
];

export function VenueMediaStudio({
  locale,
  venueId,
  media,
  placements,
}: {
  locale: "es" | "en";
  venueId: string;
  media: VenueMediaStudioItem[];
  placements: Partial<Record<VenueMediaPlacement, string>>;
}) {
  const es = locale === "es";
  const fallback = media[0] || null;

  function selectedFor(slot: VenueMediaPlacement) {
    const explicit = placements[slot]
      ? media.find((item) => item.id === placements[slot])
      : null;
    return explicit || fallback;
  }

  return (
    <section className="media-studio media-studio-five">
      <header className="media-studio-header">
        <div>
          <span className="eyebrow">
            {es ? "Imágenes del local" : "Venue images"}
          </span>
          <h2>
            {es
              ? "Cinco sitios. Cinco fotos. Cero numeritos absurdos."
              : "Five places. Five images. Zero mystery photo numbers."}
          </h2>
          <p>
            {es
              ? "Elige qué imagen representa cada zona. Si dejas una vacía, AkiPasa usa automáticamente la primera imagen de tu biblioteca."
              : "Choose the image for each surface. If a slot is empty, AkiPasa automatically uses the first image in your library."}
          </p>
        </div>
      </header>

      <div className="media-five-slots">
        {slots.map((slot) => {
          const selected = selectedFor(slot.key);
          const explicit = Boolean(placements[slot.key]);
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
                {media.map((item) => (
                  <form action={setVenueMediaPlacement} key={item.id}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="venueId" value={venueId} />
                    <input type="hidden" name="mediaId" value={item.id} />
                    <input type="hidden" name="placement" value={slot.key} />
                    <button
                      type="submit"
                      className={
                        placements[slot.key] === item.id
                          ? "media-mini-tile selected"
                          : "media-mini-tile"
                      }
                      aria-label={
                        es
                          ? `Usar ${item.alt} para ${slot.es}`
                          : `Use ${item.alt} for ${slot.en}`
                      }
                    >
                      <img src={item.url} alt="" />
                    </button>
                  </form>
                ))}
                {explicit ? (
                  <form action={clearVenueMediaPlacement}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="venueId" value={venueId} />
                    <input type="hidden" name="placement" value={slot.key} />
                    <button className="media-auto-button" type="submit">
                      {es ? "Automático" : "Auto"}
                    </button>
                  </form>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <div className="media-bin-heading">
        <div>
          <span className="eyebrow">
            {es ? "Biblioteca multimedia" : "Media bin"}
          </span>
          <h3>{es ? "Todas tus imágenes" : "All your media"}</h3>
          <p>
            {es
              ? "Sube imágenes aquí y luego colócalas arriba, en eventos o en elementos de la carta."
              : "Upload media here, then place it above, in events, or on menu items."}
          </p>
        </div>
        <span>{media.length}</span>
      </div>

      <details className="media-upload-drawer" open={!media.length}>
        <summary>＋ {es ? "Añadir a la biblioteca" : "Add to media bin"}</summary>
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
          {media.map((item, index) => {
            const usedBy = slots.filter(
              (slot) => placements[slot.key] === item.id,
            );
            return (
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
                    {usedBy.length
                      ? " · " +
                        usedBy
                          .map((slot) => (es ? slot.es : slot.en))
                          .join(", ")
                      : ""}
                  </small>
                </div>
                <div className="media-library-actions media-library-actions-simple">
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
            );
          })}
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
