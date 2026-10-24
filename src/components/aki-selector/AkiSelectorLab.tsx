"use client";

import { useState } from "react";
import {
  AkiSelector,
  type AkiSelectorEffect,
  type AkiSelectorOption,
} from "./AkiSelector";
import "./aki-selector-lab.css";

type Locale = "en" | "es";
type Preset = "vibe" | "journey" | "collect";

const effects: readonly AkiSelectorEffect[] = [
  "ember",
  "solar",
  "bloom",
  "breeze",
  "aurora",
  "quiet",
];

function presets(preset: Preset, locale: Locale): AkiSelectorOption[] {
  const es = locale === "es";
  if (preset === "journey") {
    return [
      { id: "sea", label: es ? "Costa" : "Coast", symbol: "≈", effect: "breeze" },
      { id: "city", label: es ? "Ciudad" : "City", symbol: "◇", effect: "solar" },
      { id: "nature", label: es ? "Naturaleza" : "Nature", symbol: "✿", effect: "bloom" },
      { id: "night", label: es ? "De noche" : "After dark", symbol: "☾", effect: "aurora" },
      { id: "explore", label: es ? "Explorar" : "Explore", symbol: "✦", effect: "ember" },
    ];
  }
  if (preset === "collect") {
    return [
      { id: "bronze", label: es ? "Bronce" : "Bronze", symbol: "✧", effect: "ember" },
      { id: "silver", label: es ? "Plata" : "Silver", symbol: "◈", effect: "breeze" },
      { id: "gold", label: es ? "Oro" : "Gold", symbol: "✺", effect: "solar" },
      { id: "rare", label: es ? "Raro" : "Rare", symbol: "✿", effect: "bloom" },
      { id: "legend", label: es ? "Leyenda" : "Legend", symbol: "✷", effect: "aurora" },
    ];
  }
  return [
    { id: "spark", label: es ? "Energía" : "Energy", symbol: "♨", effect: "ember" },
    { id: "sun", label: es ? "Alegría" : "Joy", symbol: "☼", effect: "solar" },
    { id: "soft", label: es ? "Calma" : "Calm", symbol: "✿", effect: "bloom" },
    { id: "flow", label: es ? "Libertad" : "Freedom", symbol: "≈", effect: "breeze" },
    { id: "wonder", label: es ? "Magia" : "Wonder", symbol: "✦", effect: "aurora" },
  ];
}

const presetLabels: Record<Preset, { en: string; es: string }> = {
  vibe: { en: "Mood", es: "Ambiente" },
  journey: { en: "Place", es: "Lugar" },
  collect: { en: "Rewards", es: "Premios" },
};

export function AkiSelectorLab({ locale }: { locale: Locale }) {
  const es = locale === "es";
  const [preset, setPreset] = useState<Preset>("vibe");
  const [items, setItems] = useState<AkiSelectorOption[]>(() =>
    presets("vibe", locale),
  );
  const [selected, setSelected] = useState("spark");
  const [intensity, setIntensity] = useState<
    "subtle" | "balanced" | "cinematic"
  >("cinematic");
  const [motion, setMotion] = useState<"auto" | "off">("auto");
  const current = items.find((item) => item.id === selected) ?? items[0];

  function choosePreset(next: Preset) {
    const nextItems = presets(next, locale);
    setPreset(next);
    setItems(nextItems);
    setSelected(nextItems[0].id);
  }

  function editCurrent(patch: Partial<AkiSelectorOption>) {
    setItems((previous) =>
      previous.map((item) =>
        item.id === current.id ? { ...item, ...patch } : item,
      ),
    );
  }

  return (
    <div className="aks-lab">
      <div className="aks-lab__intro">
        <span className="aks-lab__eyebrow">AkiSuite / Private UI Lab</span>
        <h1>{es ? "Laboratorio AkiSelector" : "AkiSelector Playground"}</h1>
        <p>
          {es
            ? "Prueba el motor de animaciones reutilizable. Los cambios son locales a esta sesión y no afectan al público."
            : "Experiment with the reusable animation engine. All changes are local to this session and cannot affect the public site."}
        </p>
      </div>

      <div className="aks-lab__presets" role="group" aria-label={es ? "Ejemplos" : "Example presets"}>
        {(["vibe", "journey", "collect"] as const).map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={preset === id}
            onClick={() => choosePreset(id)}
          >
            {presetLabels[id][locale]}
          </button>
        ))}
      </div>

      <AkiSelector
        options={items}
        value={selected}
        onValueChange={setSelected}
        ariaLabel={es ? "Selector de demostración" : "Demo selector"}
        intensity={intensity}
        motion={motion}
        locale={locale}
      />

      <section className="aks-lab__panel" aria-label={es ? "Controles del motor" : "Engine controls"}>
        <div className="aks-lab__panel-heading">
          <h2>{es ? "Motor y apariencia" : "Engine & appearance"}</h2>
          <span>{es ? "Vista previa · sin guardar" : "Preview only · not saved"}</span>
        </div>
        <div className="aks-lab__fields">
          <label>
            <span>{es ? "Etiqueta seleccionada" : "Selected label"}</span>
            <input
              type="text"
              maxLength={28}
              value={current.label}
              onChange={(event) => editCurrent({ label: event.target.value })}
            />
          </label>
          <label>
            <span>{es ? "Efecto" : "Effect"}</span>
            <select
              value={current.effect ?? "quiet"}
              onChange={(event) =>
                editCurrent({ effect: event.target.value as AkiSelectorEffect })
              }
            >
              {effects.map((effect) => (
                <option key={effect} value={effect}>
                  {effect}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{es ? "Intensidad" : "Intensity"}</span>
            <select
              value={intensity}
              onChange={(event) =>
                setIntensity(
                  event.target.value as "subtle" | "balanced" | "cinematic",
                )
              }
            >
              <option value="subtle">{es ? "Suave" : "Subtle"}</option>
              <option value="balanced">{es ? "Equilibrada" : "Balanced"}</option>
              <option value="cinematic">{es ? "Cinematográfica" : "Cinematic"}</option>
            </select>
          </label>
          <label>
            <span>{es ? "Movimiento" : "Motion"}</span>
            <select
              value={motion}
              onChange={(event) =>
                setMotion(event.target.value as "auto" | "off")
              }
            >
              <option value="auto">{es ? "Sistema" : "Follow device setting"}</option>
              <option value="off">{es ? "Sin animaciones" : "Disabled"}</option>
            </select>
          </label>
        </div>
        <p className="aks-lab__note">
          {es
            ? "Sin llamadas de red, sin eventos de analítica, sin datos de usuario. Los nombres, efectos y callbacks son configurables desde el componente."
            : "No network calls, analytics events or user data. Labels, effects and selection callbacks are supplied by the host component."}
        </p>
      </section>
    </div>
  );
}
