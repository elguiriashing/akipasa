"use client";
import { useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/config";
import {
  familyProgress,
  stampCategories,
  stampSymbols,
  tierName,
  rankName,
  finishName,
  type PassportFamily,
} from "@/lib/passport-collection";
import styles from "./CityStamps.module.css";
export function CityStamps({
  city,
  locale,
  families,
  error,
  signedIn,
}: {
  city: string;
  locale: Locale;
  families: PassportFamily[];
  error?: boolean;
  signedIn: boolean;
}) {
  const es = locale === "es";
  const [selected, setSelected] = useState<string | null>(null);
  const card = families.find((f) => f.city_key === city && !f.category_key);
  const p = familyProgress(card);
  const list = stampCategories.map((c) => ({
    category: c,
    family: families.find(
      (f) => f.city_key === city && f.category_key === c.key,
    ),
  }));
  const detail = list.find((x) => x.category.key === selected);
  const d = familyProgress(detail?.family);
  if (error)
    return (
      <section className={styles.collection} role="alert">
        <h3>{es ? "Tu colección" : "Your collection"}</h3>
        <p>
          {es
            ? "No se pudo cargar tu progreso. Recarga para reintentar."
            : "Your progress could not load. Refresh to retry."}
        </p>
      </section>
    );
  return (
    <section
      className={styles.collection}
      aria-label={es ? "Colección de la ciudad" : "City collection"}
    >
      <div className={styles.rank}>
        <span>{es ? "TU CIUDAD, TU HISTORIA" : "YOUR CITY, YOUR STORY"}</span>
        <h3>
          {rankName(p.tier, locale)} <small>{finishName(p.tier, locale)}</small>
        </h3>
        <p>
          {p.count} {es ? "lugares explorados" : "places explored"}
          {p.admin ? ` · ${es ? "Otorgado por admin" : "Admin awarded"}` : ""}
        </p>
        {p.next ? (
          <p>
            {p.count}/{p.next.target} · {es ? "Próximo rango" : "Next rank"}:{" "}
            {rankName(p.next.tier, locale)}
            {!p.attainable
              ? ` · ${es ? "Próximamente más locales participantes" : "More participating venues needed"}`
              : ""}
          </p>
        ) : p.tier === 6 ? (
          <p>✦ {es ? "Leyenda de la ciudad" : "City legend"}</p>
        ) : null}
      </div>
      <header className={styles.heading}>
        <h4>{es ? "Sellos de exploración" : "Exploration stamps"}</h4>
        <span>
          {list.filter((x) => familyProgress(x.family).tier > 0).length}/10
        </span>
      </header>
      <p className={styles.hint}>
        {es
          ? "Cada sello crece con tus visitas a distintos locales de esta categoría en la ciudad."
          : "Each stamp grows as you visit different places in that category within this city."}
      </p>
      <div className={styles.grid}>
        {list.map(({ category: c, family: f }) => {
          const s = familyProgress(f);
          return (
            <button
              key={c.key}
              className={styles.stamp}
              data-tier={s.tier}
              aria-expanded={selected === c.key}
              aria-controls={`stamp-detail-${city}`}
              onClick={() => setSelected(selected === c.key ? null : c.key)}
            >
              <span className={styles.medallion} aria-hidden="true">
                {stampSymbols[c.key]}
                <i>
                  {s.tier ? ["", "I", "II", "III", "IV", "V"][s.tier] : "·"}
                </i>
              </span>
              <strong>{c[locale]}</strong>
              <span>{tierName(s.tier, locale)}</span>
              <small>
                {s.tier
                  ? `${s.count} ${es ? "lugares" : "places"}`
                  : f?.available
                    ? es
                      ? "Empieza aquí"
                      : "Start here"
                    : es
                      ? "Próximamente"
                      : "Coming soon"}
              </small>
            </button>
          );
        })}
      </div>
      {detail && (
        <section id={`stamp-detail-${city}`} className={styles.detail}>
          <header>
            <h4>
              {detail.category[locale]} · {tierName(d.tier, locale)}
            </h4>
            <button
              onClick={() => setSelected(null)}
              aria-label={es ? "Cerrar detalles" : "Close details"}
            >
              ×
            </button>
          </header>
          {d.admin && (
            <p>
              {es
                ? "Otorgado por un administrador. Tus visitas reales no cambian."
                : "Awarded by an administrator. Your actual visits are unchanged."}
            </p>
          )}
          <p>
            {d.count}{" "}
            {es ? "locales distintos visitados" : "different places visited"}
          </p>
          {d.next && (
            <>
              <label>
                {tierName(d.next.tier, locale)}: {d.count}/{d.next.target}
                <progress
                  value={Math.min(d.count, d.next.target)}
                  max={d.next.target}
                />
              </label>
              {!d.attainable && (
                <p>
                  {es
                    ? "Se necesitan más locales participantes para alcanzar este nivel."
                    : "More participating venues are needed to reach this level."}
                </p>
              )}
            </>
          )}
          <ol className={styles.history}>
            {(
              detail.family?.milestones ||
              [1, 5, 10, 25, 50].map((n, i) => ({
                key: String(n),
                tier: i + 1,
                target: n,
                unlocked_at: null,
                manual_at: null,
              }))
            ).map((m) => (
              <li key={m.key}>
                <span>
                  {tierName(m.tier, locale)} · {m.target}
                </span>
                <span>
                  {m.unlocked_at
                    ? `${es ? "Reconocido" : "Recognised"} ${new Date(m.unlocked_at).toLocaleDateString(locale)}`
                    : m.manual_at
                      ? es
                        ? "Otorgado por admin"
                        : "Admin awarded"
                      : es
                        ? "Por conseguir"
                        : "To unlock"}
                </span>
              </li>
            ))}
          </ol>
          {Number(detail.family?.available) > 0 ? (
            <Link
              href={`/${locale}/passports/places?city=${encodeURIComponent(city)}&category=${detail.category.key}`}
            >
              {es ? "Ver locales que cuentan" : "See qualifying places"} →
            </Link>
          ) : (
            <p>
              {es
                ? "Los locales participantes aparecerán aquí."
                : "Participating places will appear here."}
            </p>
          )}
        </section>
      )}
      <details className={styles.detail}>
        <summary>{es ? "Rangos de la ciudad" : "City rank history"}</summary>
        <ol className={styles.history}>
          {(card?.milestones || []).map((m) => (
            <li key={m.key}>
              <span>
                {rankName(m.tier, locale)} · {m.target}
              </span>
              <span>
                {m.unlocked_at
                  ? "✓"
                  : m.manual_at
                    ? es
                      ? "Admin"
                      : "Admin"
                    : "—"}
              </span>
            </li>
          ))}
        </ol>
      </details>
      {!signedIn && (
        <Link
          href={`/${locale}/auth?mode=signin&next=${encodeURIComponent(`/${locale}/passports?city=${city}`)}`}
        >
          {es
            ? "Inicia sesión para guardar tu colección"
            : "Sign in to save your collection"}{" "}
          →
        </Link>
      )}
    </section>
  );
}
