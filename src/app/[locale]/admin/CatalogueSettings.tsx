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
      <label>
        {es ? "Nombre en español" : "Spanish name"}
        <input
          name="nameEs"
          defaultValue={category?.name_es}
          required
          minLength={2}
        />
      </label>
      <label>
        {es ? "Nombre en inglés" : "English name"}
        <input
          name="nameEn"
          defaultValue={category?.name_en}
          required
          minLength={2}
        />
      </label>
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
      <label>
        {es ? "Nombre en español" : "Spanish name"}
        <input
          name="nameEs"
          defaultValue={city?.name_es}
          required
          minLength={2}
        />
      </label>
      <label>
        {es ? "Nombre en inglés" : "English name"}
        <input
          name="nameEn"
          defaultValue={city?.name_en || city?.name_es}
          required
          minLength={2}
        />
      </label>
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
    <section className="queue-section">
      <h2>{es ? "Catálogo y configuración" : "Catalogue and settings"}</h2>
      <p>
        {es
          ? "Los cambios requieren un motivo y quedan registrados en el historial de moderación."
          : "Changes require a reason and are recorded in the moderation history."}
      </p>
      <div className="dashboard-grid">
        <details className="panel">
          <summary>
            <strong>{es ? "Categorías" : "Categories"}</strong>
          </summary>
          <form action={saveCategory} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <CategoryFields es={es} />
            <button className="button" type="submit">
              {es ? "Crear categoría" : "Create category"}
            </button>
          </form>
          {categories.map((category) => (
            <details className="managed-row" key={category.id}>
              <summary>
                <strong>
                  {locale === "en" ? category.name_en : category.name_es}
                </strong>{" "}
                · {category.slug}
              </summary>
              <form action={saveCategory} className="stack">
                <input type="hidden" name="locale" value={locale} />
                <CategoryFields category={category} es={es} />
                <button className="button" type="submit">
                  {es ? "Guardar categoría" : "Save category"}
                </button>
              </form>
            </details>
          ))}
        </details>
        <details className="panel">
          <summary>
            <strong>
              {es ? "Localidades de negocio" : "Business localities"}
            </strong>
          </summary>
          <form action={saveCity} className="stack">
            <input type="hidden" name="locale" value={locale} />
            <CityFields es={es} />
            <button className="button" type="submit">
              {es ? "Crear localidad" : "Create locality"}
            </button>
          </form>
          {cities.map((city) => (
            <details className="managed-row" key={city.id}>
              <summary>
                <strong>
                  {locale === "en"
                    ? city.name_en || city.name_es
                    : city.name_es}
                </strong>{" "}
                · {city.timezone}
              </summary>
              <form action={saveCity} className="stack">
                <input type="hidden" name="locale" value={locale} />
                <CityFields city={city} es={es} />
                <button className="button" type="submit">
                  {es ? "Guardar localidad" : "Save locality"}
                </button>
              </form>
            </details>
          ))}
        </details>
        <section className="panel">
          <h3>{es ? "Controles operativos" : "Operational controls"}</h3>
          {flags.map((flag) => (
            <form action={updateFeatureFlag} className="stack" key={flag.key}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="key" value={flag.key} />
              <label>
                <input
                  name="enabled"
                  type="checkbox"
                  defaultChecked={flag.enabled}
                />{" "}
                {locale === "en" ? flag.label_en : flag.label_es}
              </label>
              <label>
                {es ? "Motivo del cambio" : "Change reason"}
                <textarea name="reason" required minLength={10} />
              </label>
              <button className="button" type="submit">
                {es ? "Guardar control" : "Save control"}
              </button>
            </form>
          ))}
        </section>
      </div>
    </section>
  );
}
