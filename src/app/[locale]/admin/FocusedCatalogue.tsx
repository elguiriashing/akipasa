import { AdminWorkbench } from "./AdminWorkbench";
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
      <AdminWorkbench
        locale={locale}
        title={es ? "Categorías" : "Categories"}
        createLabel={es ? "Nueva categoría" : "New category"}
        createContent={<CategoryForm locale={locale} />}
        items={categories.map((category) => ({
          id: category.id,
          title: es ? category.name_es : category.name_en || category.name_es,
          subtitle: category.slug,
          keywords: [category.name_es, category.name_en, category.slug].join(
            " ",
          ),
          content: <CategoryForm locale={locale} category={category} />,
        }))}
      />
    );
  }

  if (section === "cities") {
    return (
      <AdminWorkbench
        locale={locale}
        title={es ? "Localidades" : "Localities"}
        createLabel={es ? "Nueva localidad" : "New locality"}
        createContent={<CityForm locale={locale} />}
        items={cities.map((city) => ({
          id: city.id,
          title: es ? city.name_es : city.name_en || city.name_es,
          subtitle: city.slug + " · " + city.timezone,
          keywords: [city.slug, city.name_es, city.name_en, city.timezone]
            .filter(Boolean)
            .join(" "),
          content: <CityForm locale={locale} city={city} />,
        }))}
      />
    );
  }

  return (
    <AdminWorkbench
      locale={locale}
      title={es ? "Funciones de plataforma" : "Platform features"}
      statusLabels={{
        enabled: es ? "Activado" : "Enabled",
        disabled: es ? "Desactivado" : "Disabled",
      }}
      items={flags.map((flag) => ({
        id: flag.key,
        title: es ? flag.label_es : flag.label_en,
        subtitle: flag.key.replaceAll("_", " "),
        status: flag.enabled ? "enabled" : "disabled",
        keywords: [flag.key, flag.label_es, flag.label_en].join(" "),
        content: (
          <form
            action={updateFeatureFlag}
            className="stack admin-workbench-form"
          >
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="key" value={flag.key} />
            <label className="admin-flag-toggle">
              <input
                name="enabled"
                type="checkbox"
                defaultChecked={flag.enabled}
              />
              <span>{es ? "Función activada" : "Feature enabled"}</span>
            </label>
            <label>
              {es ? "Motivo del cambio" : "Change reason"}
              <textarea
                name="reason"
                required
                minLength={10}
                maxLength={500}
                placeholder={
                  es
                    ? "Explica por qué cambias este control…"
                    : "Explain why you are changing this control…"
                }
              />
            </label>
            <div className="admin-workbench-action">
              <button className="button primary" type="submit">
                {es ? "Guardar control" : "Save setting"}
              </button>
            </div>
          </form>
        ),
      }))}
    />
  );
}
