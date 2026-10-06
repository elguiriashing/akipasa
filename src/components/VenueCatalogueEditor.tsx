"use client";

import { useMemo, useState } from "react";
import {
  blankCatalogueItem,
  euAllergens,
  type AllergenKey,
  type AllergenState,
  type CatalogueItem,
  type CatalogueItemKind,
  type CatalogueLayout,
  type VenueCatalogueDocument,
} from "@/lib/venue-catalogue";
import {
  saveVenueCatalogue,
  unpublishVenueCatalogue,
} from "@/app/[locale]/business/venue/[id]/actions";

const layouts: Array<[CatalogueLayout, string, string]> = [
  ["menu", "Carta / menú", "Menu"],
  ["cards", "Productos", "Products"],
  ["services", "Servicios", "Services"],
  ["rentals", "Alquileres", "Rentals"],
  ["experiences", "Experiencias", "Experiences"],
];

const kinds: Array<[CatalogueItemKind, string, string]> = [
  ["food", "Comida", "Food"],
  ["drink", "Bebida", "Drink"],
  ["product", "Producto", "Product"],
  ["service", "Servicio", "Service"],
  ["rental", "Alquiler", "Rental"],
  ["experience", "Experiencia", "Experience"],
  ["ticket", "Entrada", "Ticket"],
  ["package", "Paquete", "Package"],
];

const stateOrder: AllergenState[] = [
  "unknown",
  "contains",
  "may_contain",
  "not_in_recipe",
];

function stateLabel(state: AllergenState, es: boolean) {
  return {
    unknown: es ? "Sin revisar" : "Not reviewed",
    contains: es ? "Contiene" : "Contains",
    may_contain: es ? "Puede contener" : "May contain",
    not_in_recipe: es ? "No en receta" : "Not in recipe",
  }[state];
}

function localText(
  value: { es: string; en: string },
  locale: "es" | "en",
) {
  return value[locale] || value.es || value.en;
}

export function VenueCatalogueEditor({
  locale,
  venueId,
  revision,
  publishedRevision,
  initialDocument,
}: {
  locale: "es" | "en";
  venueId: string;
  revision: number;
  publishedRevision: number | null;
  initialDocument: VenueCatalogueDocument;
}) {
  const es = locale === "es";
  const [document, setDocument] = useState(initialDocument);
  const itemCount = useMemo(
    () => document.sections.reduce((sum, section) => sum + section.items.length, 0),
    [document.sections],
  );

  function setLocalized(
    value: { es: string; en: string },
    next: string,
  ) {
    return { ...value, [locale]: next };
  }

  function updateItem(sectionId: string, itemId: string, next: CatalogueItem) {
    setDocument((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item) =>
                item.id === itemId ? next : item,
              ),
            }
          : section,
      ),
    }));
  }

  function addSection() {
    setDocument((current) => ({
      ...current,
      sections: [
        ...current.sections,
        {
          id: crypto.randomUUID(),
          title: { es: es ? "Nueva sección" : "", en: es ? "" : "New section" },
          items: [],
        },
      ],
    }));
  }

  function addItem(sectionId: string) {
    setDocument((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? { ...section, items: [...section.items, blankCatalogueItem()] }
          : section,
      ),
    }));
  }

  function moveSection(sectionId: string, delta: number) {
    setDocument((current) => {
      const sections = [...current.sections];
      const from = sections.findIndex((section) => section.id === sectionId);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= sections.length) return current;
      [sections[from], sections[to]] = [sections[to], sections[from]];
      return { ...current, sections };
    });
  }

  function moveItem(sectionId: string, itemId: string, delta: number) {
    setDocument((current) => ({
      ...current,
      sections: current.sections.map((section) => {
        if (section.id !== sectionId) return section;
        const items = [...section.items];
        const from = items.findIndex((item) => item.id === itemId);
        const to = from + delta;
        if (from < 0 || to < 0 || to >= items.length) return section;
        [items[from], items[to]] = [items[to], items[from]];
        return { ...section, items };
      }),
    }));
  }

  function cycleAllergen(
    sectionId: string,
    item: CatalogueItem,
    key: AllergenKey,
  ) {
    const current = item.allergens.states[key];
    const next =
      stateOrder[(stateOrder.indexOf(current) + 1) % stateOrder.length];
    updateItem(sectionId, item.id, {
      ...item,
      allergens: {
        ...item.allergens,
        states: { ...item.allergens.states, [key]: next },
        reviewConfirmed: false,
      },
    });
  }

  return (
    <div className="venue-catalogue-editor">
      <header className="catalogue-editor-intro">
        <div>
          <span className="eyebrow">
            {es ? "Lo que vendes" : "What you offer"}
          </span>
          <h2>{es ? "Carta, productos y servicios" : "Menu, products & services"}</h2>
          <p>
            {es
              ? "Elige una presentación y organiza comida, bebidas, productos, alquileres o experiencias por secciones."
              : "Choose a layout and organise food, drinks, products, rentals or experiences into sections."}
          </p>
        </div>
        <span className="status-pill">
          {publishedRevision
            ? es
              ? "Publicado"
              : "Published"
            : es
              ? "Borrador"
              : "Draft"}
        </span>
      </header>

      <div className="catalogue-editor-settings">
        <label>
          {es ? "Diseño" : "Layout"}
          <select
            value={document.layout}
            onChange={(event) =>
              setDocument((current) => ({
                ...current,
                layout: event.target.value as CatalogueLayout,
              }))
            }
          >
            {layouts.map(([value, esLabel, enLabel]) => (
              <option key={value} value={value}>
                {es ? esLabel : enLabel}
              </option>
            ))}
          </select>
        </label>
        <label>
          {es ? "Título público" : "Public title"}
          <input
            value={localText(document.title, locale)}
            onChange={(event) =>
              setDocument((current) => ({
                ...current,
                title: setLocalized(current.title, event.target.value),
              }))
            }
            maxLength={160}
          />
        </label>
        <label className="catalogue-editor-description">
          {es ? "Descripción" : "Description"}
          <textarea
            value={localText(document.description, locale)}
            onChange={(event) =>
              setDocument((current) => ({
                ...current,
                description: setLocalized(current.description, event.target.value),
              }))
            }
            maxLength={1200}
          />
        </label>
      </div>

      <div className="catalogue-editor-sections">
        {document.sections.map((section, sectionIndex) => (
          <section className="catalogue-editor-section" key={section.id}>
            <header>
              <input
                aria-label={es ? "Nombre de sección" : "Section name"}
                value={localText(section.title, locale)}
                onChange={(event) =>
                  setDocument((current) => ({
                    ...current,
                    sections: current.sections.map((candidate) =>
                      candidate.id === section.id
                        ? {
                            ...candidate,
                            title: setLocalized(
                              candidate.title,
                              event.target.value,
                            ),
                          }
                        : candidate,
                    ),
                  }))
                }
                placeholder={es ? "Ej. Hamburguesas" : "e.g. Burgers"}
              />
              <div className="catalogue-order-actions">
                <button
                  type="button"
                  className="text-button"
                  onClick={() => moveSection(section.id, -1)}
                  disabled={sectionIndex === 0}
                  aria-label={es ? "Subir sección" : "Move section up"}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => moveSection(section.id, 1)}
                  disabled={sectionIndex === document.sections.length - 1}
                  aria-label={es ? "Bajar sección" : "Move section down"}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    setDocument((current) => ({
                      ...current,
                      sections: current.sections.filter(
                        (candidate) => candidate.id !== section.id,
                      ),
                    }))
                  }
                >
                  {es ? "Eliminar sección" : "Remove section"}
                </button>
              </div>
            </header>

            <div className="catalogue-editor-items">
              {section.items.map((item) => {
                const foodLike = item.kind === "food" || item.kind === "drink" || item.containsFood;
                return (
                  <article className="catalogue-editor-item" key={item.id}>
                    <div className="catalogue-item-main">
                      <label>
                        {es ? "Tipo" : "Type"}
                        <select
                          value={item.kind}
                          onChange={(event) => {
                            const kind = event.target.value as CatalogueItemKind;
                            updateItem(section.id, item.id, {
                              ...item,
                              kind,
                              containsFood:
                                kind === "food" || kind === "drink"
                                  ? true
                                  : item.containsFood,
                            });
                          }}
                        >
                          {kinds.map(([value, esLabel, enLabel]) => (
                            <option key={value} value={value}>
                              {es ? esLabel : enLabel}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="catalogue-item-name">
                        {es ? "Nombre" : "Name"}
                        <input
                          value={localText(item.name, locale)}
                          onChange={(event) =>
                            updateItem(section.id, item.id, {
                              ...item,
                              name: setLocalized(item.name, event.target.value),
                            })
                          }
                          placeholder="Wonder Burger"
                        />
                      </label>
                      <label>
                        {es ? "Precio €" : "Price €"}
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={item.priceMode === "on_request"}
                          value={
                            item.priceCents === null
                              ? ""
                              : (item.priceCents / 100).toFixed(2)
                          }
                          onChange={(event) =>
                            updateItem(section.id, item.id, {
                              ...item,
                              priceCents: event.target.value
                                ? Math.round(Number(event.target.value) * 100)
                                : null,
                            })
                          }
                        />
                      </label>
                      <label>
                        {es ? "Precio" : "Pricing"}
                        <select
                          value={item.priceMode}
                          onChange={(event) =>
                            updateItem(section.id, item.id, {
                              ...item,
                              priceMode: event.target.value as CatalogueItem["priceMode"],
                              priceCents:
                                event.target.value === "on_request"
                                  ? null
                                  : item.priceCents ?? 0,
                            })
                          }
                        >
                          <option value="fixed">{es ? "Fijo" : "Fixed"}</option>
                          <option value="from">{es ? "Desde" : "From"}</option>
                          <option value="on_request">
                            {es ? "Consultar" : "On request"}
                          </option>
                        </select>
                      </label>
                      <label>
                        {es ? "Disponibilidad" : "Availability"}
                        <select
                          value={item.availability}
                          onChange={(event) =>
                            updateItem(section.id, item.id, {
                              ...item,
                              availability: event.target.value as CatalogueItem["availability"],
                            })
                          }
                        >
                          <option value="available">{es ? "Disponible" : "Available"}</option>
                          <option value="sold_out">{es ? "Agotado" : "Sold out"}</option>
                          <option value="seasonal">{es ? "Temporada" : "Seasonal"}</option>
                          <option value="on_request">{es ? "Bajo petición" : "On request"}</option>
                        </select>
                      </label>
                      <label>
                        {es ? "Unidad" : "Unit"}
                        <select
                          value={item.unit}
                          onChange={(event) =>
                            updateItem(section.id, item.id, {
                              ...item,
                              unit: event.target.value as CatalogueItem["unit"],
                            })
                          }
                        >
                          <option value="each">{es ? "Unidad" : "Each"}</option>
                          <option value="person">{es ? "Persona" : "Person"}</option>
                          <option value="session">{es ? "Sesión" : "Session"}</option>
                          <option value="hour">{es ? "Hora" : "Hour"}</option>
                          <option value="day">{es ? "Día" : "Day"}</option>
                          <option value="night">{es ? "Noche" : "Night"}</option>
                          <option value="month">{es ? "Mes" : "Month"}</option>
                          <option value="kg">kg</option>
                        </select>
                      </label>
                    </div>
                    <label>
                      {es ? "Descripción" : "Description"}
                      <textarea
                        value={localText(item.description, locale)}
                        onChange={(event) =>
                          updateItem(section.id, item.id, {
                            ...item,
                            description: setLocalized(
                              item.description,
                              event.target.value,
                            ),
                          })
                        }
                        maxLength={1200}
                      />
                    </label>
                    <div className="catalogue-item-controls">
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => moveItem(section.id, item.id, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => moveItem(section.id, item.id, 1)}
                      >
                        ↓
                      </button>
                      <label className="check-row">
                        <input
                          type="checkbox"
                          checked={item.visible}
                          onChange={(event) =>
                            updateItem(section.id, item.id, {
                              ...item,
                              visible: event.target.checked,
                            })
                          }
                        />
                        {es ? "Visible al público" : "Visible publicly"}
                      </label>
                      {!["food", "drink"].includes(item.kind) && (
                        <label className="check-row">
                          <input
                            type="checkbox"
                            checked={item.containsFood}
                            onChange={(event) =>
                              updateItem(section.id, item.id, {
                                ...item,
                                containsFood: event.target.checked,
                              })
                            }
                          />
                          {es
                            ? "Incluye comida/bebida"
                            : "Contains food/drink"}
                        </label>
                      )}
                      <button
                        type="button"
                        className="text-button"
                        onClick={() =>
                          setDocument((current) => ({
                            ...current,
                            sections: current.sections.map((candidate) =>
                              candidate.id === section.id
                                ? {
                                    ...candidate,
                                    items: candidate.items.filter(
                                      (candidateItem) =>
                                        candidateItem.id !== item.id,
                                    ),
                                  }
                                : candidate,
                            ),
                          }))
                        }
                      >
                        {es ? "Eliminar" : "Remove"}
                      </button>
                    </div>

                    {foodLike && (
                      <details className="catalogue-allergens" open>
                        <summary>
                          <strong>
                            {es
                              ? "Alérgenos UE · revisar antes de publicar"
                              : "EU allergens · review before publishing"}
                          </strong>
                        </summary>
                        <p className="fine-print">
                          {es
                            ? "Pulsa cada alérgeno para cambiar entre: sin revisar, contiene, puede contener y no está en la receta. «No está en la receta» no garantiza ausencia de contaminación cruzada."
                            : "Tap each allergen to cycle: not reviewed, contains, may contain, and not in recipe. “Not in recipe” does not guarantee absence of cross-contact."}
                        </p>
                        <div className="allergen-toggle-grid">
                          {euAllergens.map(([key, icon, esLabel, enLabel]) => {
                            const state = item.allergens.states[key];
                            return (
                              <button
                                key={key}
                                type="button"
                                className="allergen-toggle"
                                data-state={state}
                                onClick={() =>
                                  cycleAllergen(section.id, item, key)
                                }
                              >
                                <span aria-hidden="true">{icon}</span>
                                <strong>{es ? esLabel : enLabel}</strong>
                                <small>{stateLabel(state, es)}</small>
                              </button>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() =>
                            updateItem(section.id, item.id, {
                              ...item,
                              allergens: {
                                ...item.allergens,
                                states: Object.fromEntries(
                                  euAllergens.map(([key]) => [
                                    key,
                                    item.allergens.states[key] === "unknown"
                                      ? "not_in_recipe"
                                      : item.allergens.states[key],
                                  ]),
                                ) as CatalogueItem["allergens"]["states"],
                                reviewConfirmed: false,
                              },
                            })
                          }
                        >
                          {es
                            ? "Marcar los no revisados como «No en receta»"
                            : "Mark unreviewed as “Not in recipe”"}
                        </button>
                        {["contains", "may_contain"].includes(
                          item.allergens.states.gluten,
                        ) && (
                          <fieldset className="allergen-detail-options">
                            <legend>{es ? "Cereales con gluten" : "Gluten cereals"}</legend>
                            {[
                              ["wheat", "Trigo", "Wheat"],
                              ["rye", "Centeno", "Rye"],
                              ["barley", "Cebada", "Barley"],
                              ["oats", "Avena", "Oats"],
                              ["spelt", "Espelta", "Spelt"],
                              ["khorasan", "Khorasan", "Khorasan"],
                            ].map(([key, esLabel, enLabel]) => (
                              <label className="check-row" key={key}>
                                <input
                                  type="checkbox"
                                  checked={item.allergens.cereals.includes(key)}
                                  onChange={(event) =>
                                    updateItem(section.id, item.id, {
                                      ...item,
                                      allergens: {
                                        ...item.allergens,
                                        cereals: event.target.checked
                                          ? [...item.allergens.cereals, key]
                                          : item.allergens.cereals.filter(
                                              (value) => value !== key,
                                            ),
                                        reviewConfirmed: false,
                                      },
                                    })
                                  }
                                />
                                {es ? esLabel : enLabel}
                              </label>
                            ))}
                          </fieldset>
                        )}
                        {["contains", "may_contain"].includes(
                          item.allergens.states.nuts,
                        ) && (
                          <fieldset className="allergen-detail-options">
                            <legend>{es ? "Frutos de cáscara" : "Tree nuts"}</legend>
                            {[
                              ["almond", "Almendra", "Almond"],
                              ["hazelnut", "Avellana", "Hazelnut"],
                              ["walnut", "Nuez", "Walnut"],
                              ["cashew", "Anacardo", "Cashew"],
                              ["pecan", "Pecana", "Pecan"],
                              ["brazil", "Nuez de Brasil", "Brazil nut"],
                              ["pistachio", "Pistacho", "Pistachio"],
                              ["macadamia", "Macadamia", "Macadamia"],
                            ].map(([key, esLabel, enLabel]) => (
                              <label className="check-row" key={key}>
                                <input
                                  type="checkbox"
                                  checked={item.allergens.nuts.includes(key)}
                                  onChange={(event) =>
                                    updateItem(section.id, item.id, {
                                      ...item,
                                      allergens: {
                                        ...item.allergens,
                                        nuts: event.target.checked
                                          ? [...item.allergens.nuts, key]
                                          : item.allergens.nuts.filter(
                                              (value) => value !== key,
                                            ),
                                        reviewConfirmed: false,
                                      },
                                    })
                                  }
                                />
                                {es ? esLabel : enLabel}
                              </label>
                            ))}
                          </fieldset>
                        )}
                        <label>
                          {es ? "Contaminación cruzada" : "Cross-contact"}
                          <select
                            value={item.allergens.crossContact}
                            onChange={(event) =>
                              updateItem(section.id, item.id, {
                                ...item,
                                allergens: {
                                  ...item.allergens,
                                  crossContact: event.target.value as CatalogueItem["allergens"]["crossContact"],
                                  reviewConfirmed: false,
                                },
                              })
                            }
                          >
                            <option value="unknown">
                              {es ? "No evaluada" : "Not assessed"}
                            </option>
                            <option value="possible">
                              {es ? "Posible" : "Possible"}
                            </option>
                            <option value="assessed">
                              {es ? "Evaluada" : "Assessed"}
                            </option>
                          </select>
                        </label>
                        <label className="check-row">
                          <input
                            type="checkbox"
                            checked={Boolean(item.allergens.reviewConfirmed)}
                            onChange={(event) =>
                              updateItem(section.id, item.id, {
                                ...item,
                                allergens: {
                                  ...item.allergens,
                                  reviewConfirmed: event.target.checked,
                                },
                              })
                            }
                          />
                          {es
                            ? "Confirmo que he revisado los 14 alérgenos para esta receta"
                            : "I confirm I reviewed all 14 allergens for this recipe"}
                        </label>
                      </details>
                    )}
                  </article>
                );
              })}
            </div>

            <button
              type="button"
              className="button secondary"
              onClick={() => addItem(section.id)}
            >
              {es ? "+ Añadir elemento" : "+ Add item"}
            </button>
            <small>
              {es ? "Sección " + (sectionIndex + 1) : "Section " + (sectionIndex + 1)}
            </small>
          </section>
        ))}
      </div>

      <button type="button" className="button secondary" onClick={addSection}>
        {es ? "+ Añadir sección" : "+ Add section"}
      </button>

      <div className="catalogue-editor-footer">
        <span>
          {itemCount} {es ? "elementos" : "items"} ·{" "}
          {es
            ? "Los cambios no son públicos hasta publicar."
            : "Changes stay private until published."}
        </span>
        <div>
          {publishedRevision !== null && (
            <form action={unpublishVenueCatalogue}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="venueId" value={venueId} />
              <input type="hidden" name="expectedRevision" value={revision} />
              <button className="button secondary" type="submit">
                {es ? "Ocultar del público" : "Unpublish"}
              </button>
            </form>
          )}
          <form action={saveVenueCatalogue}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="venueId" value={venueId} />
            <input type="hidden" name="expectedRevision" value={revision} />
            <input type="hidden" name="document" value={JSON.stringify(document)} />
            <button className="button secondary" type="submit" name="publish" value="0">
              {es ? "Guardar borrador" : "Save draft"}
            </button>
            <button className="button" type="submit" name="publish" value="1">
              {es ? "Publicar" : "Publish"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
