"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OwnerPreferences } from "@/lib/owner-console";
import type { OwnerToolboxPanel } from "./OwnerToolboxPanel";

export function OwnerToolboxLauncher(props: {
  locale: "en" | "es";
  preferences: OwnerPreferences;
  userId: string;
}) {
  const [Panel, setPanel] = useState<typeof OwnerToolboxPanel | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(false);
  const { preferences } = props;
  const es = props.locale === "es";

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.ownerBackground = preferences.background;
    root.dataset.ownerAccent = preferences.accent;
    root.dataset.ownerMotion = String(preferences.motion);
    root.dataset.ownerGlass = String(preferences.glass);
  }, [preferences]);

  const open = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setFailed(false);
    try {
      const loadedPanel = await import("./OwnerToolboxPanel");
      if (mounted.current) setPanel(() => loadedPanel.OwnerToolboxPanel);
    } catch {
      if (mounted.current) setFailed(true);
    } finally {
      pending.current = false;
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (Panel) return;
    const onKey = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "o"
      ) {
        event.preventDefault();
        void open();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [Panel, open]);

  if (Panel) return <Panel {...props} initiallyOpen />;
  const label = loading
    ? es
      ? "Cargando…"
      : "Loading…"
    : failed
      ? es
        ? "Reintentar"
        : "Retry toolbox"
      : "Toolbox";
  return (
    <button
      type="button"
      className="owner-toolbox-trigger"
      disabled={loading}
      aria-busy={loading || undefined}
      aria-label={`DEV ${label}`}
      title={
        failed
          ? es
            ? "No se pudo cargar. Reintentar"
            : "Could not load. Retry"
          : undefined
      }
      onClick={() => void open()}
    >
      <span>DEV</span> <b>{label}</b>
    </button>
  );
}
