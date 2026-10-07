"use client";

import { useMemo, useState } from "react";
import {
  euAllergens,
  type CatalogueItem,
  type VenueCatalogueDocument,
} from "@/lib/venue-catalogue";

function text(
  value: { es: string; en: string },
  locale: "es" | "en",
) {
  return value[locale] || value.es || value.en;
}

function itemPrice(item: CatalogueItem, locale: "es" | "en") {
  const es = locale === "es";
  if (item.priceMode === "on_request" || item.priceCents === null) {
    return es ? "Consultar" : "Ask";
  }
  return (
    (item.priceMode === "from" ? (es ? "Desde " : "From ") : "") +
    (item.priceCents / 100).toLocaleString(locale, {
      style: "currency",
      currency: "EUR",
    })
  );
}

export function PublicVenueCatalogue({
  locale,
  document,
}: {
  locale: "es" | "en";
  document: VenueCatalogueDocument;
}) {
  const es = locale === "es";
  const sections = useMemo(
    () =>
      document.sections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => item.visible !== false),
        }))
        .filter((section) => section.items.length > 0),
    [document.sections],
  );
  const [activeSectionId, setActiveSectionId] = useState(
    sections[0]?.id || "",
  );
  const activeSection =
    sections.find((section) => section.id === activeSectionId) ||
    sections[0] ||
    null;

  if (!activeSection) return null;

  return (
    <section
      className="venue-section public-venue-catalogue"
      data-layout={document.layout}
    >
      <header className="public-catalogue-heading">
        <span className="eyebrow">
          {es ? "Carta y catálogo" : "Menu & catalogue"}
        </span>
        <h2>{text(document.title, locale)}</h2>
        {text(document.description, locale) && (
          <p>{text(document.description, locale)}</p>
        )}
      </header>

      <div className="public-catalogue-app">
        <nav
          className="public-catalogue-tabs"
          aria-label={es ? "Secciones de la carta" : "Menu sections"}
        >
          {sections.map((section) => (
            <button
              type="button"
              className="public-catalogue-tab"
              aria-selected={section.id === activeSection.id}
              key={section.id}
              onClick={() => setActiveSectionId(section.id)}
            >
              <span>{text(section.title, locale)}</span>
              <small>{section.items.length}</small>
            </button>
          ))}
        </nav>

        <section className="public-catalogue-section">
          <header className="public-catalogue-section-head">
            <div>
              <h3>{text(activeSection.title, locale)}</h3>
              <span>
                {activeSection.items.length}{" "}
                {activeSection.items.length === 1
                  ? es
                    ? "opción"
                    : "item"
                  : es
                    ? "opciones"
                    : "items"}
              </span>
            </div>
          </header>

          <div className="public-catalogue-items">
            {activeSection.items.map((item) => {
              const allergenEntries = euAllergens.filter(([key]) => {
                const state = item.allergens?.states?.[key];
                return state === "contains" || state === "may_contain";
              });
              const foodSafety =
                item.kind === "food" ||
                item.kind === "drink" ||
                item.containsFood;
              const hasDetails = allergenEntries.length > 0 || foodSafety;

              return (
                <article className="public-catalogue-item" key={item.id}>
                  <div className="public-catalogue-item-head">
                    <div>
                      <strong>{text(item.name, locale)}</strong>
                      {text(item.description, locale) && (
                        <p>{text(item.description, locale)}</p>
                      )}
                    </div>
                    <span className="public-catalogue-price">
                      {itemPrice(item, locale)}
                    </span>
                  </div>

                  {item.availability !== "available" && (
                    <small className="status-pill public-catalogue-availability">
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

                  {hasDetails && (
                    <details className="public-catalogue-item-details">
                      <summary>
                        {allergenEntries.length > 0
                          ? es
                            ? "Alérgenos e información"
                            : "Allergens & info"
                          : es
                            ? "Información"
                            : "Info"}
                        <span aria-hidden="true">+</span>
                      </summary>

                      {allergenEntries.length > 0 && (
                        <div className="public-catalogue-allergens">
                          {allergenEntries.map(
                            ([key, icon, esLabel, enLabel]) => (
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
                            ),
                          )}
                        </div>
                      )}

                      {foodSafety && (
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
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}
