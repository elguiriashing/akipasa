"use client";

import { useEffect, useState } from "react";

const THEME_KEY = "akipasa.theme";

type ThemeMode = "standard" | "premium";

const themeTokens: Record<ThemeMode, Record<string, string>> = {
  standard: {
    "--primary": "#00a67e",
    "--primary-dark": "#0a7f64",
    "--primary-soft": "#e7f7f1",
    "--accent": "#ff7a33",
    "--ink": "#102126",
    "--muted": "#55626a",
    "--line": "#dce5ea",
    "--surface": "#ffffff",
    "--surface-alt": "#f4f7fa",
    "--sand": "#edf3f8",
    "--shadow-soft": "0 16px 40px rgba(18, 31, 41, 0.09)",
    "--shadow-strong": "0 26px 48px rgba(17, 40, 51, 0.16)",
  },
  premium: {
    "--primary": "#5f7cff",
    "--primary-dark": "#374fc2",
    "--primary-soft": "#1c2941",
    "--accent": "#ff9d5a",
    "--ink": "#f3f7ff",
    "--muted": "#98abc9",
    "--line": "#2b3b57",
    "--surface": "#111a2b",
    "--surface-alt": "#0a121f",
    "--sand": "#131f34",
    "--shadow-soft": "0 20px 58px rgba(2, 6, 23, 0.52)",
    "--shadow-strong": "0 28px 68px rgba(2, 6, 23, 0.7)",
  },
};

function validTheme(value: string | null): ThemeMode {
  return value === "premium" || value === "standard" ? value : "standard";
}

function readThemePreference(): ThemeMode {
  if (typeof window === "undefined") return "standard";
  return validTheme(window.localStorage.getItem(THEME_KEY));
}

function hydrateThemeOnLoad() {
  try {
    return readThemePreference();
  } catch {
    return "standard";
  }
}

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  const body = document.body;
  root.dataset.theme = theme;
  body.dataset.theme = theme;
  root.classList.remove("theme-standard", "theme-premium");
  root.classList.add(`theme-${theme}`);
  body.classList.remove("theme-standard", "theme-premium");
  body.classList.add(`theme-${theme}`);
  Object.entries(themeTokens[theme]).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  window.localStorage.setItem(THEME_KEY, theme);
}

export function ThemeManager() {
  useEffect(() => {
    applyTheme(readThemePreference());

    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_KEY) {
        const next = validTheme(event.newValue);
        applyTheme(next);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return null;
}

export function ThemeToggle({ locale }: { locale: "es" | "en" }) {
  const [mode, setMode] = useState<ThemeMode>("standard");

  useEffect(() => {
    setMode(hydrateThemeOnLoad());
  }, []);

  const isPremiumDefault = locale === "en" ? "Premium" : "Premium";
  const isStandardDefault = locale === "es" ? "Est\u00e1ndar" : "Standard";

  const nextMode: ThemeMode = mode === "standard" ? "premium" : "standard";

  function handleClick() {
    const resolvedMode =
      validTheme(document.documentElement.dataset.theme || mode) === "standard"
        ? "premium"
        : "standard";
    applyTheme(resolvedMode);
    setMode(resolvedMode);
  }

  return (
    <button
      type="button"
      className="theme-toggle button"
      onClick={handleClick}
      aria-label={
        locale === "es"
          ? `Cambiar a vista ${nextMode === "premium" ? "premium" : "est\u00e1ndar"}`
          : `Switch to ${nextMode} theme`
      }
      aria-pressed={mode === "premium"}
    >
      {mode === "premium" ? isStandardDefault : isPremiumDefault}
    </button>
  );
}
