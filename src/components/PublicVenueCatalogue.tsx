import {
  euAllergens,
  type VenueCatalogueDocument,
} from "@/lib/venue-catalogue";

function text(
  value: { es: string; en: string },
  locale: "es" | "en",
) {
  return value[locale] || value.es || value.en;
}

export function PublicVenueCatalogue({
  locale,
  document,
}: {
  locale: "es" | "en";
  document: VenueCatalogueDocument;
}) {
  const es = locale === "es";
  if (!document.sections.length) return null;

  return (
    <section
      className="venue-section public-venue-catalogue"
      data-layout={document.layout}
    >
      <header>
        <span className="eyebrow">
          {es ? "Carta y catálogo" : "Menu & catalogue"}
        </span>
        <h2>{text(document.title, locale)}</h2>
        {text(document.description, locale) && (
          <p>{text(document.description, locale)}</p>
        )}
      </header>

      {document.sections.map((section) => (
        <section className="public-catalogue-section" key={section.id}>
          <h3>{text(section.title, locale)}</h3>
          <div className="public-catalogue-items">
            {section.items.map((item) => {
              const allergenEntries = euAllergens.filter(([key]) => {
                const state = item.allergens?.states?.[key];
                return state === "contains" || state === "may_contain";
              });
              const price =
                item.priceMode === "on_request" || item.priceCents === null
                  ? es
                    ? "Consultar"
                    : "Ask"
                  : (item.priceMode === "from"
                      ? es
                        ? "Desde "
                        : "From "
                      : "") +
                    (item.priceCents / 100).toLocaleString(locale, {
                      style: "currency",
                      currency: "EUR",
                    });
              return (
                <article className="public-catalogue-item" key={item.id}>
                  <div className="public-catalogue-item-head">
                    <div>
                      <strong>{text(item.name, locale)}</strong>
                      {text(item.description, locale) && (
                        <p>{text(item.description, locale)}</p>
                      )}
                    </div>
                    <span>{price}</span>
                  </div>
                  {item.availability !== "available" && (
                    <small className="status-pill">
                      {
                        {
                          sold_out: es ? "Agotado" : "Sold out",
                          seasonal: es ? "Temporada" : "Seasonal",
                          on_request: es ? "Bajo petición" : "On request",
                          available: "",
                        }[item.availability]
                      }
                    </small>
                  )}
                  {allergenEntries.length > 0 && (
                    <div className="public-catalogue-allergens">
                      <span>
                        {es ? "Información de alérgenos:" : "Allergen information:"}
                      </span>
                      {allergenEntries.map(([key, icon, esLabel, enLabel]) => (
                        <span
                          key={key}
                          data-state={item.allergens.states[key]}
                          title={
                            item.allergens.states[key] === "contains"
                              ? es
                                ? "Contiene"
                                : "Contains"
                              : es
                                ? "Puede contener"
                                : "May contain"
                          }
                        >
                          <i aria-hidden="true">{icon}</i>
                          {es ? esLabel : enLabel}
                        </span>
                      ))}
                    </div>
                  )}
                  {(item.kind === "food" ||
                    item.kind === "drink" ||
                    item.containsFood) && (
                    <p className="catalogue-allergen-disclaimer">
                      {item.allergens.crossContact === "possible"
                        ? es
                          ? "Puede existir contaminación cruzada."
                          : "Cross-contact may occur."
                        : es
                          ? "Consulta con el local si tienes una alergia grave."
                          : "Ask the venue if you have a severe allergy."}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </section>
  );
}
