"use client";

import React, { useMemo, useState } from "react";
import { Icon } from "./Icons";
import {
  achievementCondition,
  achievementTarget,
  achievementScopes,
  type AchievementProgress,
} from "../lib/achievements";
import type { Locale } from "../lib/config";
import styles from "./AchievementCollection.module.css";

export function AchievementCollection({
  locale,
  items,
  totalXp,
}: {
  locale: Locale;
  items: AchievementProgress[];
  totalXp: number;
}) {
  const es = locale === "es";
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("all");
  const [state, setState] = useState("all");
  const [city, setCity] = useState("");
  const [limit, setLimit] = useState(12);
  const earned = items.filter((item) => item.unlocked_at).length;
  const visible = useMemo(
    () =>
      items
        .filter(
          (item) =>
            (state === "all" ||
              Boolean(item.unlocked_at) === (state === "earned")) &&
            (group === "all" ||
              (group === "city"
                ? Boolean(item.city_key)
                : group === "category"
                  ? Boolean(item.category_key)
                  : !item.city_key && !item.category_key)) &&
            (!city || item.city_key === city) &&
            `${item.title_es} ${item.title_en} ${item.description_es} ${item.description_en}`
              .toLocaleLowerCase(locale)
              .includes(search.trim().toLocaleLowerCase(locale)),
        )
        .sort((a, b) => {
          if (
            state !== "earned" &&
            Boolean(a.unlocked_at) !== Boolean(b.unlocked_at)
          )
            return a.unlocked_at ? 1 : -1;
          if (a.unlocked_at && b.unlocked_at)
            return b.unlocked_at.localeCompare(a.unlocked_at);
          return (
            Math.min(1, b.current_count / achievementTarget(b)) -
              Math.min(1, a.current_count / achievementTarget(a)) ||
            achievementTarget(a) - achievementTarget(b) ||
            a[`title_${locale}`].localeCompare(b[`title_${locale}`], locale)
          );
        }),
    [items, state, group, city, search, locale],
  );
  return (
    <section
      className={styles.collection}
      aria-labelledby="badge-collection-heading"
    >
      <header className={styles.header}>
        <span className={styles.mark}>
          <Icon name="star" size={30} />
        </span>
        <div>
          <small>{es ? "CADA PLAN CUENTA" : "EVERY ADVENTURE COUNTS"}</small>
          <h3 id="badge-collection-heading">
            {es ? "Tu colección de logros" : "Your achievement collection"}
          </h3>
          <p>
            {earned} / {items.length} {es ? "conseguidos" : "earned"}{" "}
            <span>· {totalXp.toLocaleString(locale)} XP</span>
          </p>
        </div>
      </header>
      <p className={styles.hint}>
        {es
          ? "Descubre lugares, prueba algo nuevo y celebra cada paso. Solo cuentan los check-ins válidos en locales participantes."
          : "Discover places, try something new and celebrate each step. Only valid check-ins at participating venues count."}
      </p>
      <div
        className={styles.tabs}
        role="group"
        aria-label={es ? "Colección" : "Collection"}
      >
        {[
          ["all", es ? "Todos" : "All"],
          ["city", es ? "Ciudades" : "Cities"],
          ["category", es ? "Tus gustos" : "Your interests"],
          ["explore", es ? "Exploración" : "Exploration"],
        ].map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-pressed={group === key}
            onClick={() => {
              setGroup(key);
              setCity("");
              setLimit(12);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={styles.filters}>
        <input
          type="search"
          value={search}
          aria-label={es ? "Buscar logros" : "Search achievements"}
          placeholder={
            es ? "Fuengirola, foodie, café…" : "Fuengirola, foodie, coffee…"
          }
          onChange={(event) => {
            setSearch(event.target.value);
            setLimit(12);
          }}
        />
        <select
          aria-label={es ? "Progreso" : "Progress"}
          value={state}
          onChange={(event) => {
            setState(event.target.value);
            setLimit(12);
          }}
        >
          <option value="all">
            {es ? "Todos los logros" : "All achievements"}
          </option>
          <option value="next">{es ? "Por conseguir" : "To unlock"}</option>
          <option value="earned">{es ? "Conseguidos" : "Earned"}</option>
        </select>
        {group === "city" && (
          <select
            aria-label={es ? "Ciudad" : "City"}
            value={city}
            onChange={(event) => {
              setCity(event.target.value);
              setLimit(12);
            }}
          >
            <option value="">{es ? "Todas las ciudades" : "All cities"}</option>
            {achievementScopes.cities.map((city) => (
              <option key={city.key} value={city.key}>
                {city[locale]}
              </option>
            ))}
          </select>
        )}
      </div>
      <p className={styles.results} role="status">
        {visible.length}{" "}
        {es
          ? "logros · Los más cercanos primero"
          : "achievements · Closest milestones first"}
      </p>
      <div className={styles.grid}>
        {visible.slice(0, limit).map((item) => {
          const target = achievementTarget(item);
          const count = item.unlocked_at
            ? target
            : Math.min(target, Number(item.current_count));
          return (
            <article
              key={item.key}
              className={`${styles.card} ${item.unlocked_at ? styles.earned : ""}`}
            >
              <div className={styles.cardTop}>
                <span className={styles.badge}>
                  <Icon name={item.icon} size={24} />
                </span>
                <small>
                  {item.unlocked_at
                    ? es
                      ? "✓ CONSEGUIDO"
                      : "✓ EARNED"
                    : achievementCondition(item, locale)}
                </small>
              </div>
              <h4>{item[`title_${locale}`]}</h4>
              <p>{item[`description_${locale}`]}</p>
              <div className={styles.progress}>
                <span>
                  {count.toLocaleString(locale)} /{" "}
                  {target.toLocaleString(locale)}
                  {item.condition_type === "xp" ? " XP" : ""}
                </span>
                <progress
                  value={count}
                  max={target}
                  aria-label={item[`title_${locale}`]}
                />
              </div>
            </article>
          );
        })}
      </div>
      {!visible.length && (
        <p className={styles.empty}>
          {es
            ? "Aún no hay logros con estos filtros. Prueba otra ciudad o categoría."
            : "No achievements match these filters yet. Try another city or category."}
        </p>
      )}
      {visible.length > limit && (
        <button className={styles.more} onClick={() => setLimit(limit + 12)}>
          {es ? "Descubrir más logros" : "Discover more achievements"}
        </button>
      )}
    </section>
  );
}
