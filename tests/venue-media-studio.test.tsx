// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("../src/app/[locale]/business/venue/[id]/actions", () => ({
  clearVenueMediaPlacement: vi.fn(),
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
