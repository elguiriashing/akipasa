"use client";

import { useEffect } from "react";
import type {
  OwnerBackgroundImage,
  OwnerPreferences,
} from "@/lib/owner-console";

const ownerBackgrounds = [
  "default",
  "aurora",
  "midnight",
  "synthwave",
  "paper",
  "none",
] as const;
const ownerAccents = ["orange", "teal", "violet", "pink", "gold"] as const;
import {
  clearOwnerBackground,
  deleteOwnerBackground,
  selectOwnerBackground,
  updateOwnerPreferences,
  uploadOwnerBackground,
} from "@/app/[locale]/owner/actions";

const backgroundLabels = {
  default: { en: "AkiPasa sunset", es: "Atardecer AkiPasa" },
  aurora: { en: "Aurora lab", es: "Laboratorio aurora" },
  midnight: { en: "Midnight ops", es: "Operaciones nocturnas" },
  synthwave: { en: "Synthwave", es: "Synthwave" },
  paper: { en: "Blueprint paper", es: "Papel de planos" },
  none: { en: "Quiet canvas", es: "Lienzo tranquilo" },
} as const;

function applyAccent(accent: string) {
  document.documentElement.dataset.ownerAccent = accent;
}

function applyBackground(background: string) {
  document.documentElement.dataset.ownerBackground = background;
}

export function OwnerAppearanceForm({
  locale,
  preferences,
  images,
}: {
  locale: "en" | "es";
  preferences: OwnerPreferences;
  images: OwnerBackgroundImage[];
}) {
  const es = locale === "es";

  useEffect(() => {
    applyAccent(preferences.accent);
    applyBackground(preferences.background);
  }, [preferences.accent, preferences.background]);

  return (
    <div className="owner-appearance-stack">
      <form action={updateOwnerPreferences} className="owner-preferences-form">
        <input type="hidden" name="locale" value={locale} />
        <fieldset>
          <legend>{es ? "Fondo base" : "Base background"}</legend>
          <div className="owner-choice-grid">
            {ownerBackgrounds.map((background) => (
              <label
                key={background}
                className={`owner-swatch owner-swatch-${background}`}
              >
                <input
                  type="radio"
                  name="background"
                  value={background}
                  defaultChecked={preferences.background === background}
                  onChange={() => applyBackground(background)}
                />
                <i />
                <span>{backgroundLabels[background][locale]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>{es ? "Acento" : "Accent"}</legend>
          <div className="owner-accent-row">
            {ownerAccents.map((accent) => (
              <label
                key={accent}
                className={`owner-accent owner-accent-${accent}`}
                title={accent}
              >
                <input
                  type="radio"
                  name="accent"
                  value={accent}
                  defaultChecked={preferences.accent === accent}
                  onChange={() => applyAccent(accent)}
                />
                <i />
                <span>{accent}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="owner-toggle-row">
          <label>
            <input
              type="checkbox"
              name="motion"
              defaultChecked={preferences.motion}
            />{" "}
            {es ? "Movimiento ambiental" : "Ambient motion"}
          </label>
          <label>
            <input
              type="checkbox"
              name="glass"
              defaultChecked={preferences.glass}
            />{" "}
            {es ? "Superficies de cristal" : "Glass surfaces"}
          </label>
        </div>
        <button className="button button-strong" type="submit">
          {es ? "Aplicar mi universo" : "Apply my universe"}
        </button>
      </form>

      <section
        className="owner-private-backgrounds"
        aria-labelledby="owner-private-background-title"
      >
        <div>
          <h3 id="owner-private-background-title">
            {es ? "Fondos privados" : "Private backgrounds"}
          </h3>
          <p>
            {es
              ? "Solo tu UUID puede listar, abrir o borrar estas imagenes."
              : "Only your UUID can list, open, or delete these images."}
          </p>
        </div>

        <form
          action={uploadOwnerBackground}
          className="owner-background-upload"
        >
          <input type="hidden" name="locale" value={locale} />
          <label>
            <span>{es ? "Subir imagen" : "Upload image"}</span>
            <input
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
            />
          </label>
          <small>JPG, PNG or WebP. Max 10 MB.</small>
          <button className="button" type="submit">
            {es ? "Subir y usar" : "Upload and use"}
          </button>
        </form>

        {images.length > 0 ? (
          <div className="owner-background-gallery">
            {images.map((image) => {
              const active = preferences.backgroundImagePath === image.path;
              return (
                <article key={image.path} className={active ? "active" : ""}>
                  <div
                    className="owner-background-preview"
                    style={{ backgroundImage: `url("${image.url}")` }}
                    aria-hidden="true"
                  />
                  <span>
                    {active ? (es ? "En uso" : "In use") : image.name}
                  </span>
                  <div>
                    {!active && (
                      <form action={selectOwnerBackground}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="path" value={image.path} />
                        <button type="submit">{es ? "Usar" : "Use"}</button>
                      </form>
                    )}
                    <form action={deleteOwnerBackground}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="path" value={image.path} />
                      <button type="submit" className="danger">
                        {es ? "Borrar" : "Delete"}
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="owner-background-empty">
            {es
              ? "Tu carpeta privada esta vacia."
              : "Your private folder is empty."}
          </p>
        )}

        {preferences.backgroundImagePath && (
          <form action={clearOwnerBackground}>
            <input type="hidden" name="locale" value={locale} />
            <button className="button button-ghost" type="submit">
              {es ? "Usar solo el fondo base" : "Use base background only"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
