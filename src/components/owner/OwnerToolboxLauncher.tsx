"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useState } from "react";
import type { OwnerPreferences } from "@/lib/owner-console";

const OwnerToolboxPanel = dynamic(
  () =>
    import("./OwnerToolboxPanel").then((module) => module.OwnerToolboxPanel),
  {
    ssr: false,
    loading: () => (
      <button
        type="button"
        className="owner-toolbox-trigger"
        disabled
        aria-busy="true"
      >
        DEV · Toolbox…
      </button>
    ),
  },
);

export function OwnerToolboxLauncher(props: {
  locale: "en" | "es";
  preferences: OwnerPreferences;
  userId: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const { preferences } = props;
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.ownerBackground = preferences.background;
    root.dataset.ownerAccent = preferences.accent;
    root.dataset.ownerMotion = String(preferences.motion);
    root.dataset.ownerGlass = String(preferences.glass);
  }, [preferences]);
  useEffect(() => {
    if (loaded) return;
    const openWithKeyboard = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "o"
      ) {
        event.preventDefault();
        setLoaded(true);
      }
    };
    window.addEventListener("keydown", openWithKeyboard);
    return () => window.removeEventListener("keydown", openWithKeyboard);
  }, [loaded]);
  return loaded ? (
    <OwnerToolboxPanel {...props} initiallyOpen />
  ) : (
    <button
      type="button"
      className="owner-toolbox-trigger"
      onClick={() => setLoaded(true)}
    >
      <span>DEV</span> Toolbox
    </button>
  );
}
