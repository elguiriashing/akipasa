// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { StoryCamera, freshStoryLocation } from "./StoryCamera";
const media = vi.fn(),
  geo = vi.fn(),
  fetcher = vi.fn(),
  captured = vi.fn();
const id = "00000000-0000-4000-8000-000000000001";
function stream() {
  const stop = vi.fn();
  return {
    stop,
    stream: { getTracks: () => [{ stop }] } as unknown as MediaStream,
  };
}
function position(accuracy = 10) {
  return {
    coords: { latitude: 36.54, longitude: -4.62, accuracy },
    timestamp: Date.now(),
  } as GeolocationPosition;
}
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: media },
  });
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: geo },
  });
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
  geo.mockImplementation((success: PositionCallback) => success(position()));
  media.mockResolvedValue(stream().stream);
  vi.stubGlobal("fetch", fetcher);
  fetcher.mockResolvedValue({ ok: true, json: async () => ({ ready: true }) });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
    (callback) => callback(new Blob(["livepixels"], { type: "image/jpeg" })),
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function mount() {
  return render(
    <StoryCamera
      locale="en"
      checkInId={id}
      facing="environment"
      disabled={false}
      onCapture={captured}
    />,
  );
}
async function start() {
  fireEvent.click(screen.getByRole("button", { name: "Open camera" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Take photo" })).toBeEnabled(),
  );
}
it("requests neither camera nor location on visit and exposes no gallery input", () => {
  const view = mount();
  expect(media).not.toHaveBeenCalled();
  expect(geo).not.toHaveBeenCalled();
  expect(view.container.querySelector('input[type="file"]')).toBeNull();
});
it("one gesture starts camera and fresh GPS together, preflight gates shutter", async () => {
  let success!: PositionCallback;
  geo.mockImplementation((callback: PositionCallback) => {
    success = callback;
  });
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Open camera" }));
  expect(media).toHaveBeenCalledOnce();
  expect(geo).toHaveBeenCalledOnce();
  expect(screen.getByRole("button", { name: "Take photo" })).toBeDisabled();
  expect(fetcher).not.toHaveBeenCalled();
  await act(async () => success(position()));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Take photo" })).toBeEnabled(),
  );
  const [url, options] = fetcher.mock.calls[0];
  expect(url).toBe("/api/community/stories/capture-location");
  expect(JSON.parse(options.body)).toMatchObject({
    checkInId: id,
    latitude: 36.54,
    longitude: -4.62,
    accuracy: 10,
    locatedAt: expect.any(Number),
  });
  expect(geo.mock.calls[0][2]).toEqual({
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 15000,
  });
  expect(captured).not.toHaveBeenCalled();
});
it("captures only a loaded live frame and ends tracks before delivering local photo", async () => {
  const live = stream();
  media.mockResolvedValue(live.stream);
  mount();
  await start();
  const video = screen.getByLabelText("Story camera preview");
  Object.defineProperties(video, {
    readyState: { value: 2 },
    videoWidth: { value: 1920 },
    videoHeight: { value: 1080 },
  });
  fireEvent.click(screen.getByRole("button", { name: "Take photo" }));
  await waitFor(() => expect(captured).toHaveBeenCalledOnce());
  expect(captured.mock.calls[0][0]).toBeInstanceOf(File);
  expect(captured.mock.calls[0][0].type).toBe("image/jpeg");
  expect(live.stop).toHaveBeenCalledOnce();
  expect(live.stop.mock.invocationCallOrder[0]).toBeLessThan(
    captured.mock.invocationCallOrder[0],
  );
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("server outside-geofence denial ends camera and never enables capture", async () => {
  const live = stream();
  media.mockResolvedValue(live.stream);
  fetcher.mockResolvedValue({
    ok: false,
    json: async () => ({ error: { code: "outside_geofence" } }),
  });
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Open camera" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("100 m");
  expect(live.stop).toHaveBeenCalledOnce();
  expect(captured).not.toHaveBeenCalled();
});
it("close invalidates late GPS and stops a late permission stream", async () => {
  let resolve!: (v: MediaStream) => void;
  let success!: PositionCallback;
  media.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  geo.mockImplementation((callback: PositionCallback) => {
    success = callback;
  });
  const live = stream();
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Open camera" }));
  fireEvent.click(screen.getByRole("button", { name: "Close camera" }));
  await act(async () => {
    success(position());
    resolve(live.stream);
  });
  expect(live.stop).toHaveBeenCalledOnce();
  expect(fetcher).not.toHaveBeenCalled();
  expect(captured).not.toHaveBeenCalled();
});
it("background and unmount stop camera tracks", async () => {
  const live = stream();
  media.mockResolvedValue(live.stream);
  const view = mount();
  await start();
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: true,
  });
  fireEvent(document, new Event("visibilitychange"));
  expect(live.stop).toHaveBeenCalledOnce();
  expect(screen.getByRole("button", { name: "Open camera" })).toBeEnabled();
  view.unmount();
  expect(live.stop).toHaveBeenCalledOnce();
});
it("denied GPS explains settings and prevents preflight/capture", async () => {
  geo.mockImplementation(
    (_success: PositionCallback, error: PositionErrorCallback) =>
      error({ code: 1 } as GeolocationPositionError),
  );
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Open camera" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Allow precise location",
  );
  expect(fetcher).not.toHaveBeenCalled();
});
it("rejects stale and inaccurate fixes without persisting coordinates", async () => {
  geo.mockImplementation((success: PositionCallback) => success(position(51)));
  await expect(freshStoryLocation()).rejects.toThrow("location_inaccurate");
  geo.mockImplementation((success: PositionCallback) =>
    success({ ...position(), timestamp: Date.now() - 61000 }),
  );
  await expect(freshStoryLocation()).rejects.toThrow("location_expired");
});
it("does not navigate or publish when a preflight resolves after unmount", async () => {
  let finish!: (v: unknown) => void;
  fetcher.mockReturnValue(
    new Promise((r) => {
      finish = r;
    }),
  );
  const live = stream();
  media.mockResolvedValue(live.stream);
  const view = mount();
  fireEvent.click(screen.getByRole("button", { name: "Open camera" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
  view.unmount();
  await act(async () =>
    finish({ ok: true, json: async () => ({ ready: true }) }),
  );
  expect(live.stop).toHaveBeenCalledOnce();
  expect(captured).not.toHaveBeenCalled();
});

it("discards the shutter frame if the user moved outside after starting camera", async () => {
  const live = stream();
  media.mockResolvedValue(live.stream);
  mount();
  await start();
  const video = screen.getByLabelText("Story camera preview");
  Object.defineProperties(video, {
    readyState: { value: 2 },
    videoWidth: { value: 640 },
    videoHeight: { value: 480 },
  });
  fetcher.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ error: { code: "outside_geofence" } }),
  });
  fireEvent.click(screen.getByRole("button", { name: "Take photo" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("100 m");
  expect(geo).toHaveBeenCalledTimes(2);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(live.stop).toHaveBeenCalledOnce();
  expect(captured).not.toHaveBeenCalled();
});
it.each(["stale", "denied"])(
  "discards frame after %s shutter GPS without any extra permission button",
  async (failure) => {
    const live = stream();
    media.mockResolvedValue(live.stream);
    mount();
    await start();
    const video = screen.getByLabelText("Story camera preview");
    Object.defineProperties(video, {
      readyState: { value: 2 },
      videoWidth: { value: 640 },
      videoHeight: { value: 480 },
    });
    geo.mockImplementationOnce(
      (success: PositionCallback, error: PositionErrorCallback) =>
        failure === "stale"
          ? success({ ...position(), timestamp: Date.now() - 61000 })
          : error({ code: 1 } as GeolocationPositionError),
    );
    fireEvent.click(screen.getByRole("button", { name: "Take photo" }));
    await screen.findByRole("alert");
    expect(live.stop).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledOnce();
    expect(captured).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: /Allow location/i }),
    ).toBeNull();
  },
);
it("closing during shutter GPS discards frame and prevents later location preflight", async () => {
  mount();
  await start();
  const video = screen.getByLabelText("Story camera preview");
  Object.defineProperties(video, {
    readyState: { value: 2 },
    videoWidth: { value: 640 },
    videoHeight: { value: 480 },
  });
  let finish!: PositionCallback;
  geo.mockImplementationOnce((success: PositionCallback) => {
    finish = success;
  });
  fireEvent.click(screen.getByRole("button", { name: "Take photo" }));
  await waitFor(() => expect(finish).toBeTypeOf("function"));
  fireEvent.click(screen.getByRole("button", { name: "Close camera" }));
  await act(async () => finish(position()));
  expect(fetcher).toHaveBeenCalledOnce();
  expect(captured).not.toHaveBeenCalled();
});

it.each([
  [
    "NotAllowedError",
    "Camera permission is blocked. Allow it in browser settings and try again, or continue without a story.",
    "La cámara está bloqueada. Permite su uso en los ajustes del navegador y vuelve a intentarlo, o continúa sin historia.",
  ],
  [
    "SecurityError",
    "Camera permission is blocked. Allow it in browser settings and try again, or continue without a story.",
    "La cámara está bloqueada. Permite su uso en los ajustes del navegador y vuelve a intentarlo, o continúa sin historia.",
  ],
  [
    "NotReadableError",
    "The camera cannot be used. Close other apps or tabs using it and try again, or continue without a story.",
    "No se puede usar la cámara. Cierra otras aplicaciones o pestañas que la estén usando y vuelve a intentarlo, o continúa sin historia.",
  ],
  [
    "TrackStartError",
    "The camera cannot be used. Close other apps or tabs using it and try again, or continue without a story.",
    "No se puede usar la cámara. Cierra otras aplicaciones o pestañas que la estén usando y vuelve a intentarlo, o continúa sin historia.",
  ],
  [
    "NotFoundError",
    "No camera is available in this browser or device. Check the camera connection and try again, or continue without a story.",
    "No hay una cámara disponible en este navegador o dispositivo. Comprueba la conexión de la cámara y vuelve a intentarlo, o continúa sin historia.",
  ],
  [
    "OverconstrainedError",
    "No camera is available in this browser or device. Check the camera connection and try again, or continue without a story.",
    "No hay una cámara disponible en este navegador o dispositivo. Comprueba la conexión de la cámara y vuelve a intentarlo, o continúa sin historia.",
  ],
])(
  "maps native camera %s to actionable EN/ES recovery without uploading",
  async (name, en, es) => {
    for (const locale of ["en", "es"] as const) {
      media.mockRejectedValue(new DOMException("PRIVATE DEVICE MESSAGE", name));
      const view = render(
        <StoryCamera
          locale={locale}
          checkInId={id}
          facing="environment"
          disabled={false}
          onCapture={captured}
        />,
      );
      fireEvent.click(
        screen.getByRole("button", {
          name: locale === "en" ? "Open camera" : "Abrir cámara",
        }),
      );
      expect(await screen.findByRole("alert")).toHaveTextContent(
        locale === "en" ? en : es,
      );
      expect(screen.queryByText("PRIVATE DEVICE MESSAGE")).toBeNull();
      expect(captured).not.toHaveBeenCalled();
      expect(
        fetcher.mock.calls.every(
          ([url]) => url === "/api/community/stories/capture-location",
        ),
      ).toBe(true);
      view.unmount();
    }
  },
);
it.each([
  [
    2,
    "Your location could not be found. Check that device location is enabled and try again, or continue without a story.",
    "No se pudo obtener tu ubicación. Comprueba que la ubicación del dispositivo está activada y vuelve a intentarlo, o continúa sin historia.",
  ],
  [
    3,
    "Location took too long. Move somewhere with a better signal and try again, or continue without a story.",
    "La ubicación tardó demasiado. Busca un lugar con mejor señal y vuelve a intentarlo, o continúa sin historia.",
  ],
] as const)(
  "distinguishes GPS error %s in EN/ES without requesting uploads",
  async (code, en, es) => {
    for (const locale of ["en", "es"] as const) {
      geo.mockImplementation(
        (_success: PositionCallback, fail: PositionErrorCallback) =>
          fail({ code } as GeolocationPositionError),
      );
      const view = render(
        <StoryCamera
          locale={locale}
          checkInId={id}
          facing="environment"
          disabled={false}
          onCapture={captured}
        />,
      );
      fireEvent.click(
        screen.getByRole("button", {
          name: locale === "en" ? "Open camera" : "Abrir cámara",
        }),
      );
      expect(await screen.findByRole("alert")).toHaveTextContent(
        locale === "en" ? en : es,
      );
      expect(fetcher).not.toHaveBeenCalled();
      expect(captured).not.toHaveBeenCalled();
      view.unmount();
    }
  },
);
it("explains unsupported camera access without promising browser permission persistence", async () => {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: undefined,
  });
  mount();
  fireEvent.click(screen.getByRole("button", { name: "Open camera" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "No camera is available in this browser or device.",
  );
  expect(geo).not.toHaveBeenCalled();
  expect(captured).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
  const help = screen.getByText("Camera & privacy");
  expect(help.closest("details")).not.toHaveAttribute("open");
  fireEvent.click(help);
  expect(
    screen.getByText(
      /Your browser controls whether permissions are remembered/,
    ),
  ).toBeVisible();
});

it("keeps ordinary camera copy compact and privacy help collapsed", () => {
  const view = mount();
  expect(view.container.querySelector("details")).not.toHaveAttribute("open");
  expect(screen.queryByText(/Open the camera for a new photo/)).toBeNull();
  expect(screen.getByRole("button", { name: "Open camera" })).toBeVisible();
});
