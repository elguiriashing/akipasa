"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Locale } from "@/lib/config";
import type { SpainAddressSuggestion } from "@/lib/spain-addresses";
import { Icon } from "@/components/Icons";

export function SpainLocationPicker({
  locale,
  defaultName,
  defaultLocality,
  defaultLatitude,
  defaultLongitude,
}: {
  locale: Locale;
  defaultName: string;
  defaultLocality: string;
  defaultLatitude: number;
  defaultLongitude: number;
}) {
  const id = useId();
  const listId = `${id}-results`;
  const es = locale === "es";
  const [value, setValue] = useState(defaultName);
  const [selected, setSelected] = useState<SpainAddressSuggestion | null>(null);
  const [suggestions, setSuggestions] = useState<SpainAddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const edited = useRef(false);

  useEffect(() => {
    if (!edited.current || selected || value.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setFailed(false);
      try {
        const params = new URLSearchParams({
          q: value.trim(),
          mode: "locality",
        });
        const response = await fetch(`/api/locations/search?${params}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("Location search failed");
        const payload = (await response.json()) as {
          suggestions?: SpainAddressSuggestion[];
        };
        const next = (payload.suggestions || []).filter(
          (item) => item.latitude !== null && item.longitude !== null,
        );
        setSuggestions(next);
        setOpen(next.length > 0);
        setActiveIndex(next.length ? 0 : -1);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setFailed(true);
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [selected, value]);

  function choose(item: SpainAddressSuggestion) {
    setSelected(item);
    setValue(item.label);
    setSuggestions([]);
    setOpen(false);
    window.setTimeout(() => {
      document
        .getElementById(id)
        ?.closest("form")
        ?.dispatchEvent(new Event("akipasa:filters-change"));
    }, 0);
  }

  return (
    <div className="address-autocomplete">
      <label htmlFor={id}>{es ? "Zona" : "Area"}</label>
      <div className="location-input-control">
        <Icon name="search" />
        <input
          id={id}
          value={value}
          minLength={3}
          maxLength={160}
          autoComplete="address-level2"
          placeholder={es ? "Busca ciudad o zona" : "Search city or area"}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          aria-activedescendant={
            open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined
          }
          onChange={(event) => {
            edited.current = true;
            setValue(event.target.value);
            setSelected(null);
          }}
          onFocus={() => suggestions.length && setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onKeyDown={(event) => {
            if (!open || !suggestions.length) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) => (index + 1) % suggestions.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex(
                (index) =>
                  (index - 1 + suggestions.length) % suggestions.length,
              );
            } else if (event.key === "Enter" && activeIndex >= 0) {
              event.preventDefault();
              choose(suggestions[activeIndex]);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      </div>{" "}
      <input type="hidden" name="locality" value={defaultLocality} />
      <input
        type="hidden"
        name="locationName"
        value={selected?.label || defaultName}
      />
      <input
        type="hidden"
        name="latitude"
        value={selected?.latitude ?? defaultLatitude}
      />
      <input
        type="hidden"
        name="longitude"
        value={selected?.longitude ?? defaultLongitude}
      />
      {open && (
        <ul id={listId} role="listbox" className="address-results">
          {suggestions.map((item, index) => (
            <li
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              key={`${item.id}-${item.label}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(item)}
            >
              <strong>{item.locality}</strong>
              <span>{item.province}</span>
            </li>
          ))}
        </ul>
      )}
      <small
        className={
          failed ? "address-status address-status-error" : "address-status"
        }
      >
        {loading
          ? es
            ? "Buscando zonas..."
            : "Searching areas..."
          : failed
            ? es
              ? "La búsqueda no está disponible ahora."
              : "Location search is unavailable right now."
            : es
              ? "Busca cualquier municipio o zona de España."
              : "Search any municipality or area in Spain."}
      </small>
    </div>
  );
}
