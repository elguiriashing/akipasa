// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("../src/app/[locale]/business/venue/[id]/actions", () => ({
  addStayHeaderPhoto: vi.fn(),
  clearVenueMediaPlacement: vi.fn(async () => ({ ok: true })),
  removeStayHeaderPhoto: vi.fn(),
  removeVenueImage: vi.fn(),
  setVenueMediaPlacement: vi.fn(async () => ({ ok: true })),
}));
vi.mock("../src/app/[locale]/business/venue/[id]/premium-actions", () => ({
  setMediaFolder: vi.fn(),
}));
vi.mock("../src/components/SafeMediaFileInput", () => ({
  SafeMediaFileInput: () => <input type="file" />,
}));
import { VenueMediaStudio } from "../src/components/VenueMediaStudio";

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

it.each(["en", "es"] as const)(
  "contains picker keyboard focus and restores the %s slot opener",
  (locale) => {
    render(
      <VenueMediaStudio
        locale={locale}
        venueId="venue-1"
        media={Array.from({ length: 13 }, (_, index) => ({
          id: `media-${index}`,
          url: `https://example.test/${index}.jpg`,
          alt: `Image ${index}`,
          sizeBytes: 100,
          folder: "Events",
        }))}
        placements={{}}
      />,
    );
    const opener = screen.getByRole("button", {
      name:
        locale === "es"
          ? "Elegir imagen: Perfil / logo"
          : "Choose image: Profile / logo",
    });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog");
    const search = within(dialog).getByRole("searchbox");
    expect(document.activeElement).toBe(search);
    const close = within(dialog).getByRole("button", {
      name: locale === "es" ? "Cerrar" : "Close",
    });
    close.focus();
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    const next = within(dialog).getByRole("button", {
      name: locale === "es" ? "Página siguiente" : "Next page",
    });
    expect(document.activeElement).toBe(next);
    fireEvent.keyDown(next, { key: "Tab" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  },
);

it.each(["en", "es"] as const)(
  "keeps empty/folder search and placement in the %s picker",
  async (locale) => {
    render(
      <VenueMediaStudio
        locale={locale}
        venueId="venue-1"
        placements={{}}
        media={[
          {
            id: "photo-1",
            url: "https://example.test/room.jpg",
            alt: "Room",
            sizeBytes: 100,
            folder: "Rooms",
          },
          {
            id: "photo-2",
            url: "https://example.test/logo.jpg",
            alt: "Logo",
            sizeBytes: 100,
            folder: "Logos",
          },
        ]}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name:
          locale === "es"
            ? "Elegir imagen: Perfil / logo"
            : "Choose image: Profile / logo",
      }),
    );
    const dialog = screen.getByRole("dialog");
    const gallery = dialog.querySelector(".event-media-modal-grid")!;
    fireEvent.change(within(dialog).getByRole("searchbox"), {
      target: { value: "missing" },
    });
    expect(
      within(dialog).getByText(
        locale === "es"
          ? "No hay imágenes disponibles."
          : "No images available.",
      ).parentElement,
    ).toBe(gallery);
    fireEvent.change(within(dialog).getByRole("searchbox"), {
      target: { value: "" },
    });
    fireEvent.change(within(dialog).getByRole("combobox"), {
      target: { value: "Rooms" },
    });
    expect(within(dialog).queryByRole("button", { name: "Logo" })).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Room Room" }));
    const actions = await import(
      "../src/app/[locale]/business/venue/[id]/actions"
    );
    expect(actions.setVenueMediaPlacement).toHaveBeenCalledOnce();
    const submitted = vi.mocked(actions.setVenueMediaPlacement).mock
      .calls[0][0];
    expect(submitted.get("mediaId")).toBe("photo-1");
    expect(submitted.get("placement")).toBe("venue_profile");
  },
);
