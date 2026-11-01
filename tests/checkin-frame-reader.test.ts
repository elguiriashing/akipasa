// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { createCheckInFrameReader } from "../src/lib/checkin-frame-reader";
const { decode } = vi.hoisted(() => ({ decode: vi.fn() }));
vi.mock("jsqr", () => ({ default: decode }));
afterEach(() => {
  vi.restoreAllMocks();
  decode.mockReset();
});
function readyVideo() {
  const video = document.createElement("video");
  Object.defineProperties(video, {
    videoWidth: { value: 1920 },
    videoHeight: { value: 1080 },
    readyState: { value: 2 },
  });
  const getImageData = vi.fn().mockReturnValue({
    data: new Uint8ClampedArray(4),
    width: 960,
    height: 540,
  });
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    getImageData,
    drawImage,
  } as unknown as CanvasRenderingContext2D);
  return { video, drawImage };
}
it("decodes locally without native BarcodeDetector and bounds frame size", async () => {
  const { video, drawImage } = readyVideo();
  decode.mockReturnValue({ data: "local QR payload" });
  expect(await createCheckInFrameReader().detect(video)).toEqual([
    { rawValue: "local QR payload" },
  ]);
  expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 960, 540);
  expect(decode).toHaveBeenCalledWith(expect.any(Uint8ClampedArray), 960, 540, {
    inversionAttempts: "attemptBoth",
  });
});
it("uses the local decoder when native detection throws", async () => {
  const { video } = readyVideo();
  const native = vi.fn().mockRejectedValue(new Error("unsupported"));
  class Native {
    detect = native;
  }
  decode.mockReturnValue({ data: "fallback" });
  const reader = createCheckInFrameReader(Native);
  expect(await reader.detect(video)).toEqual([{ rawValue: "fallback" }]);
  await reader.detect(video);
  expect(native).toHaveBeenCalledOnce();
});
it("falls back for constructor failure and empty native detection", async () => {
  const { video } = readyVideo();
  decode.mockReturnValue(null);
  class Broken {
    constructor() {
      throw new Error("unsupported format");
    }
    detect = vi.fn();
  }
  expect(await createCheckInFrameReader(Broken).detect(video)).toEqual([]);
  class Empty {
    detect = vi.fn().mockResolvedValue([]);
  }
  expect(await createCheckInFrameReader(Empty).detect(video)).toEqual([]);
  expect(decode).toHaveBeenCalledTimes(2);
});
it("retains working native results without reading pixels", async () => {
  const video = document.createElement("video");
  class Native {
    detect = vi.fn().mockResolvedValue([{ rawValue: "native" }]);
  }
  expect(await createCheckInFrameReader(Native).detect(video)).toEqual([
    { rawValue: "native" },
  ]);
  expect(decode).not.toHaveBeenCalled();
});
it("waits for loaded video rather than decoding an empty frame", async () => {
  expect(
    await createCheckInFrameReader().detect(document.createElement("video")),
  ).toEqual([]);
  expect(decode).not.toHaveBeenCalled();
});

it("falls back when the native detector never settles", async () => {
  vi.useFakeTimers();
  try {
    const { video } = readyVideo();
    class Hanging {
      detect = () => new Promise<{ rawValue: string }[]>(() => {});
    }
    decode.mockReturnValue({ data: "recovered" });
    const result = createCheckInFrameReader(Hanging).detect(video);
    await vi.advanceTimersByTimeAsync(750);
    expect(await result).toEqual([{ rawValue: "recovered" }]);
  } finally {
    vi.useRealTimers();
  }
});

it("the shipped offline decoder reads an actual generated official QR image", async () => {
  const { default: actualDecode } =
    await vi.importActual<typeof import("jsqr")>("jsqr");
  const QRCode = await import("qrcode");
  const value =
    "https://akipasa.com/es/check-in/10000000-0000-4000-8000-000000000001";
  const matrix = QRCode.create(value, { errorCorrectionLevel: "M" }).modules;
  const size = (matrix.size + 8) * 4;
  const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let y = 0; y < matrix.size; y++) {
    for (let x = 0; x < matrix.size; x++) {
      if (!matrix.get(y, x)) continue;
      for (let dy = 0; dy < 4; dy++) {
        for (let dx = 0; dx < 4; dx++) {
          const index = (((y + 4) * 4 + dy) * size + (x + 4) * 4 + dx) * 4;
          pixels[index] = pixels[index + 1] = pixels[index + 2] = 0;
        }
      }
    }
  }
  expect(actualDecode(pixels, size, size)?.data).toBe(value);
});
