// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("../src/app/[locale]/business/venue/[id]/actions", () => ({
  addStayHeaderPhoto: vi.fn(async () => ({ ok: true })),
  clearVenueMediaPlacement: vi.fn(),
  removeStayHeaderPhoto: vi.fn(async () => ({ ok: true })),
  removeVenueImage: vi.fn(),
  setVenueMediaPlacement: vi.fn(),
}));
import { VenueMediaStudio } from "../src/components/VenueMediaStudio";

afterEach(() => {
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
