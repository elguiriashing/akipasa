// @vitest-environment jsdom
import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("../src/app/[locale]/business/venue/[id]/premium-actions", () => ({
  setMediaFolder: vi.fn(),
}));

vi.mock("../src/app/[locale]/business/venue/[id]/actions", () => ({
  addStayHeaderPhoto: vi.fn(async () => ({ ok: true })),
  clearVenueMediaPlacement: vi.fn(),
  removeStayHeaderPhoto: vi.fn(async () => ({ ok: true })),
  removeVenueImage: vi.fn(),
  setVenueMediaPlacement: vi.fn(),
}));
import { VenueMediaStudio } from "../src/components/VenueMediaStudio";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

it.each(["es", "en"] as const)(
  "uploads a selected image through the same-origin endpoint in %s",
  async (locale) => {
    vi.stubGlobal("File", window.File);
    const BrowserFormData = window.FormData;
    const file = new File(["logo"], "logo.png", { type: "image/png" });
    vi.stubGlobal(
      "FormData",
      class extends BrowserFormData {
        constructor(form?: HTMLFormElement) {
          super();
          if (form) {
            this.set("image", file);
            this.set("alt", "");
          }
        }
      },
    );
    const fetch = vi.fn(async (_url: string, options: RequestInit) => {
      const data = options.body as FormData;
      expect(data.get("inline")).toBe("1");
      expect((data.get("image") as File).name).toBe("logo.png");
      return {
        json: async () => ({
          ok: true,
          media: {
            id: "media-1",
            url: "https://example.test/signed",
            alt: "Logo",
            sizeBytes: 4,
          },
        }),
      };
    });
    vi.stubGlobal("fetch", fetch);
    const { container } = render(
      <VenueMediaStudio
        locale={locale}
        venueId="8c1cf670-18c7-4dac-8c4b-bbc9b6ff05a3"
        media={[]}
        placements={{}}
      />,
    );
    const input = container.querySelector('input[type="file"]')!;
    fireEvent.change(input, {
      target: {
        files: [file],
      },
    });
    const form = input.closest("form")!;
    form.reportValidity = () => true;
    fireEvent.submit(form);
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(fetch).toHaveBeenCalledWith(
      "/api/business/venue-media",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    );
    await waitFor(() =>
      expect(screen.getAllByAltText("Logo").length).toBeGreaterThan(0),
    );
  },
);

it("keeps the accommodation bin private until a photo is assigned to the header", async () => {
  const actions = await import(
    "../src/app/[locale]/business/venue/[id]/actions"
  );
  const photo = {
    id: "photo-1",
    url: "https://example.test/photo.jpg",
    alt: "Room",
    sizeBytes: 1024,
  };
  render(
    <VenueMediaStudio
      locale="en"
      venueId="8c1cf670-18c7-4dac-8c4b-bbc9b6ff05a3"
      media={[photo]}
      placements={{}}
      accommodation
      stayHeaderIds={[]}
    />,
  );
  expect(screen.getByText("No public header photos yet.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Add Room to header" }));
  await waitFor(() =>
    expect(actions.addStayHeaderPhoto).toHaveBeenCalledOnce(),
  );
  expect(screen.queryByText("No public header photos yet.")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Remove from header" }));
  await waitFor(() =>
    expect(actions.removeStayHeaderPhoto).toHaveBeenCalledOnce(),
  );
  expect(screen.getByText("No public header photos yet.")).toBeTruthy();
});

it.each(["en", "es"] as const)(
  "keeps the %s picker keyboard focus inside and restores its specific trigger",
  (locale) => {
    render(
      <VenueMediaStudio
        locale={locale}
        venueId="test"
        media={[
          {
            id: "one",
            url: "https://example.test/one.jpg",
            alt: "Room",
            sizeBytes: 1,
            folder: "Rooms",
          },
        ]}
        placements={{}}
      />,
    );
    const es = locale === "es";
    const trigger = screen.getByRole("button", {
      name: es
        ? "Elegir imagen: Banner del local"
        : "Choose image: Venue banner",
    });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog");
    expect(document.activeElement).toBe(within(dialog).getByRole("searchbox"));
    const close = within(dialog).getByRole("button", {
      name: es ? "Cerrar" : "Close",
    });
    const automatic = within(dialog).getByRole("button", {
      name: es ? "Usar automático" : "Use automatic",
    });
    automatic.focus();
    fireEvent.keyDown(automatic, { key: "Tab" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(automatic);
    trigger.focus();
    expect(dialog.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  },
);

it("keeps search/folders outside the scrollable results and resets folder between slots", () => {
  render(
    <VenueMediaStudio
      locale="en"
      venueId="test"
      media={[
        {
          id: "one",
          url: "https://example.test/one.jpg",
          alt: "Room",
          sizeBytes: 1,
          folder: "Rooms",
        },
        {
          id: "two",
          url: "https://example.test/two.jpg",
          alt: "Food",
          sizeBytes: 1,
          folder: "Menu",
        },
      ]}
      placements={{}}
    />,
  );
  const trigger = screen.getByRole("button", {
    name: "Choose image: Venue banner",
  });
  fireEvent.click(trigger);
  let dialog = screen.getByRole("dialog");
  expect(Array.from(dialog.children).map((child) => child.tagName)).toEqual([
    "HEADER",
    "DIV",
    "DIV",
    "FOOTER",
  ]);
  fireEvent.change(within(dialog).getByRole("combobox"), {
    target: { value: "Rooms" },
  });
  expect(
    within(dialog).queryByRole("button", { name: "Food Food" }),
  ).toBeNull();
  fireEvent.change(within(dialog).getByRole("searchbox"), {
    target: { value: "nothing" },
  });
  expect(
    within(dialog).getByText("No images available.").parentElement?.className,
  ).toBe("event-media-modal-grid");
  fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
  expect(document.activeElement).toBe(trigger);
  fireEvent.click(screen.getByRole("button", { name: "Choose image: Menu" }));
  dialog = screen.getByRole("dialog");
  expect(
    (within(dialog).getByRole("combobox") as HTMLSelectElement).value,
  ).toBe("");
  expect(
    (within(dialog).getByRole("searchbox") as HTMLInputElement).value,
  ).toBe("");
  expect(within(dialog).getAllByRole("img")).toHaveLength(2);
});
