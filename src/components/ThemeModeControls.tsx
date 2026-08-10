"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "./Icons";

const THEME_KEY = "akipasa.theme";
const THEME_EVENT = "akipasa:theme-change";

type ThemeMode = "light" | "dark";

const themeTokens: Record<ThemeMode, Record<string, string>> = {
  light: {
    "--primary": "#f56623",
    "--primary-dark": "#d94b0b",
    "--primary-soft": "rgba(245, 102, 35, 0.13)",
    "--accent": "#ff9c62",
    "--ink": "#123b36",
    "--muted": "#607a74",
    "--line": "rgba(18, 59, 54, 0.13)",
    "--surface": "#fffaf1",
    "--surface-alt": "#f3ecdf",
    "--sand": "#e8ddca",
    "--teal": "#0c9d82",
    "--teal-dark": "#08715e",
    "--shadow-soft": "0 16px 38px rgba(40, 48, 42, 0.12)",
    "--shadow-strong": "0 26px 54px rgba(40, 48, 42, 0.18)",
  },
  dark: {
    "--primary": "#ff7a33",
    "--primary-dark": "#e85f18",
    "--primary-soft": "rgba(255, 122, 51, 0.16)",
    "--accent": "#ffb26b",
    "--ink": "#f4efe4",
    "--muted": "#a9c4bd",
    "--line": "rgba(244, 239, 228, 0.1)",
    "--surface": "#103532",
    "--surface-alt": "#0a2422",
    "--sand": "#14403a",
    "--teal": "#17b897",
    "--teal-dark": "#0d7a63",
    "--shadow-soft": "0 16px 40px rgba(3, 12, 11, 0.4)",
    "--shadow-strong": "0 26px 56px rgba(2, 9, 8, 0.6)",
  },
};

function systemTheme(): ThemeMode {
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function validTheme(value: string | null | undefined): ThemeMode | null {
  if (value === "light" || value === "dark") return value;
  // Both legacy choices were dark palettes. Preserve the user's appearance
  // while migrating the setting away from subscription terminology.
  if (value === "standard" || value === "premium") return "dark";
  return null;
}

function readThemePreference(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  return validTheme(window.localStorage.getItem(THEME_KEY)) ?? systemTheme();
}

function hydrateThemeOnLoad(): ThemeMode {
  try {
    return readThemePreference();
  } catch {
    return "dark";
  }
}

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  const body = document.body;
  root.dataset.theme = theme;
  body.dataset.theme = theme;
  root.classList.remove(
    "theme-light",
    "theme-dark",
    "theme-standard",
    "theme-premium",
  );
  root.classList.add(`theme-${theme}`);
  body.classList.remove(
    "theme-light",
    "theme-dark",
    "theme-standard",
    "theme-premium",
  );
  body.classList.add(`theme-${theme}`);
  Object.entries(themeTokens[theme]).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  window.localStorage.setItem(THEME_KEY, theme);
  window.dispatchEvent(
    new CustomEvent<ThemeMode>(THEME_EVENT, { detail: theme }),
  );
}

export function ThemeManager() {
  useEffect(() => {
    applyTheme(readThemePreference());

    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_KEY) {
        applyTheme(validTheme(event.newValue) ?? systemTheme());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return null;
}

export function ThemeToggle({ locale }: { locale: "es" | "en" }) {
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    setMode(hydrateThemeOnLoad());
    const handleThemeChange = (event: Event) => {
      setMode((event as CustomEvent<ThemeMode>).detail);
    };
    window.addEventListener(THEME_EVENT, handleThemeChange);
    return () => window.removeEventListener(THEME_EVENT, handleThemeChange);
  }, []);

  const nextMode: ThemeMode = mode === "dark" ? "light" : "dark";
  const label =
    locale === "es"
      ? `Cambiar a modo ${nextMode === "light" ? "claro" : "oscuro"}`
      : `Switch to ${nextMode} mode`;

  function handleClick() {
    const current = validTheme(document.documentElement.dataset.theme) ?? mode;
    applyTheme(current === "dark" ? "light" : "dark");
  }

  return (
    <button
      type="button"
      className="theme-toggle theme-toggle--compact button"
      onClick={handleClick}
      aria-label={label}
      title={label}
      aria-pressed={mode === "dark"}
    >
      <Icon name={nextMode === "light" ? "sun" : "moon"} />
    </button>
  );
}
