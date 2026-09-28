"use client";

import { Children, useEffect, useId, useState, type ReactNode } from "react";

export function MembershipPicker({
  locale,
  children,
  initialPlan,
}: {
  locale: "es" | "en";
  children: ReactNode;
  initialPlan?: string;
}) {
  const initialIndex =
    initialPlan === "business_pro" ? 2 : initialPlan === "business" ? 1 : 0;
  const [active, setActive] = useState(initialIndex);
  const id = useId();
  const labels = [locale === "es" ? "Personal" : "Personal", "Business", "Pro"];
  const panels = Children.toArray(children);
  useEffect(() => {
    const selectHash = () =>
      setActive(
        window.location.hash === "#business-pro-plan"
          ? 2
          : window.location.hash === "#business-plan"
            ? 1
            : initialIndex,
      );
    selectHash();
    window.addEventListener("hashchange", selectHash);
    return () => window.removeEventListener("hashchange", selectHash);
  }, [initialIndex]);
  return (
    <div className="membership-picker">
      <div
        className="membership-tabs"
        role="tablist"
        aria-label={locale === "es" ? "Planes" : "Plans"}
      >
        {labels.map((label, index) => (
          <button
            type="button"
            role="tab"
            key={label}
            id={`${id}-tab-${index}`}
            aria-controls={`${id}-panel-${index}`}
            aria-selected={active === index}
            tabIndex={active === index ? 0 : -1}
            onClick={() => setActive(index)}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % 3
                  : event.key === "ArrowLeft"
                    ? (index + 2) % 3
                    : event.key === "Home"
                      ? 0
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
            {label}
          </button>
        ))}
      </div>
      {panels.map((panel, index) => (
        <div
          key={index}
          role="tabpanel"
          tabIndex={0}
          id={`${id}-panel-${index}`}
          aria-labelledby={`${id}-tab-${index}`}
          hidden={active !== index}
        >
          {panel}
        </div>
      ))}
    </div>
  );
}
