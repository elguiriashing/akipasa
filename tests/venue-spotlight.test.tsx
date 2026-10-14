// @vitest-environment jsdom
/* eslint-disable @next/next/no-html-link-for-pages -- These plain fixture anchors stand in for server-rendered slot content. */

import React from "react";
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { VenueSpotlightSections } from "../src/components/VenueSpotlightSections";
import {
  blankCatalogue,
  blankCatalogueItem,
  type VenueCatalogueDocument,
} from "../src/lib/venue-catalogue";

afterEach(cleanup);

function menu(): VenueCatalogueDocument {
  const burger = {
    ...blankCatalogueItem(),
    visible: true,
    id: "burger",
    name: { es: "Hamburguesa de la casa", en: "House burger" },
    kind: "food" as const,
    priceCents: 1250,
    mediaId: "burger-photo",
  };
  burger.allergens.states.gluten = "contains";
  const shake = {
    ...blankCatalogueItem(),
    visible: true,
    id: "shake",
    name: { es: "Batido de vainilla", en: "Vanilla milkshake" },
    kind: "drink" as const,
    priceCents: 550,
    mediaId: "shake-photo",
  };
  shake.allergens.states.milk = "contains";
  return {
    ...blankCatalogue("en"),
    sections: [
      {
        id: "burgers",
        title: { es: "Hamburguesas", en: "Burgers" },
        items: [
          burger,
          {
            ...burger,
            id: "hidden-burger",
            visible: false,
            name: { es: "Privado", en: "Private" },
          },
        ],
      },
      {
        id: "shakes",
        title: { es: "Batidos", en: "Shakes" },
        items: [shake],
      },
      {
        id: "unpublished-items",
        title: { es: "Sin publicar", en: "Unpublished items" },
        items: [{ ...burger, id: "private", visible: false }],
      },
    ],
  };
}

function props(locale: "en" | "es" = "en") {
  return {
    locale,
    catalogueDocument: menu(),
    media: [
      { id: "burger-photo", url: "/burger.png", alt: "Burger photo" },
      { id: "shake-photo", url: "/shake.png", alt: "Milkshake photo" },
      { id: "unused", url: "/private.png", alt: "Unused library photo" },
    ],
    events: [1, 2, 3].map((number) => (
      <a
        key={number}
        className="venue-spotlight-event"
        href={`/en/events/event-${number}`}
      >
        Event {number}
      </a>
    )),
    eventCount: 3,
    information: (
      <section>
        <h2>About this venue</h2>
        <a href="tel:+34950000000">Call the venue</a>
        <label>
          Local draft
          <input defaultValue="Keep this" />
        </label>
      </section>
    ),
    extras: <a href="/en/passports">Passport progress</a>,
    hasExtras: true,
  };
}

describe("Aki Spotlight venue sections", () => {
  it.each(["en", "es"] as const)(
    "opens the selected published menu section and retains its actual prices and allergen details (%s)",
    (locale) => {
      const { container } = render(
        <VenueSpotlightSections {...props(locale)} />,
      );
      const details = container.querySelector(".venue-spotlight-menu-details")!;
      expect(details).not.toHaveAttribute("open");
      const shake = screen.getByRole("button", {
        name: locale === "es" ? /Batidos.*1 opción/ : /Shakes.*1 item/,
      });
      fireEvent.click(shake);
      expect(shake).toHaveAttribute("aria-expanded", "true");
      expect(details).toHaveAttribute("open");
      expect(
        within(details as HTMLElement).getByText(
          locale === "es" ? "Batido de vainilla" : "Vanilla milkshake",
        ),
      ).toBeVisible();
      expect(
        details.querySelector(".public-catalogue-price")?.textContent,
      ).toBe(
        (5.5).toLocaleString(locale, { style: "currency", currency: "EUR" }),
      );
      const allergenSummary = within(details as HTMLElement).getByText(
        locale === "es" ? "Alérgenos e información" : "Allergens & info",
      );
      fireEvent.click(allergenSummary);
      expect(
        within(details as HTMLElement).getByText(
          locale === "es" ? "Leche" : "Milk",
        ),
      ).toBeVisible();
      expect(
        screen.queryByRole("button", {
          name: /Unpublished items|Sin publicar/,
        }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Private")).not.toBeInTheDocument();
      expect(
        screen.queryByAltText("Unused library photo"),
      ).not.toBeInTheDocument();
    },
  );

  it("keeps menu selection and other mounted content when navigating with keyboard tabs", () => {
    const { container } = render(<VenueSpotlightSections {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: /Shakes.*1 item/ }));
    const menuTab = screen.getByRole("tab", { name: "Menu" });
    fireEvent.keyDown(menuTab, { key: "ArrowRight" });
    const eventTab = screen.getByRole("tab", { name: "Events 3" });
    expect(eventTab).toHaveFocus();
    expect(eventTab).toHaveAttribute("aria-selected", "true");
    expect(
      within(screen.getByRole("tabpanel")).getAllByRole("link"),
    ).toHaveLength(3);

    fireEvent.keyDown(eventTab, { key: "ArrowRight" });
    const informationTab = screen.getByRole("tab", { name: "Information" });
    expect(informationTab).toHaveFocus();
    fireEvent.change(screen.getByLabelText("Local draft"), {
      target: { value: "Still here" },
    });
    fireEvent.keyDown(informationTab, { key: "End" });
    expect(screen.getByRole("tab", { name: "Perks" })).toHaveFocus();
    expect(
      screen.getByRole("link", { name: "Passport progress" }),
    ).toBeVisible();
    fireEvent.keyDown(screen.getByRole("tab", { name: "Perks" }), {
      key: "Home",
    });
    expect(menuTab).toHaveFocus();
    expect(
      container.querySelector(".venue-spotlight-menu-details"),
    ).toHaveAttribute("open");
    expect(
      screen.getByRole("button", { name: /Shakes.*1 item/ }),
    ).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(informationTab);
    expect(screen.getByLabelText("Local draft")).toHaveValue("Still here");
  });

  it("opens all upcoming events from the overview and preserves event destinations", () => {
    render(<VenueSpotlightSections {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: "View all" }));
    expect(screen.getByRole("tab", { name: "Events 3" })).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveAttribute(
      "aria-labelledby",
      screen.getByRole("tab", { name: "Events 3" }).id,
    );
    expect(screen.getByRole("link", { name: "Event 3" })).toHaveAttribute(
      "href",
      "/en/events/event-3",
    );
  });

  it("opens useful information for an empty venue without inventing menu, events or hours", () => {
    render(
      <VenueSpotlightSections
        {...props("es")}
        catalogueDocument={null}
        eventCount={0}
        events={null}
        hasExtras={false}
      />,
    );
    expect(screen.getAllByRole("tab")).toHaveLength(1);
    expect(screen.getByRole("tab", { name: "Información" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("link", { name: "Call the venue" })).toBeVisible();
    expect(
      screen.queryByText(/Horarios|Abierto|Opening hours/),
    ).not.toBeInTheDocument();
  });
});
