"use client";

import React, { useActionState, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Icon } from "../../../../components/Icons";
import type { Locale } from "../../../../lib/config";
import {
  achievementIcons,
  achievementMetrics,
  metricLabels,
  achievementScopes,
  achievementTarget,
  achievementCondition,
  type Achievement,
  type AchievementActionState,
} from "../../../../lib/achievements";
import { saveAchievement, deleteAchievement } from "./actions";
import styles from "./achievements.module.css";

const iconNames = {
  discover: { es: "Explorar", en: "Explore" },
  star: { es: "Estrella", en: "Star" },
  venue: { es: "Local", en: "Venue" },
  gift: { es: "Premio", en: "Reward" },
  heart: { es: "Corazón", en: "Heart" },
};

export function AchievementManager({
  locale,
  achievements,
}: {
  locale: Locale;
  achievements: Achievement[];
}) {
  const es = locale === "es";
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(24);
  const [metric, setMetric] = useState("all");
  const [filter, setFilter] = useState("all");
  const [editor, setEditor] = useState<{
    item: Achievement;
    creating: boolean;
  } | null>(null);
  const [deleting, setDeleting] = useState<Achievement | null>(null);
  const [notice, setNotice] = useState("");
  const active = achievements.filter((item) => item.active).length;
  const visible = achievements.filter(
    (item) =>
      (filter === "all" || item.active === (filter === "active")) &&
      (metric === "all" || item.condition_type === metric) &&
      `${item.title_es} ${item.title_en} ${item.description_es} ${item.description_en}`
        .toLocaleLowerCase(locale)
        .includes(search.trim().toLocaleLowerCase(locale)),
  );
  function newAchievement() {
    setEditor({
      creating: true,
      item: {
        key: `a_${crypto.randomUUID().replaceAll("-", "")}`,
        title_es: "",
        title_en: "",
        description_es: "",
        description_en: "",
        minimum_xp: 10,
        condition_type: "xp",
        target_count: 10,
        city_key: null,
        category_key: null,
        icon: "star",
        active: false,
        updated_at: "",
      },
    });
  }
  return (
    <section className={styles.manager} aria-labelledby="achievement-heading">
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>
            {es
              ? "PEQUEÑOS HITOS, GRANDES PLANES"
              : "SMALL MILESTONES, BIG ADVENTURES"}
          </span>
          <h2 id="achievement-heading">
            {es ? "Logros" : "Achievements"}
            <span className={styles.count}>{achievements.length}</span>
          </h2>
          <p>
            {es
              ? "Dale un motivo más para seguir explorando."
              : "Give people one more reason to keep exploring."}
          </p>
        </div>
        <button className={styles.primary} onClick={newAchievement}>
          <Icon name="plus" size={18} />
          {es ? "Nuevo logro" : "New achievement"}
        </button>
      </header>
      <div className={styles.summary}>
        <span>
          <i className={styles.activeDot} />
          <strong>{active}</strong> {es ? "disponibles" : "available"}
        </span>
        <span>
          <strong>{achievements.length - active}</strong>{" "}
          {es ? "borradores" : "drafts"}
        </span>
        <span>
          <Icon name="activity" size={16} />
          {es ? "Condiciones de actividad" : "Activity milestones"}
        </span>
      </div>
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      <a className={styles.edit} href={`/${locale}/admin/achievements/venues`}>
        <Icon name="venue" size={18} />
        {es
          ? "Clasificar locales para los logros"
          : "Classify venues for achievements"}
      </a>
      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Icon name="search" size={18} />
          <input
            type="search"
            aria-label={es ? "Buscar logros" : "Search achievements"}
            placeholder={es ? "Buscar logros…" : "Search achievements…"}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <select
          aria-label={es ? "Tipo de condición" : "Condition type"}
          value={metric}
          onChange={(event) => {
            setMetric(event.target.value);
            setLimit(24);
          }}
        >
          <option value="all">
            {es ? "Todas las condiciones" : "All conditions"}
          </option>
          {achievementMetrics.map((type) => (
            <option key={type} value={type}>
              {metricLabels[type][locale]}
            </option>
          ))}
        </select>
        <div
          className={styles.filters}
          role="group"
          aria-label={es ? "Estado" : "Status"}
        >
          {[
            ["all", es ? "Todos" : "All"],
            ["active", es ? "Activos" : "Active"],
            ["draft", es ? "Borradores" : "Drafts"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.grid}>
        {visible.slice(0, limit).map((item) => (
          <article className={styles.card} key={item.key}>
            <div className={styles.cardTop}>
              <span className={styles.emblem}>
                <Icon name={item.icon} size={28} />
              </span>
              <span className={item.active ? styles.active : styles.draft}>
                {item.active
                  ? es
                    ? "Activo"
                    : "Active"
                  : es
                    ? "Borrador"
                    : "Draft"}
              </span>
            </div>
            <h3>{item[`title_${locale}`]}</h3>
            <p>{item[`description_${locale}`]}</p>
            <div className={styles.threshold}>
              <strong>{achievementTarget(item).toLocaleString(locale)}</strong>
              <span>{achievementCondition(item, locale)}</span>
              <small>{es ? "para desbloquear" : "to unlock"}</small>
            </div>
            <footer className={styles.cardFooter}>
              <button
                className={styles.edit}
                aria-label={`${es ? "Editar" : "Edit"} ${item[`title_${locale}`]}`}
                onClick={() => setEditor({ item, creating: false })}
              >
                <Icon name="settings" size={17} />
                {es ? "Editar logro" : "Edit achievement"}
              </button>
              <button
                className={styles.iconButton}
                aria-label={`${es ? "Eliminar" : "Delete"} ${item[`title_${locale}`]}`}
                onClick={() => setDeleting(item)}
              >
                <Icon name="trash" size={18} />
              </button>
            </footer>
          </article>
        ))}
      </div>
      {visible.length > limit && (
        <button
          className={styles.secondary}
          onClick={() => setLimit(limit + 24)}
        >
          {es ? "Mostrar más" : "Show more"} ({visible.length - limit})
        </button>
      )}
      {!visible.length && (
        <div className={styles.empty}>
          <Icon name="star" size={32} />
          <h3>{es ? "No hay logros aquí" : "No achievements here"}</h3>
          <p>
            {search || filter !== "all"
              ? es
                ? "Prueba otra búsqueda o filtro."
                : "Try another search or filter."
              : es
                ? "Crea el primer hito de tu comunidad."
                : "Create your community’s first milestone."}
          </p>
        </div>
      )}
      <p className={styles.footnote}>
        {es
          ? "Los logros activos aparecen en las recompensas de los usuarios. Los borradores solo se ven aquí."
          : "Active achievements appear in user rewards. Drafts are only visible here."}
      </p>
      {editor && (
        <AchievementEditor
          key={editor.item.key}
          {...editor}
          locale={locale}
          close={() => setEditor(null)}
          saved={() => {
            setEditor(null);
            setNotice(es ? "Logro guardado." : "Achievement saved.");
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          item={deleting}
          locale={locale}
          close={() => setDeleting(null)}
          saved={() => {
            setDeleting(null);
            setNotice(es ? "Logro eliminado." : "Achievement deleted.");
          }}
        />
      )}
    </section>
  );
}

function useDialog(close: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return { ref, onClose: close };
}

function AchievementEditor({
  locale,
  item,
  creating,
  close,
  saved,
}: {
  locale: Locale;
  item: Achievement;
  creating: boolean;
  close: () => void;
  saved: () => void;
}) {
  const es = locale === "es";
  const [draft, setDraft] = useState(item);
  const [language, setLanguage] = useState<Locale>(locale);
  const [state, action, pending] = useActionState<
    AchievementActionState,
    FormData
  >(saveAchievement, {});
  const dialog = useDialog(close);
  useEffect(() => {
    if (state.success) saved();
  }, [state.success, saved]);
  return (
    <dialog
      {...dialog}
      className={styles.dialog}
      aria-labelledby="achievement-editor-title"
      onCancel={(event) => {
        if (pending) event.preventDefault();
      }}
    >
      <div className={styles.dialogHeader}>
        <div>
          <span className={styles.eyebrow}>
            {es ? "CATÁLOGO DE LOGROS" : "ACHIEVEMENT CATALOGUE"}
          </span>
          <h2 id="achievement-editor-title">
            {creating
              ? es
                ? "Nuevo logro"
                : "New achievement"
              : es
                ? "Editar logro"
                : "Edit achievement"}
          </h2>
        </div>
        <button
          type="button"
          className={styles.iconButton}
          disabled={pending}
          onClick={close}
          aria-label={es ? "Cerrar" : "Close"}
        >
          <Icon name="close" size={20} />
        </button>
      </div>
      <form
        action={action}
        className={styles.editorForm}
        noValidate
        onSubmit={(event) => {
          const invalid = Array.from(event.currentTarget.elements).find(
            (
              element,
            ): element is
              | HTMLInputElement
              | HTMLTextAreaElement
              | HTMLSelectElement =>
              (element instanceof HTMLInputElement ||
                element instanceof HTMLTextAreaElement ||
                element instanceof HTMLSelectElement) &&
              element.willValidate &&
              !element.validity.valid,
          );
          if (!invalid) return;
          event.preventDefault();
          if (invalid.name.endsWith("_es") || invalid.name.endsWith("_en")) {
            flushSync(() =>
              setLanguage(invalid.name.endsWith("_es") ? "es" : "en"),
            );
          }
          invalid.reportValidity();
        }}
      >
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="key" value={item.key} />
        <input
          type="hidden"
          name="mode"
          value={creating ? "create" : "update"}
        />
        <input type="hidden" name="updated_at" value={item.updated_at} />
        <div
          className={styles.preview}
          aria-label={es ? "Vista previa" : "Preview"}
        >
          <span className={styles.emblem}>
            <Icon name={draft.icon} size={28} />
          </span>
          <div>
            <small>{es ? "VISTA PREVIA" : "PREVIEW"}</small>
            <strong>
              {draft[`title_${language}`] ||
                (es ? "Tu próximo logro" : "Your next achievement")}
            </strong>
            <span>
              {achievementTarget(draft)} · {achievementCondition(draft, locale)}
            </span>
          </div>
        </div>
        <fieldset disabled={pending} className={styles.fields}>
          <div
            className={styles.languageTabs}
            role="group"
            aria-label={es ? "Idioma de edición" : "Editing language"}
          >
            {(["es", "en"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                aria-pressed={language === lang}
                onClick={() => setLanguage(lang)}
              >
                {lang === "es" ? "Español" : "English"}
              </button>
            ))}
          </div>
          {(["es", "en"] as const).map((lang) => (
            <div
              key={lang}
              hidden={language !== lang}
              className={styles.translation}
            >
              <label>
                {es ? "Nombre" : "Name"} ({lang.toUpperCase()})
                <input
                  name={`title_${lang}`}
                  value={draft[`title_${lang}`]}
                  required
                  minLength={2}
                  maxLength={80}
                  onInvalid={() => setLanguage(lang)}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      [`title_${lang}`]: event.target.value,
                    })
                  }
                  placeholder={
                    lang === "es"
                      ? "Ej. Explorador de la costa"
                      : "E.g. Coastal explorer"
                  }
                />
              </label>
              <label>
                {es ? "Descripción" : "Description"} ({lang.toUpperCase()})
                <textarea
                  name={`description_${lang}`}
                  value={draft[`description_${lang}`]}
                  required
                  minLength={3}
                  maxLength={300}
                  rows={2}
                  onInvalid={() => setLanguage(lang)}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      [`description_${lang}`]: event.target.value,
                    })
                  }
                />
              </label>
            </div>
          ))}
          <label>
            {es ? "Condición" : "Condition"}
            <select
              name="condition_type"
              value={draft.condition_type || "xp"}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  condition_type: event.target
                    .value as Achievement["condition_type"],
                  city_key: null,
                  category_key: null,
                })
              }
            >
              {achievementMetrics.map((type) => (
                <option key={type} value={type}>
                  {metricLabels[type][locale]}
                </option>
              ))}
            </select>
          </label>
          {draft.condition_type === "venues" && (
            <div className={styles.formRow}>
              <label>
                {es ? "Ciudad" : "City"}
                <select
                  name="city_key"
                  value={draft.city_key || ""}
                  onChange={(event) =>
                    setDraft({ ...draft, city_key: event.target.value || null })
                  }
                >
                  <option value="">
                    {es ? "Cualquier ciudad" : "Any city"}
                  </option>
                  {achievementScopes.cities.map((city) => (
                    <option key={city.key} value={city.key}>
                      {city[locale]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {es ? "Categoría" : "Category"}
                <select
                  name="category_key"
                  value={draft.category_key || ""}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      category_key: event.target.value || null,
                    })
                  }
                >
                  <option value="">
                    {es ? "Cualquier categoría" : "Any category"}
                  </option>
                  {achievementScopes.categories.map((category) => (
                    <option key={category.key} value={category.key}>
                      {category[locale]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <div className={styles.formRow}>
            <label>
              {draft.condition_type === "xp"
                ? es
                  ? "Objetivo de XP"
                  : "XP target"
                : es
                  ? "Objetivo"
                  : "Target"}
              <input
                name="target_count"
                type="number"
                min={1}
                max={1000000}
                step={1}
                required
                value={achievementTarget(draft) || ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    minimum_xp: Number(event.target.value),
                    target_count: Number(event.target.value),
                  })
                }
              />
            </label>
            <label>
              {es ? "Visibilidad" : "Visibility"}
              <select
                name="active"
                value={String(draft.active)}
                onChange={(event) =>
                  setDraft({ ...draft, active: event.target.value === "true" })
                }
              >
                <option value="false">{es ? "Borrador" : "Draft"}</option>
                <option value="true">{es ? "Activo" : "Active"}</option>
              </select>
            </label>
          </div>
          <fieldset className={styles.iconPicker}>
            <legend>{es ? "Icono de la insignia" : "Badge icon"}</legend>
            {achievementIcons.map((icon) => (
              <label key={icon}>
                <input
                  type="radio"
                  name="icon"
                  value={icon}
                  checked={draft.icon === icon}
                  onChange={() => setDraft({ ...draft, icon })}
                />
                <span title={iconNames[icon][locale]}>
                  <Icon name={icon} size={22} />
                  <span className="sr-only">{iconNames[icon][locale]}</span>
                </span>
              </label>
            ))}
          </fieldset>
        </fieldset>
        <p className={styles.hint}>
          {es
            ? "Solo cuentan los check-ins aceptados. Los locales distintos no cuentan visitas repetidas. Los logros ya ganados se conservan al cambiar la condición; ocultar o eliminar un logro lo quita del catálogo visible. No modifica el XP."
            : "Only accepted check-ins count. Distinct places exclude repeat visits. Earned badges survive condition changes; hiding or deleting a definition removes it from the visible catalogue. XP stays unchanged."}
        </p>
        {state.error && (
          <p role="alert" className={styles.error}>
            {state.error}
          </p>
        )}
        <div className={styles.dialogFooter}>
          <button
            type="button"
            className={styles.secondary}
            onClick={close}
            disabled={pending}
          >
            {es ? "Cancelar" : "Cancel"}
          </button>
          <button type="submit" className={styles.primary} disabled={pending}>
            {pending
              ? es
                ? "Guardando…"
                : "Saving…"
              : es
                ? "Guardar logro"
                : "Save achievement"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function DeleteDialog({
  item,
  locale,
  close,
  saved,
}: {
  item: Achievement;
  locale: Locale;
  close: () => void;
  saved: () => void;
}) {
  const es = locale === "es";
  const [state, action, pending] = useActionState<
    AchievementActionState,
    FormData
  >(deleteAchievement, {});
  const dialog = useDialog(close);
  useEffect(() => {
    if (state.success) saved();
  }, [state.success, saved]);
  return (
    <dialog
      {...dialog}
      className={styles.dialog}
      aria-labelledby="achievement-delete-title"
      onCancel={(event) => {
        if (pending) event.preventDefault();
      }}
    >
      <div className={styles.dialogHeader}>
        <h2 id="achievement-delete-title">
          {es ? "¿Eliminar este logro?" : "Delete this achievement?"}
        </h2>
      </div>
      <form action={action} className={styles.editorForm}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="key" value={item.key} />
        <input type="hidden" name="updated_at" value={item.updated_at} />
        <p>
          <strong>{item[`title_${locale}`]}</strong>
        </p>
        <p className={styles.hint}>
          {es
            ? "Desaparecerá del catálogo y de las insignias de los usuarios. Su XP se conserva. Si solo quieres ocultarlo, cámbialo a borrador."
            : "This removes it from the catalogue and users’ badges. Their XP is preserved. To hide it temporarily, change it to draft instead."}
        </p>
        <label className={styles.confirm}>
          <input
            type="checkbox"
            name="confirm"
            value="delete"
            required
            disabled={pending}
          />
          {es
            ? "Sí, eliminar este logro definitivamente."
            : "Yes, permanently delete this achievement."}
        </label>
        {state.error && (
          <p role="alert" className={styles.error}>
            {state.error}
          </p>
        )}
        <div className={styles.dialogFooter}>
          <button
            type="button"
            className={styles.secondary}
            onClick={close}
            disabled={pending}
            autoFocus
          >
            {es ? "Cancelar" : "Cancel"}
          </button>
          <button type="submit" className={styles.danger} disabled={pending}>
            {pending
              ? es
                ? "Eliminando…"
                : "Deleting…"
              : es
                ? "Eliminar logro"
                : "Delete achievement"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
