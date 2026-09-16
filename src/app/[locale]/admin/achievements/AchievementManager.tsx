"use client";

import React, { useActionState, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Icon } from "../../../../components/Icons";
import type { Locale } from "../../../../lib/config";
import {
  achievementIcons,
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
          {es ? "Se desbloquean con XP" : "Unlocked with XP"}
        </span>
      </div>
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
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
        {visible.map((item) => (
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
              <strong>{item.minimum_xp.toLocaleString(locale)}</strong>
              <span>XP</span>
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
            <span>{draft.minimum_xp || 0} XP</span>
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
          <div className={styles.formRow}>
            <label>
              {es ? "Objetivo de XP" : "XP target"}
              <input
                name="minimum_xp"
                type="number"
                min={1}
                max={1000000}
                step={1}
                required
                value={draft.minimum_xp || ""}
                onChange={(event) =>
                  setDraft({ ...draft, minimum_xp: Number(event.target.value) })
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
            ? "Usa ambas traducciones. Los logros se calculan con el XP actual: cambiar el objetivo o la visibilidad también cambia las insignias que ven los usuarios. No modifica su XP."
            : "Complete both translations. Achievements use current XP: changing the target or visibility also changes the badges users see. Their XP stays unchanged."}
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
