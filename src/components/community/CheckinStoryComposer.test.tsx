// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { freshGeo, qualityCheck } = vi.hoisted(() => ({
  freshGeo: vi.fn(),
  qualityCheck: vi.fn(),
}));
vi.mock("@/lib/community-stories/photo-quality", () => ({
  checkPhotoQuality: qualityCheck,
}));
vi.mock("./StoryCamera", async (original) => {
  const actual = await original<typeof import("./StoryCamera")>();
  return {
    ...actual,
    freshStoryLocation: freshGeo,
    StoryCamera: ({
      onCapture,
      facing,
      disabled,
    }: {
      onCapture: (file: File) => void;
      facing: string;
      disabled: boolean;
    }) => (
      <button
        type="button"
        disabled={disabled}
        data-facing={facing}
        onClick={() =>
          onCapture(
            new File(["fresh camera pixels"], "fresh.jpg", {
              type: "image/jpeg",
            }),
          )
        }
      >
        Capture fixture photo
      </button>
    ),
  };
});
import {
  CheckinStoryComposer,
  prepareCheckinStoryPhoto,
} from "./CheckinStoryComposer";
const checkInId = "00000000-0000-4000-8000-000000000001";
const fetcher = vi.fn();
const closeBitmap = vi.fn();
const drawImage = vi.fn();
const fillRect = vi.fn();
const bitmap = vi.fn();
const createUrl = vi.fn();
const revokeUrl = vi.fn();
let encoding: Blob | null;
let canvasSize: [number, number];
beforeEach(() => {
  vi.clearAllMocks();
  freshGeo.mockImplementation(async () => ({
    latitude: 36.54,
    longitude: -4.62,
    accuracy: 10,
    locatedAt: Date.now(),
  }));
  qualityCheck.mockResolvedValue(null);
  encoding = new Blob(
    [
      new Uint8Array([
        82, 73, 70, 70, 16, 0, 0, 0, 87, 69, 66, 80, 86, 80, 56, 32, 4, 0, 0, 0,
        1, 2, 3, 4,
      ]),
    ],
    { type: "image/webp" },
  );
  bitmap.mockResolvedValue({ width: 4000, height: 3000, close: closeBitmap });
  vi.stubGlobal("createImageBitmap", bitmap);
  vi.stubGlobal("fetch", fetcher);
  createUrl.mockImplementation(
    () => `blob:sanitized-${createUrl.mock.calls.length}`,
  );
  URL.createObjectURL = createUrl;
  URL.revokeObjectURL = revokeUrl;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    fillStyle: "",
    fillRect,
    drawImage,
    getImageData: () => ({
      data: new Uint8ClampedArray(4),
      width: 640,
      height: 480,
    }),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
    this: HTMLCanvasElement,
    callback,
  ) {
    canvasSize = [this.width, this.height];
    callback(encoding);
  });
  fetcher.mockResolvedValue({
    ok: true,
    status: 201,
    json: async () => ({
      moderation: "manual",
      story: {
        id: "opaque-story-id",
        status: "pending",
        expiresAt: "2026-11-01T12:00:00Z",
      },
    }),
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const photo = () =>
  new File(["original-private-EXIF-GPS"], "private-location-name.jpg", {
    type: "image/jpeg",
  });
async function choose() {
  fireEvent.click(
    screen.getByRole("button", { name: "Capture fixture photo" }),
  );
  await screen.findByAltText(
    /^(Preview of your chosen photo|Vista previa de la foto que has elegido)$/,
  );
}
describe("static opaque metadata-free image preparation", () => {
  it("flattens pixels, bounds dimensions and returns only new static WebP bytes", async () => {
    const file = await prepareCheckinStoryPhoto(photo());
    expect(canvasSize).toEqual([1280, 960]);
    expect(fillRect).toHaveBeenCalledWith(0, 0, 1280, 960);
    expect(drawImage).toHaveBeenCalledTimes(2);
    expect(closeBitmap).toHaveBeenCalledOnce();
    expect(file.name).toBe("checkin-story.webp");
    expect(file.type).toBe("image/webp");
    expect(file.size).toBe(encoding!.size);
    expect(file.size).not.toBe(photo().size);
  });
  it("removes encoder-added VP8X and ICCP while retaining only the static image chunk", async () => {
    const extended = new Uint8Array([
      82, 73, 70, 70, 44, 0, 0, 0, 87, 69, 66, 80, 86, 80, 56, 88, 10, 0, 0, 0,
      32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 73, 67, 67, 80, 2, 0, 0, 0, 1, 2, 86, 80,
      56, 32, 4, 0, 0, 0, 1, 2, 3, 4,
    ]);
    encoding = new Blob([extended], { type: "image/webp" });
    const output = await prepareCheckinStoryPhoto(photo());
    expect(output.size).toBe(24);
  });
  it.each(["ALPH", "ANIM", "ANMF", "JUNK"])(
    "rejects %s chunks instead of stripping unsafe content",
    async (chunk) => {
      const bytes = new Uint8Array([
        82,
        73,
        70,
        70,
        16,
        0,
        0,
        0,
        87,
        69,
        66,
        80,
        ...Array.from(chunk, (c) => c.charCodeAt(0)),
        4,
        0,
        0,
        0,
        1,
        2,
        3,
        4,
      ]);
      encoding = new Blob([bytes], { type: "image/webp" });
      await expect(prepareCheckinStoryPhoto(photo())).rejects.toThrow(
        "invalid_image",
      );
    },
  );
  it("uses a cleaned-up image fallback when createImageBitmap is unavailable", async () => {
    vi.stubGlobal("createImageBitmap", undefined);
    vi.stubGlobal(
      "Image",
      class {
        naturalWidth = 640;
        naturalHeight = 480;
        onload: (() => void) | null = null;
        set src(value: string) {
          if (value) queueMicrotask(() => this.onload?.());
        }
      },
    );
    const file = await prepareCheckinStoryPhoto(photo());
    expect(file.type).toBe("image/webp");
    expect(canvasSize).toEqual([640, 480]);
    expect(revokeUrl).toHaveBeenCalledWith("blob:sanitized-1");
  });
  it("does not upscale a small photo", async () => {
    bitmap.mockResolvedValue({ width: 640, height: 480, close: closeBitmap });
    await prepareCheckinStoryPhoto(photo());
    expect(canvasSize).toEqual([640, 480]);
  });
  it.each(["image/svg+xml", "image/gif", "text/plain"])(
    "rejects %s before decoding",
    async (type) => {
      await expect(
        prepareCheckinStoryPhoto(new File(["unsafe"], "unsafe", { type })),
      ).rejects.toThrow("invalid_image");
      expect(bitmap).not.toHaveBeenCalled();
    },
  );
  it("rejects input size caps before decode", async () => {
    const file = photo();
    Object.defineProperty(file, "size", { value: 10 * 1024 * 1024 + 1 });
    await expect(prepareCheckinStoryPhoto(file)).rejects.toThrow(
      "invalid_image",
    );
    expect(bitmap).not.toHaveBeenCalled();
  });
  it.each([null, new Blob(["fallback"], { type: "image/png" })])(
    "rejects failed or unsupported WebP encoders",
    async (blob) => {
      encoding = blob;
      await expect(prepareCheckinStoryPhoto(photo())).rejects.toThrow(
        "invalid_image",
      );
      expect(closeBitmap).toHaveBeenCalledOnce();
    },
  );
  it("rejects excessive decoded dimensions and releases bitmap", async () => {
    bitmap.mockResolvedValue({
      width: 20_000,
      height: 20_000,
      close: closeBitmap,
    });
    await expect(prepareCheckinStoryPhoto(photo())).rejects.toThrow(
      "invalid_image",
    );
    expect(closeBitmap).toHaveBeenCalledOnce();
    expect(drawImage).not.toHaveBeenCalled();
  });
  it("rejects an encoded upload over the server byte cap", async () => {
    encoding = new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], {
      type: "image/webp",
    });
    await expect(prepareCheckinStoryPhoto(photo())).rejects.toThrow(
      "invalid_image",
    );
  });
});
for (const locale of ["en", "es"] as const) {
  const submitLabel =
    locale === "es" ? "Enviar a revisión" : "Submit for review";
  it(`${locale} requires a prepared image and fresh unchecked public opt-in`, async () => {
    render(
      <CheckinStoryComposer
        locale={locale}
        checkInId={checkInId}
        venueName="Known venue"
      />,
    );
    const optIn = screen.getByRole("checkbox");
    expect(optIn).not.toBeChecked();
    expect(screen.getByRole("button", { name: submitLabel })).toBeDisabled();
    await choose();
    expect(optIn).not.toBeChecked();
    expect(fetcher).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Capture fixture photo" }),
    ).toHaveAttribute("data-facing", "environment");
    fireEvent.click(screen.getByLabelText("Selfie"));
    expect(
      screen.getByRole("button", { name: "Capture fixture photo" }),
    ).toHaveAttribute("data-facing", "user");
    fireEvent.click(optIn);
    expect(screen.getByRole("button", { name: submitLabel })).toBeEnabled();
  });
  it(`${locale} sends only sanitized explicit multipart fields and shows manual pending`, async () => {
    render(
      <CheckinStoryComposer
        locale={locale}
        checkInId={checkInId}
        venueName="Known venue"
      />,
    );
    await choose();
    fireEvent.click(
      screen.getByText(locale === "es" ? "Añadir texto" : "Add caption"),
    );
    fireEvent.change(
      screen.getByLabelText(
        locale === "es" ? "Texto (opcional)" : "Caption (optional)",
      ),
      { target: { value: "  My moment  " } },
    );
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: submitLabel }));
    await screen.findByText(
      locale === "es" ? "Pendiente de revisión" : "Awaiting review",
    );
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe("/api/community/stories");
    expect(options.method).toBe("POST");
    expect(options.credentials).toBe("same-origin");
    expect(options.headers).toBeUndefined();
    const form = options.body as FormData;
    expect([...form.keys()].sort()).toEqual([
      "accuracy",
      "caption",
      "checkInId",
      "file",
      "kind",
      "latitude",
      "locatedAt",
      "longitude",
      "publicOptIn",
    ]);
    expect(form.get("checkInId")).toBe(checkInId);
    expect(form.get("publicOptIn")).toBe("true");
    expect(form.get("caption")).toBe("My moment");
    expect((form.get("file") as File).name).toBe("checkin-story.webp");
    expect((form.get("file") as File).type).toBe("image/webp");
    expect(
      screen.queryByText(
        locale === "es" ? "Historia aprobada" : "Story approved",
      ),
    ).toBeNull();
    expect(revokeUrl).toHaveBeenCalled();
  });
  it(`${locale} retains prepared image on unavailable and retries only after an explicit click`, async () => {
    fetcher.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({
        error: { code: "unavailable", message: "PRIVATE STACK" },
      }),
    });
    render(
      <CheckinStoryComposer
        locale={locale}
        checkInId={checkInId}
        venueName="Known venue"
      />,
    );
    await choose();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: submitLabel }));
    await screen.findByRole("alert");
    expect(screen.queryByText("PRIVATE STACK")).toBeNull();
    expect(fetcher).toHaveBeenCalledOnce();
    expect(screen.getByRole("img")).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", {
        name: locale === "es" ? "Reintentar envío" : "Retry submission",
      }),
    );
    await screen.findByText(
      locale === "es" ? "Pendiente de revisión" : "Awaiting review",
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
}
it("cannot submit twice while a request is pending", async () => {
  fetcher.mockReturnValue(new Promise(() => {}));
  render(
    <CheckinStoryComposer
      locale="en"
      checkInId={checkInId}
      venueName="Known venue"
    />,
  );
  await choose();
  fireEvent.click(screen.getByRole("checkbox"));
  const form = screen
    .getByRole("button", { name: "Submit for review" })
    .closest("form")!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  await waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
  expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
});
it("does not accept a forged auto-approved response as a successful public share", async () => {
  fetcher.mockResolvedValue({
    ok: true,
    status: 201,
    json: async () => ({
      story: { id: "fake", status: "approved", expiresAt: "tomorrow" },
      moderation: "automatic",
    }),
  });
  render(
    <CheckinStoryComposer
      locale="en"
      checkInId={checkInId}
      venueName="Known venue"
    />,
  );
  await choose();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));
  await screen.findByRole("alert");
  expect(screen.queryByText("Story approved")).toBeNull();
});
it.each(["pending", "approved", "rejected"] as const)(
  "shows server-provided %s state without sending another photo",
  async (status) => {
    render(
      <CheckinStoryComposer
        locale="en"
        checkInId={checkInId}
        venueName="Known venue"
        existingStory={{
          id: "known",
          status,
          expiresAt: "2026-11-01T12:00:00Z",
        }}
      />,
    );
    expect(screen.getByRole("status")).toBeVisible();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  },
);
it("clears private draft and opt-in when the accepted check-in changes", async () => {
  const view = render(
    <CheckinStoryComposer
      locale="en"
      checkInId={checkInId}
      venueName="Known venue"
    />,
  );
  await choose();
  fireEvent.click(screen.getByRole("checkbox"));
  view.rerender(
    <CheckinStoryComposer
      locale="en"
      checkInId="00000000-0000-4000-8000-000000000002"
      venueName="Other venue"
    />,
  );
  expect(screen.getByRole("checkbox")).not.toBeChecked();
  expect(screen.queryByRole("img")).toBeNull();
  expect(revokeUrl).toHaveBeenCalled();
});
it("ignores preparation completing after unmount", async () => {
  let resolve!: (value: unknown) => void;
  bitmap.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const view = render(
    <CheckinStoryComposer
      locale="en"
      checkInId={checkInId}
      venueName="Known venue"
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Capture fixture photo" }),
  );
  view.unmount();
  resolve({ width: 100, height: 100, close: closeBitmap });
  await waitFor(() => expect(closeBitmap).toHaveBeenCalledOnce());
  expect(createUrl).not.toHaveBeenCalled();
});

it.each(["en", "es"] as const)(
  "%s explains separate photos and lets people remove a preview without sharing",
  async (locale) => {
    render(
      <CheckinStoryComposer
        locale={locale}
        checkInId={checkInId}
        venueName="Known venue"
      />,
    );
    const help = screen.getByText(
      locale === "es" ? "Fotos y privacidad" : "Photo guidance & privacy",
    );
    expect(help.closest("details")).not.toHaveAttribute("open");
    fireEvent.click(help);
    expect(
      screen.getByText(
        locale === "es"
          ? /El escáner QR no guarda ni adjunta imágenes/
          : /The QR scanner does not save or attach images/,
      ),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", {
        name: locale === "es" ? "Quitar foto" : "Remove photo",
      }),
    ).not.toBeInTheDocument();
    await choose();
    expect(
      screen.getByRole("heading", {
        name: locale === "es" ? "Revisa tu foto" : "Review your photo",
      }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(
      screen.getByRole("button", {
        name: locale === "es" ? "Quitar foto" : "Remove photo",
      }),
    );
    expect(
      screen.queryByAltText(
        /^(Preview of your chosen photo|Vista previa de la foto que has elegido)$/,
      ),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(
      screen.getByRole("button", {
        name: locale === "es" ? "Enviar a revisión" : "Submit for review",
      }),
    ).toBeDisabled();
    expect(revokeUrl).toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  },
);
it("replacing a preview requires fresh permission and never uploads automatically", async () => {
  render(
    <CheckinStoryComposer
      locale="en"
      checkInId={checkInId}
      venueName="Known venue"
    />,
  );
  await choose();
  fireEvent.click(screen.getByRole("checkbox"));
  expect(
    screen.getByRole("button", { name: "Submit for review" }),
  ).toBeEnabled();
  fireEvent.click(
    screen.getByRole("button", { name: "Capture fixture photo" }),
  );
  await waitFor(() =>
    expect(screen.getByAltText("Preview of your chosen photo")).toHaveAttribute(
      "src",
      "blob:sanitized-2",
    ),
  );
  expect(screen.getByRole("checkbox")).not.toBeChecked();
  expect(
    screen.getByRole("button", { name: "Submit for review" }),
  ).toBeDisabled();
  expect(revokeUrl).toHaveBeenCalledWith("blob:sanitized-1");
  expect(fetcher).not.toHaveBeenCalled();
});

it.each(["blank_photo", "qr_photo", "photo_check_unavailable"])(
  "blocks preview and upload when local photo check reports %s",
  async (code) => {
    if (code === "photo_check_unavailable")
      qualityCheck.mockRejectedValue(new Error(code));
    else qualityCheck.mockResolvedValue(code);
    render(
      <CheckinStoryComposer
        locale="en"
        checkInId={checkInId}
        venueName="Known venue"
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Capture fixture photo" }),
    );
    expect(await screen.findByRole("alert")).toBeVisible();
    expect(screen.queryByRole("img")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Submit for review" }),
    ).toBeDisabled();
    expect(fetcher).not.toHaveBeenCalled();
    expect(closeBitmap).toHaveBeenCalledOnce();
  },
);
it("automatically obtains fresh submit location and retains private preview if location is denied", async () => {
  freshGeo.mockRejectedValue(new Error("location_required"));
  const view = render(
    <CheckinStoryComposer
      locale="en"
      checkInId={checkInId}
      venueName="Known venue"
    />,
  );
  expect(view.container.querySelector('input[type="file"]')).toBeNull();
  await choose();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Allow precise location",
  );
  expect(freshGeo).toHaveBeenCalledOnce();
  expect(fetcher).not.toHaveBeenCalled();
  expect(screen.getByAltText("Preview of your chosen photo")).toBeVisible();
});
it.each(["location_timeout", "location_unavailable"])(
  "retains photo with specific %s recovery when automatic submit GPS fails",
  async (code) => {
    freshGeo.mockRejectedValue(new Error(code));
    render(
      <CheckinStoryComposer
        locale="en"
        checkInId={checkInId}
        venueName="Known venue"
      />,
    );
    await choose();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      code === "location_timeout"
        ? "Location took too long"
        : "Your location could not be found",
    );
    expect(screen.getByAltText("Preview of your chosen photo")).toBeVisible();
    expect(fetcher).not.toHaveBeenCalled();
  },
);

it.each(["en", "es"] as const)(
  "%s keeps the optional caption collapsed until requested",
  (locale) => {
    render(
      <CheckinStoryComposer
        locale={locale}
        checkInId={checkInId}
        venueName="Known venue"
      />,
    );
    const add = screen.getByText(
      locale === "en" ? "Add caption" : "Añadir texto",
    );
    const input = screen.getByLabelText(
      locale === "en" ? "Caption (optional)" : "Texto (opcional)",
    );
    expect(add.closest("details")).not.toHaveAttribute("open");
    expect(input).not.toBeVisible();
    expect(input).toHaveValue("");
    fireEvent.click(add);
    expect(input).toBeVisible();
    fireEvent.change(input, { target: { value: "A short caption" } });
    expect(input).toHaveValue("A short caption");
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(fetcher).not.toHaveBeenCalled();
  },
);
