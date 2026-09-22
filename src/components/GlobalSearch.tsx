"use client";
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "./Icons";
import { SpainLocationPicker } from "./SpainLocationPicker";
import { UseMyLocation } from "./UseMyLocation";
import { VenueQuickSearch } from "./VenueQuickSearch";
import { discoveryLocationFromQuery } from "@/lib/discovery-location";
import { msg } from "@/lib/messages";
import type { Locale } from "@/lib/config";

const subscribeToHydration = () => () => {};

export function GlobalSearch({ locale }: { locale: Locale }) {
  // Native popovers can open before React hydrates. Enable search only when
  // the visible filters have their navigation handlers attached.
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const panel = useRef<HTMLDivElement>(null);
  const previousPathname = useRef(pathname);
  const [moreOpen, setMoreOpen] = useState(false);
  const es = locale === "es";
  const targetPath = pathname === `/${locale}/map` ? pathname : `/${locale}`;
  // Bind to the actual mounted form, including every keyed replacement.
  // An ID lookup in a sibling effect can retain a detached form after hydration.
  const bindFilters = useCallback(
    (form: HTMLFormElement | null) => {
      if (!form) return;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const update = () => {
        clearTimeout(timer);
        delete form.dataset.autoSubmitReady;
        timer = setTimeout(() => {
          const params = new URLSearchParams();
          for (const [key, value] of new FormData(form)) {
            if (typeof value === "string" && value !== "")
              params.append(key, value);
          }
          startTransition(() =>
            router.replace(`${targetPath}?${params}`, { scroll: false }),
          );
        }, 120);
      };
      const submit = (event: Event) => {
        event.preventDefault();
        update();
      };
      form.addEventListener("change", update);
      form.addEventListener("akipasa:filters-change", update);
      form.addEventListener("submit", submit);
      form.dataset.autoSubmitReady = "true";
      return () => {
        clearTimeout(timer);
        delete form.dataset.autoSubmitReady;
        form.removeEventListener("change", update);
        form.removeEventListener("akipasa:filters-change", update);
        form.removeEventListener("submit", submit);
      };
    },
    [router, targetPath],
  );
  const query = Object.fromEntries(searchParams);
  const m = msg(locale);
  const {
    locality,
    name: localityName,
    center: searchCenter,
  } = discoveryLocationFromQuery(query, locale);
  const requestedRadius = Number(query.radius || 25);
  const radius = [5, 15, 25, 50, 100].includes(requestedRadius)
    ? requestedRadius
    : 25;
  const time = ["now", "tonight", "tomorrow", "weekend", "all"].includes(
    query.time,
  )
    ? query.time
    : "all";
  const category = query.category;
  const price = query.price;
  const priceValue = (value: string | undefined) =>
    value && Number.isFinite(Number(value)) && Number(value) >= 0
      ? Math.round(Number(value) * 100)
      : undefined;
  const minPriceCents = priceValue(query.minPrice);
  const maxPriceCents = priceValue(query.maxPrice);
  const accessible = query.accessible === "on";
  useEffect(() => {
    if (previousPathname.current !== pathname) panel.current?.hidePopover();
    previousPathname.current = pathname;
  }, [pathname]);
  return (
    <>
      <button
        className="app-icon-button global-search-trigger"
        type="button"
        disabled={!hydrated}
        popoverTarget="site-search-panel"
        aria-label={es ? "Buscar en AkiPasa" : "Search AkiPasa"}
        title={es ? "Buscar en AkiPasa" : "Search AkiPasa"}
      >
        <Icon name="search" />
      </button>
      <div
        ref={panel}
        id="site-search-panel"
        className="global-search-panel"
        popover="auto"
        role="search"
        aria-label={es ? "Buscar en AkiPasa" : "Search AkiPasa"}
      >
        <div className="global-search-heading">
          <div>
            <span className="eyebrow">
              {es ? "Busca. Filtra. Encuentra." : "Search. Filter. Go."}
            </span>
            <h2>{es ? "Buscar en AkiPasa" : "Search AkiPasa"}</h2>
          </div>
          <button
            type="button"
            className="app-icon-button"
            popoverTarget="site-search-panel"
            popoverTargetAction="hide"
            aria-label={es ? "Cerrar búsqueda" : "Close search"}
          >
            <Icon name="close" />
          </button>
        </div>

        <VenueQuickSearch locale={locale} />

        <p className="global-search-hint">
          {es
            ? "O usa los filtros para descubrir planes por zona, fecha y categoría."
            : "Or use the filters to discover plans by area, date and category."}
        </p>
        <form
          ref={bindFilters}
          id="global-search-filters"
          className="filters-shell"
          method="get"
          action={targetPath}
          key={[
            locality,
            searchCenter.latitude,
            searchCenter.longitude,
            radius,
            time,
            category || "any",
            price || "any",
            minPriceCents ?? "",
            maxPriceCents ?? "",
            String(query.dateFrom || ""),
            String(query.dateTo || ""),
            accessible,
          ].join("-")}
        >
          <details className="filter-group filter-group-primary" open>
            <summary className="filter-summary">
              <span>
                {locale === "es" ? "Filtros rápidos" : "Quick filters"}
              </span>
              <span className="filter-summary-caption">
                {locale === "es"
                  ? "Ajusta tu búsqueda en segundos"
                  : "Adjust your discovery in seconds"}
              </span>
            </summary>
            <div className="filter-grid">
              <div className="field location-filter-field">
                <SpainLocationPicker
                  locale={locale}
                  defaultName={localityName}
                  defaultLocality={locality}
                  defaultLatitude={searchCenter.latitude}
                  defaultLongitude={searchCenter.longitude}
                />
                <UseMyLocation locale={locale} targetPath={targetPath} />
              </div>
              <div className="field">
                <label htmlFor="global-radius">{m.radius}</label>
                <select
                  id="global-radius"
                  name="radius"
                  defaultValue={String(radius)}
                >
                  {[5, 15, 25, 50, 100].map((v) => (
                    <option key={v} value={v}>
                      {v} km
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="global-time">{m.time}</label>
                <select id="global-time" name="time" defaultValue={time}>
                  {(
                    ["now", "tonight", "tomorrow", "weekend", "all"] as const
                  ).map((v) => (
                    <option key={v} value={v}>
                      {m[v]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="global-category">{m.category}</label>
                <select
                  id="global-category"
                  name="category"
                  defaultValue={category || "any"}
                >
                  <option value="any">{m.any}</option>
                  <option value="music">{m.music}</option>
                  <option value="social">{m.social}</option>
                  <option value="workshop">{m.workshop}</option>
                  <option value="culture">{m.culture}</option>
                  <option value="market">{m.market}</option>
                  <option value="food">{m.food}</option>
                </select>
              </div>
            </div>
          </details>
          <details
            className="filter-group"
            open={moreOpen}
            onToggle={(event) => setMoreOpen(event.currentTarget.open)}
          >
            <summary className="filter-summary">
              <span>{locale === "es" ? "Más filtros" : "More filters"}</span>
              <span className="filter-summary-caption">
                {locale === "es"
                  ? "Precio, fechas y accesibilidad"
                  : "Price, dates and accessibility"}
              </span>
            </summary>
            <div className="filter-grid filter-grid-secondary">
              <div className="field">
                <label htmlFor="global-minPrice">{m.minimumPrice}</label>
                <input
                  id="global-minPrice"
                  name="minPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={
                    minPriceCents === undefined ? "" : minPriceCents / 100
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="global-maxPrice">{m.maximumPrice}</label>
                <input
                  id="global-maxPrice"
                  name="maxPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={
                    maxPriceCents === undefined ? "" : maxPriceCents / 100
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="global-price">{m.price}</label>
                <select
                  id="global-price"
                  name="price"
                  defaultValue={price || "any"}
                >
                  <option value="any">{m.any}</option>
                  <option value="free">{m.free}</option>
                  <option value="paid">{m.paid}</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="global-dateFrom">{m.dateFrom}</label>
                <input
                  id="global-dateFrom"
                  name="dateFrom"
                  type="date"
                  defaultValue={
                    typeof query.dateFrom === "string" ? query.dateFrom : ""
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="global-dateTo">{m.dateTo}</label>
                <input
                  id="global-dateTo"
                  name="dateTo"
                  type="date"
                  defaultValue={
                    typeof query.dateTo === "string" ? query.dateTo : ""
                  }
                />
              </div>
              <label className="field checkbox-field">
                <input
                  name="accessible"
                  type="checkbox"
                  defaultChecked={accessible}
                />
                <span>{m.accessibleOnly}</span>
              </label>
            </div>
          </details>
        </form>
      </div>
    </>
  );
}
