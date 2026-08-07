import { saveCategory, saveCity, updateFeatureFlag } from "./actions";

type Category = { id: string; slug: string; name_es: string; name_en: string };
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
};

function coordinates(value: unknown) {
  const point = value as { coordinates?: [number, number] } | null;
  return point?.coordinates
    ? { longitude: point.coordinates[0], latitude: point.coordinates[1] }
    : null;
}

function CategoryForm({
  locale,
  category,
}: {
  locale: "es" | "en";
  category?: Category;
}) {
  const es = locale === "es";
  return (
    <form action={saveCategory} className="stack">
      <input type="hidden" name="locale" value={locale} />
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
      <button className="button secondary" type="submit">
        {category
          ? es
            ? "Guardar categoría"
            : "Save category"
          : es
            ? "Crear categoría"
            : "Create category"}
      </button>
    </form>
  );
}

function CityForm({ locale, city }: { locale: "es" | "en"; city?: City }) {
  const es = locale === "es";
  const point = coordinates(city?.center);
  return (
    <form action={saveCity} className="stack">
      <input type="hidden" name="locale" value={locale} />
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
      <button className="button secondary" type="submit">
        {city
          ? es
            ? "Guardar localidad"
            : "Save locality"
          : es
            ? "Crear localidad"
            : "Create locality"}
      </button>
    </form>
  );
}

export function FocusedCatalogue({
  locale,
  section,
  categories = [],
  cities = [],
  flags = [],
}: {
  locale: "es" | "en";
  section: "categories" | "cities" | "flags";
  categories?: Category[];
  cities?: City[];
  flags?: Flag[];
}) {
  const es = locale === "es";
  if (section === "categories") {
    return (
      <section className="panel console-card">
        <details className="settings-disclosure">
          <summary>{es ? "Crear categoría" : "Create category"}</summary>
          <CategoryForm locale={locale} />
        </details>
        <div className="settings-list">
          {categories.map((category) => (
            <details className="settings-row" key={category.id}>
              <summary>
                {locale === "en" ? category.name_en : category.name_es}
              </summary>
              <CategoryForm locale={locale} category={category} />
            </details>
          ))}
        </div>
      </section>
    );
  }
  if (section === "cities") {
    return (
      <section className="panel console-card">
        <details className="settings-disclosure">
          <summary>{es ? "Crear localidad" : "Create locality"}</summary>
          <CityForm locale={locale} />
        </details>
        <div className="settings-list">
          {cities.map((city) => (
            <details className="settings-row" key={city.id}>
              <summary>
                {locale === "en" ? city.name_en || city.name_es : city.name_es}
              </summary>
              <CityForm locale={locale} city={city} />
            </details>
          ))}
        </div>
      </section>
    );
  }
  return (
    <section className="panel console-card">
      <div className="settings-list">
        {flags.map((flag) => (
          <details className="settings-row" key={flag.key}>
            <summary>
              {locale === "en" ? flag.label_en : flag.label_es}
              <span className="status-pill">{flag.enabled ? "On" : "Off"}</span>
            </summary>
            <form action={updateFeatureFlag} className="stack">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="key" value={flag.key} />
              <label className="switch-row">
                <input
                  name="enabled"
                  type="checkbox"
                  defaultChecked={flag.enabled}
                />
                <span>{es ? "Activado" : "Enabled"}</span>
              </label>
              <label>
                {es ? "Motivo del cambio" : "Change reason"}
                <textarea name="reason" required minLength={10} />
              </label>
              <button className="button secondary" type="submit">
                {es ? "Guardar control" : "Save control"}
              </button>
            </form>
          </details>
        ))}
      </div>
    </section>
  );
}
