import React from "react";
import { saveCategory, saveCity, updateFeatureFlag } from "./actions";

type Category = {
  id: string;
  slug: string;
  name_es: string;
  name_en: string;
};

type City = {
  id: string;
  slug: string;
  name_es: string;
  name_en: string | null;
  center: unknown;
  timezone: string;
};

type Flag = {
  key: string;
  enabled: boolean;
  label_es: string;
  label_en: string;
  updated_at: string;
};

function pointCoordinates(value: unknown) {
  const coordinates = (
    value as { coordinates?: [number, number] } | null | undefined
  )?.coordinates;
  return Array.isArray(coordinates) && coordinates.length === 2
    ? { longitude: coordinates[0], latitude: coordinates[1] }
    : null;
}

function CategoryFields({
  category,
  es,
}: {
  category?: Category;
  es: boolean;
}) {
  return (
    <>
      <input type="hidden" name="categoryId" value={category?.id || ""} />
      <label>
        Slug
        <input
          name="slug"
          defaultValue={category?.slug}
          required
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
        />
      </label>
      <div className="two-col">
        <label>
          {es ? "Nombre en espanol" : "Spanish name"}
          <input
            name="nameEs"
            defaultValue={category?.name_es}
            required
            minLength={2}
          />
        </label>
        <label>
          {es ? "Nombre en ingles" : "English name"}
          <input
            name="nameEn"
            defaultValue={category?.name_en}
            required
            minLength={2}
          />
        </label>
      </div>
      <label>
        {es ? "Motivo del cambio" : "Change reason"}
        <textarea name="reason" required minLength={10} />
      </label>
    </>
  );
}

function CityFields({ city, es }: { city?: City; es: boolean }) {
  const point = pointCoordinates(city?.center);
  return (
    <>
      <input type="hidden" name="cityId" value={city?.id || ""} />
      <label>
        Slug
        <input
          name="slug"
          defaultValue={city?.slug}
          required
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
        />
      </label>
      <div className="two-col">
        <label>
          {es ? "Nombre en espanol" : "Spanish name"}
          <input
            name="nameEs"
            defaultValue={city?.name_es}
            required
            minLength={2}
          />
        </label>
        <label>
          {es ? "Nombre en ingles" : "English name"}
          <input
            name="nameEn"
            defaultValue={city?.name_en || city?.name_es}
            required
            minLength={2}
          />
        </label>
      </div>
      <div className="two-col">
        <label>
          {es ? "Latitud" : "Latitude"}
          <input
            name="latitude"
            type="number"
            step="any"
            min="27"
            max="44.5"
            defaultValue={point?.latitude}
            required
          />
        </label>
        <label>
          {es ? "Longitud" : "Longitude"}
          <input
            name="longitude"
            type="number"
            step="any"
            min="-19"
            max="5"
            defaultValue={point?.longitude}
            required
          />
        </label>
      </div>
      <label>
        {es ? "Zona horaria" : "Time zone"}
        <select
          name="timezone"
          defaultValue={city?.timezone || "Europe/Madrid"}
        >
          <option value="Europe/Madrid">Europe/Madrid</option>
          <option value="Atlantic/Canary">Atlantic/Canary</option>
        </select>
      </label>
      <label>
        {es ? "Motivo del cambio" : "Change reason"}
        <textarea name="reason" required minLength={10} />
      </label>
    </>
  );
}

export function CatalogueSettings({
  locale,
  categories,
  cities,
  flags,
}: {
  locale: "es" | "en";
  categories: Category[];
  cities: City[];
  flags: Flag[];
}) {
  const es = locale === "es";
  return (
    <section className="catalogue-console">
      <div className="console-section-header">
        <span className="console-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M5 5h14v14H5z" />
            <path d="M8 9h8M8 13h8M8 17h5" />
          </svg>
          <span>CA</span>
        </span>
        <div>
          <p>{es ? "Catálogo" : "Catalogue"}</p>
          <h2>{es ? "Catálogo y configuración" : "Catalogue and settings"}</h2>
          <span>
            {es
              ? "Controles visibles, editables y auditados sin desplegables ocultos."
              : "Visible, editable and audited controls without hidden dropdowns."}
          </span>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="panel console-card">
          <div className="card-title-row">
            <span className="status-pill">{categories.length}</span>
            <div>
              <h3>{es ? "Categorias" : "Categories"}</h3>
              <p>{es ? "Taxonomia de discovery." : "Discovery taxonomy."}</p>
            </div>
          </div>
          <form action={saveCategory} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <CategoryFields es={es} />
            <button className="button" type="submit">
              {es ? "Crear categoría" : "Create category"}
            </button>
          </form>
          <div className="settings-list">
            {categories.map((category) => (
              <form
                action={saveCategory}
                className="settings-row"
                key={category.id}
              >
                <input type="hidden" name="locale" value={locale} />
                <CategoryFields category={category} es={es} />
                <button className="button secondary" type="submit">
                  {es ? "Guardar categoria" : "Save category"}
                </button>
              </form>
            ))}
          </div>
        </section>

        <section className="panel console-card">
          <div className="card-title-row">
            <span className="status-pill">{cities.length}</span>
            <div>
              <h3>{es ? "Localidades de negocio" : "Business localities"}</h3>
              <p>
                {es
                  ? "Zonas operativas y husos horarios."
                  : "Operating areas and time zones."}
              </p>
            </div>
          </div>
          <form action={saveCity} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <CityFields es={es} />
            <button className="button" type="submit">
              {es ? "Crear localidad" : "Create locality"}
            </button>
          </form>
          <div className="settings-list">
            {cities.map((city) => (
              <form action={saveCity} className="settings-row" key={city.id}>
                <input type="hidden" name="locale" value={locale} />
                <CityFields city={city} es={es} />
                <button className="button secondary" type="submit">
                  {es ? "Guardar localidad" : "Save locality"}
                </button>
              </form>
            ))}
          </div>
        </section>

        <section className="panel console-card">
          <div className="card-title-row">
            <span className="status-pill">{flags.length}</span>
            <div>
              <h3>{es ? "Controles operativos" : "Operational controls"}</h3>
              <p>{es ? "Interruptores de producto." : "Product switches."}</p>
            </div>
          </div>
          <div className="settings-list">
            {flags.map((flag) => (
              <form
                action={updateFeatureFlag}
                className="settings-row"
                key={flag.key}
              >
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="key" value={flag.key} />
                <label className="switch-row">
                  <input
                    name="enabled"
                    type="checkbox"
                    defaultChecked={flag.enabled}
                  />
                  <span>{locale === "en" ? flag.label_en : flag.label_es}</span>
                </label>
                <label>
                  {es ? "Motivo del cambio" : "Change reason"}
                  <textarea name="reason" required minLength={10} />
                </label>
                <button className="button secondary" type="submit">
                  {es ? "Guardar control" : "Save control"}
                </button>
              </form>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
