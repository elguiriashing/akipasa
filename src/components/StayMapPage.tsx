"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { config } from "@/lib/config";
import { stayTypeNames } from "@/lib/akiduermo";
import { stayText, type StayLocale } from "@/lib/akiduermo-i18n";
import { StayAppShell } from "./StayAppShell";
import styles from "./StayMapPage.module.css";

const ProductionMap = dynamic(
  () => import("./ProductionMap").then((m) => m.ProductionMap),
  { ssr: false },
);
export function StayMapPage({ locale }: { locale: StayLocale }) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const t = (value: string) => stayText(locale, value);
  return (
    <StayAppShell locale={locale} fullMap>
      <div className={styles.controls}>
        <details className={styles.filterMenu}>
          <summary>
            {locale === "es" ? "Buscar y filtrar" : "Search & filters"}
            {type !== "all" &&
              ` · ${t(stayTypeNames[type as keyof typeof stayTypeNames])}`}
          </summary>
          <div className={styles.filterPanel}>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setSearch(query.trim());
              }}
            >
              <label htmlFor="stay-map-search" className={styles.srOnly}>
                {t("Destination")}
              </label>
              <input
                id="stay-map-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("City, town or property")}
                maxLength={100}
              />
              <button type="submit">
                {locale === "es" ? "Buscar" : "Search"}
              </button>
            </form>
            <div
              role="group"
              aria-label={t("Property type")}
              className={styles.types}
            >
              {[["all", "All stays"], ...Object.entries(stayTypeNames)].map(
                ([key, name]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={type === key}
                    onClick={() => setType(key)}
                  >
                    {t(name)}
                  </button>
                ),
              )}
            </div>
          </div>
        </details>
      </div>
      <ProductionMap
        locale={locale}
        points={[]}
        styleUrl={config.mapStyleUrl}
        center={{ latitude: 36.72, longitude: -4.42 }}
        initialVertical="accommodation"
        showVerticalTabs={false}
        fullScreen
        venueDestination="akiduermo"
        stayFilters={{ type, q: search }}
      />
    </StayAppShell>
  );
}
