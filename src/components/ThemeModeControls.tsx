"use client";

import React, { useEffect, useState } from "react";

const THEME_KEY = "akipasa.theme";

type ThemeMode = "standard" | "premium";

const themeTokens: Record<ThemeMode, Record<string, string>> = {
  standard: {
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
  premium: {
    "--primary": "#ff9142",
    "--primary-dark": "#ef7418",
    "--primary-soft": "rgba(255, 145, 66, 0.14)",
    "--accent": "#ffcf8a",
    "--ink": "#f7f3ea",
    "--muted": "#93a6b8",
    "--line": "rgba(247, 243, 234, 0.08)",
    "--surface": "#0c1720",
    "--surface-alt": "#060d13",
    "--sand": "#0f2029",
    "--teal": "#2fd6c4",
    "--teal-dark": "#0f8f83",
    "--shadow-soft": "0 20px 48px rgba(0, 3, 8, 0.55)",
    "--shadow-strong": "0 28px 68px rgba(0, 2, 6, 0.78)",
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

export function ThemeToggle({
  locale,
  compact = false,
}: {
  locale: "es" | "en";
  compact?: boolean;
}) {
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
      className={[
        "theme-toggle",
        "button",
        compact ? "theme-toggle--compact" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={handleClick}
      aria-label={
        locale === "es"
          ? `Cambiar a vista ${nextMode === "premium" ? "premium" : "est\u00e1ndar"}`
          : `Switch to ${nextMode} theme`
      }
      aria-pressed={mode === "premium"}
    >
      {compact ? (
        <span className="theme-toggle-symbol" aria-hidden="true">
          {mode === "premium" ? "\u2600" : "\u25d0"}
        </span>
      ) : mode === "premium" ? (
        isStandardDefault
      ) : (
        isPremiumDefault
      )}
    </button>
  );
}
