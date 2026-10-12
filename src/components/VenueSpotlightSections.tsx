/* eslint-disable @next/next/no-img-element -- Catalogue images are signed venue media. */
"use client";

import React, { useId, useState, type ReactNode } from "react";
import { Icon } from "./Icons";
import { PublicVenueCatalogue } from "./PublicVenueCatalogue";
import {
  catalogueTextForDisplay,
  type VenueCatalogueDocument,
} from "../lib/venue-catalogue";

type CatalogueMedia = { id: string; url: string; alt: string };
type VenueTab = "menu" | "events" | "information" | "extras";

/** Public content is supplied by the existing server loader. Tabs only change
 * presentation; booking, follow, catalogue publication and offer access remain
 * with their existing server boundaries. */
export function VenueSpotlightSections({
  locale,
  catalogueDocument,
  media = [],
  menuImage,
  events,
  eventCount,
  information,
  extras,
  hasExtras = false,
}: {
  locale: "es" | "en";
  catalogueDocument: VenueCatalogueDocument | null;
  media?: CatalogueMedia[];
  menuImage?: CatalogueMedia;
  events: ReactNode;
  eventCount: number;
  information: ReactNode;
  extras?: ReactNode;
  hasExtras?: boolean;
}) {
  const es = locale === "es";
  const id = useId();
  const sections =
    catalogueDocument?.sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.visible !== false),
      }))
      .filter((section) => section.items.length > 0) || [];
  const hasMenu = sections.length > 0;
  const tabs: Array<{ id: VenueTab; label: string }> = [
    ...(hasMenu ? [{ id: "menu" as const, label: es ? "Carta" : "Menu" }] : []),
    ...(eventCount > 0
      ? [{ id: "events" as const, label: es ? "Eventos" : "Events" }]
      : []),
    { id: "information", label: es ? "Información" : "Information" },
    ...(hasExtras
      ? [{ id: "extras" as const, label: es ? "Ventajas" : "Perks" }]
      : []),
  ];
  const [selectedTab, setSelectedTab] = useState<VenueTab>(tabs[0].id);
  const activeTab = tabs.some((tab) => tab.id === selectedTab)
    ? selectedTab
    : tabs[0].id;
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const activeSection =
    sections.find((section) => section.id === selectedSection) || sections[0];

  function selectTab(tab: VenueTab, focus = false) {
    setSelectedTab(tab);
    if (focus) document.getElementById(`${id}-tab-${tab}`)?.focus();
  }

  return (
    <section className="venue-spotlight-content">
      <div
        className="venue-spotlight-tabs"
        role="tablist"
        aria-label={es ? "Explorar el local" : "Explore the venue"}
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            id={`${id}-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`${id}-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => selectTab(tab.id)}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % tabs.length
                  : event.key === "ArrowLeft"
                    ? (index - 1 + tabs.length) % tabs.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? tabs.length - 1
                        : null;
              if (next !== null) {
                event.preventDefault();
                selectTab(tabs[next].id, true);
              }
            }}
          >
            {tab.label}
            {tab.id === "events" && <span>{eventCount}</span>}
          </button>
        ))}
      </div>

      {hasMenu && catalogueDocument && (
        <div
          id={`${id}-panel-menu`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-menu`}
          tabIndex={0}
          hidden={activeTab !== "menu"}
          className="venue-spotlight-panel"
        >
          <div
            className={[
              "venue-spotlight-overview",
              eventCount > 0 && "has-events",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="venue-spotlight-menu">
              <div className="venue-spotlight-section-heading">
                <h2>
                  {catalogueTextForDisplay(
                    catalogueDocument.title,
                    locale,
                    "general",
                  ) || (es ? "Carta y catálogo" : "Menu & catalogue")}
                </h2>
                <span className="venue-spotlight-section-caption">
                  {es ? "Elige una sección" : "Pick a section"}
                </span>
              </div>
              <div className="venue-spotlight-categories">
                {sections.map((section) => {
                  const sectionMedia = section.items
                    .map((item) =>
                      media.find((image) => image.id === item.mediaId),
                    )
                    .find(Boolean);
                  const title = catalogueTextForDisplay(
                    section.title,
                    locale,
                    "section_title",
                  );
                  return (
                    <button
                      className={[
                        "venue-spotlight-category",
                        sectionMedia && "has-image",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      type="button"
                      key={section.id}
                      aria-expanded={selectedSection === section.id}
                      aria-controls={`${id}-menu-items`}
                      onClick={() => setSelectedSection(section.id)}
                    >
                      <span className="venue-spotlight-category-art">
                        {sectionMedia ? (
                          <img
                            src={sectionMedia.url}
                            alt={sectionMedia.alt}
                            loading="lazy"
                          />
                        ) : (
                          <Icon name="venue" size={32} />
                        )}
                      </span>
                      <span className="venue-spotlight-category-label">
                        <span>
                          <strong>{title}</strong>
                          <small>
                            {section.items.length}{" "}
                            {section.items.length === 1
                              ? es
                                ? "opción"
                                : "item"
                              : es
                                ? "opciones"
                                : "items"}
                          </small>
                        </span>
                        <Icon name="chevron" size={18} />
                      </span>
                    </button>
                  );
                })}
              </div>

              <details
                id={`${id}-menu-items`}
                className="venue-spotlight-menu-details"
                open={selectedSection !== null}
                onToggle={(event) => {
                  if (!event.currentTarget.open) setSelectedSection(null);
                  else if (selectedSection === null)
                    setSelectedSection(sections[0].id);
                }}
              >
                <summary>
                  {es ? "Explorar la carta" : "Explore the menu"}
                  <Icon name="chevron" size={18} />
                </summary>
                <PublicVenueCatalogue
                  key={activeSection.id}
                  locale={locale}
                  document={{
                    ...catalogueDocument,
                    sections: [activeSection],
                  }}
                  media={media}
                  heroMedia={menuImage}
                />
              </details>
            </div>

            {eventCount > 0 && (
              <aside className="venue-spotlight-next-events">
                <div className="venue-spotlight-section-heading">
                  <h2>{es ? "Próximos eventos" : "Coming up"}</h2>
                  <button
                    type="button"
                    className="venue-spotlight-text-link"
                    onClick={() => selectTab("events", true)}
                  >
                    {es ? "Ver todos" : "View all"}
                    <Icon name="arrow-right" size={15} />
                  </button>
                </div>
                <div className="venue-spotlight-events is-preview">
                  {events}
                </div>
              </aside>
            )}
          </div>
        </div>
      )}

      {eventCount > 0 && (
        <div
          id={`${id}-panel-events`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-events`}
          tabIndex={0}
          hidden={activeTab !== "events"}
          className="venue-spotlight-panel"
        >
          <div className="venue-spotlight-section-heading">
            <h2>{es ? "Próximos eventos" : "Upcoming events"}</h2>
          </div>
          <div className="venue-spotlight-events is-full">{events}</div>
        </div>
      )}

      <div
        id={`${id}-panel-information`}
        role="tabpanel"
        aria-labelledby={`${id}-tab-information`}
        tabIndex={0}
        hidden={activeTab !== "information"}
        className="venue-spotlight-panel"
      >
        {information}
      </div>

      {hasExtras && (
        <div
          id={`${id}-panel-extras`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-extras`}
          tabIndex={0}
          hidden={activeTab !== "extras"}
          className="venue-spotlight-panel"
        >
          {extras}
        </div>
      )}
    </section>
  );
}
