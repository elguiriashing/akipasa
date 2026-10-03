"use client";

import { useEffect } from "react";

/** Mounted by the map's server page only for an authorised, opted-in preview account. */
export function MapCompanion({ portrait }: { portrait: string }) {
  useEffect(() => {
    const imageUrl = URL.createObjectURL(
      new Blob([portrait], { type: "image/svg+xml" }),
    );
    const marked = new Set<HTMLElement>();
    const style = document.createElement("style");
    style.textContent = `
      [data-akipals-location] { background: transparent !important; box-shadow: none !important; border: 0 !important; z-index: 4 !important; }
      [data-akipals-location]::before, [data-akipals-location]::after { display: none !important; }
      .akipals-location-button { position: absolute; width: 64px; height: 68px; left: 50%; bottom: calc(50% - 5px); transform: translateX(-50%); padding: 0; border: 0; background: transparent; cursor: pointer; pointer-events: auto; filter: drop-shadow(0 2px 2px #14213d44); }
      .akipals-location-button img { width: 100%; height: 100%; display: block; max-width: none; }
      .akipals-location-button:focus-visible { outline: 3px solid #ffad74; border-radius: 12px; outline-offset: 3px; }
      .maplibregl-user-location-dot-stale .akipals-location-button { opacity: .5; filter: grayscale(1); }
    `;
    document.head.appendChild(style);
    const decorate = () => {
      document
        .querySelectorAll<HTMLElement>(".maplibregl-user-location-dot")
        .forEach((dot) => {
          if (dot.dataset.akipalsLocation) return;
          dot.dataset.akipalsLocation = "true";
          marked.add(dot);
          const button = document.createElement("button");
          button.className = "akipals-location-button";
          button.type = "button";
          button.setAttribute(
            "aria-label",
            "Your AkiPal location. Open your wardrobe.",
          );
          button.title = "Your AkiPal · visible only to you";
          const image = document.createElement("img");
          image.src = imageUrl;
          image.alt = "";
          button.appendChild(image);
          button.addEventListener("click", (event) => {
            event.stopPropagation();
            window.location.assign("/pals");
          });
          dot.appendChild(button);
        });
    };
    const observer = new MutationObserver(decorate);
    observer.observe(document.body, { childList: true, subtree: true });
    decorate();
    return () => {
      observer.disconnect();
      for (const dot of marked) {
        dot.querySelector(".akipals-location-button")?.remove();
        delete dot.dataset.akipalsLocation;
      }
      style.remove();
      URL.revokeObjectURL(imageUrl);
    };
  }, [portrait]);
  return null;
}
