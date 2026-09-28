"use client";

import React, { Children, useId, useState, type ReactNode } from "react";

export function StudioTabs({
  locale,
  children,
}: {
  locale: string;
  children: ReactNode;
}) {
  const [active, setActive] = useState(1);
  const id = useId();
  const labels =
    locale === "es"
      ? ["Imágenes", "Perfil", "Eventos"]
      : ["Images", "Profile", "Events"];
  const panels = Children.toArray(children);
  return (
    <div className="studio-tabs">
      <div
        className="studio-tab-list"
        role="tablist"
        aria-label={locale === "es" ? "Editar perfil" : "Edit profile"}
      >
        {[1, 0, 2].map((index, position) => (
          <button
            key={index}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-controls={`${id}-panel-${index}`}
            aria-selected={active === index}
            tabIndex={active === index ? 0 : -1}
            onClick={() => setActive(index)}
            onKeyDown={(event) => {
              const order = [1, 0, 2];
              const next =
                event.key === "ArrowRight"
                  ? order[(position + 1) % 3]
                  : event.key === "ArrowLeft"
                    ? order[(position + 2) % 3]
                    : event.key === "Home"
                      ? 1
                      : event.key === "End"
                        ? 2
                        : null;
              if (next !== null) {
                event.preventDefault();
                setActive(next);
                document.getElementById(`${id}-tab-${next}`)?.focus();
              }
            }}
          >
            {labels[index]}
          </button>
        ))}
      </div>
      {panels.map((panel, index) => (
        <div
          key={index}
          role="tabpanel"
          id={`${id}-panel-${index}`}
          aria-labelledby={`${id}-tab-${index}`}
          hidden={active !== index}
          onInvalidCapture={(event) => {
            setActive(index);
            const target = event.target as HTMLElement;
            let parent = target.parentElement;
            while (parent) {
              if (parent instanceof HTMLDetailsElement) parent.open = true;
              parent = parent.parentElement;
            }
          }}
        >
          {panel}
        </div>
      ))}
    </div>
  );
}
