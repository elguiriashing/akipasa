import { create as createQr } from "qrcode";
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkPhotoQuality } from "../src/lib/community-stories/photo-quality";

function scene(width = 160, height = 120, dark = false) {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      rgba[i] = (dark ? 1 : 55) + (x % 16);
      rgba[i + 1] = (dark ? 1 : 75) + (y % 16);
      rgba[i + 2] = (dark ? 1 : 95) + ((x + y) % 16);
      rgba[i + 3] = 255;
    }
  return rgba;
}
function uniform(rgb: [number, number, number], noise = false) {
  const w = 160,
    h = 120,
    pixels = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    for (let c = 0; c < 3; c++)
      pixels[i + c] = rgb[c] + (noise ? (i / 4) % 2 : 0);
    pixels[i + 3] = 255;
  }
  return pixels;
}
function qrFrame(scale: number, inverted = false) {
  const width = 640,
    height = 480,
    rgba = scene(width, height, true);
  const matrix = createQr("AKIPASA LOCAL PHOTO CHECK", {
    errorCorrectionLevel: "M",
  }).modules;
  const margin = 4,
    total = matrix.size + margin * 2,
    side = total * scale;
  const left = Math.floor((width - side) / 2),
    top = Math.floor((height - side) / 2);
  for (let y = 0; y < side; y++)
    for (let x = 0; x < side; x++) {
      const mx = Math.floor(x / scale) - margin,
        my = Math.floor(y / scale) - margin;
      const black =
        mx >= 0 &&
        my >= 0 &&
        mx < matrix.size &&
        my < matrix.size &&
        matrix.get(my, mx);
      const v = Boolean(black) !== inverted ? 0 : 255;
      const i = ((y + top) * width + x + left) * 4;
      rgba[i] = v;
      rgba[i + 1] = v;
      rgba[i + 2] = v;
      rgba[i + 3] = 255;
    }
  return { rgba, width, height };
}
afterEach(() => {
  vi.doUnmock("jsqr");
  vi.resetModules();
});

describe("bounded local photo quality advice", () => {
  it.each([
    [0, 0, 0],
    [255, 255, 255],
    [120, 120, 120],
    [160, 110, 90],
  ] as [number, number, number][])(
    "rejects a uniform blank frame %s",
    async (r, g, b) => {
      expect(await checkPhotoQuality(uniform([r, g, b]), 160, 120)).toBe(
        "blank_photo",
      );
    },
  );
  it("rejects tiny compression noise on an otherwise uniform blank", async () => {
    expect(await checkPhotoQuality(uniform([0, 0, 0], true), 160, 120)).toBe(
      "blank_photo",
    );
    expect(
      await checkPhotoQuality(uniform([125, 125, 125], true), 160, 120),
    ).toBe("blank_photo");
  });
  it("uses visible alpha and does not accept invisible RGB noise as photo detail", async () => {
    const p = scene();
    for (let i = 3; i < p.length; i += 4) p[i] = 0;
    expect(await checkPhotoQuality(p, 160, 120)).toBe("blank_photo");
  });
  it("allows genuinely detailed low-light images rather than rejecting by brightness", async () => {
    expect(await checkPhotoQuality(scene(160, 120, true), 160, 120)).toBe(null);
  });
  it("allows non-QR detail and does not mutate a caller Uint8 view or padding", async () => {
    const source = scene();
    const storage = new Uint8Array(source.length + 32);
    storage.fill(42);
    const view = storage.subarray(16, 16 + source.length);
    view.set(source);
    const before = storage.slice();
    expect(await checkPhotoQuality(view, 160, 120)).toBe(null);
    expect(storage).toEqual(before);
  });
  it("rejects a real generated dominant QR in a photograph frame", async () => {
    const p = qrFrame(12);
    expect(await checkPhotoQuality(p.rgba, p.width, p.height)).toBe("qr_photo");
  });
  it("also detects a real inverted dominant QR", async () => {
    const p = qrFrame(12, true);
    expect(await checkPhotoQuality(p.rgba, p.width, p.height)).toBe("qr_photo");
  });
  it("allows a real decoded small background QR", async () => {
    const p = qrFrame(3);
    const { default: decode } = await import("jsqr");
    expect(
      decode(p.rgba, p.width, p.height, { inversionAttempts: "attemptBoth" })
        ?.data,
    ).toBe("AKIPASA LOCAL PHOTO CHECK");
    expect(await checkPhotoQuality(p.rgba, p.width, p.height)).toBe(null);
  });
  it.each([
    { width: 0, height: 1, pixels: new Uint8Array(0) },
    { width: 1.5, height: 1, pixels: new Uint8Array(4) },
    { width: 1, height: Number.NaN, pixels: new Uint8Array(4) },
    { width: 641, height: 1, pixels: new Uint8Array(641 * 4) },
    { width: 1, height: 641, pixels: new Uint8Array(641 * 4) },
    { width: 2, height: 2, pixels: new Uint8Array(15) },
    { width: 2, height: 2, pixels: new Float32Array(16) },
    { width: 2, height: 2, pixels: null },
  ])(
    "fails closed for malformed or unbounded input %#",
    async ({ width, height, pixels }) => {
      expect(
        await checkPhotoQuality(pixels as unknown as Uint8Array, width, height),
      ).toBe("invalid_image");
    },
  );
  it("returns an honest availability error when the lazy decoder cannot load", async () => {
    vi.doMock("jsqr", () => {
      throw Error("chunk unavailable");
    });
    const { checkPhotoQuality: check } = await import(
      "../src/lib/community-stories/photo-quality"
    );
    await expect(check(scene(), 160, 120)).rejects.toMatchObject({
      message: "photo_check_unavailable",
      code: "photo_check_unavailable",
    });
  });
  it("does not claim a pass when the decoder throws or returns unusable geometry", async () => {
    vi.doMock("jsqr", () => ({
      default: () => ({ location: { topLeftCorner: { x: NaN, y: 0 } } }),
    }));
    const { checkPhotoQuality: check } = await import(
      "../src/lib/community-stories/photo-quality"
    );
    await expect(check(scene(), 160, 120)).rejects.toMatchObject({
      code: "photo_check_unavailable",
    });
  });
  it("measures QR quadrilateral area, not an exaggerated rotated bounding box", async () => {
    vi.doMock("jsqr", () => ({
      default: () => ({
        location: {
          topLeftCorner: { x: 64, y: 39 },
          topRightCorner: { x: 89, y: 64 },
          bottomRightCorner: { x: 64, y: 89 },
          bottomLeftCorner: { x: 39, y: 64 },
        },
      }),
    }));
    const { checkPhotoQuality: check } = await import(
      "../src/lib/community-stories/photo-quality"
    );
    expect(await check(scene(128, 128), 128, 128)).toBe(null);
  });
  it("rejects a decoded quadrilateral clearly above15percent", async () => {
    vi.doMock("jsqr", () => ({
      default: () => ({
        location: {
          topLeftCorner: { x: 10, y: 10 },
          topRightCorner: { x: 70, y: 10 },
          bottomRightCorner: { x: 70, y: 70 },
          bottomLeftCorner: { x: 10, y: 70 },
        },
      }),
    }));
    const { checkPhotoQuality: check } = await import(
      "../src/lib/community-stories/photo-quality"
    );
    expect(await check(scene(128, 128), 128, 128)).toBe("qr_photo");
  });
});

it("reports decoder execution failure honestly", async () => {
  vi.doMock("jsqr", () => ({
    default: () => {
      throw Error("decoder failed");
    },
  }));
  const { checkPhotoQuality: check } = await import(
    "../src/lib/community-stories/photo-quality"
  );
  await expect(check(scene(), 160, 120)).rejects.toMatchObject({
    code: "photo_check_unavailable",
  });
});

it("does not claim a pass for degenerate decoder geometry", async () => {
  vi.doMock("jsqr", () => ({
    default: () => ({
      location: {
        topLeftCorner: { x: 10, y: 10 },
        topRightCorner: { x: 10, y: 10 },
        bottomRightCorner: { x: 10, y: 10 },
        bottomLeftCorner: { x: 10, y: 10 },
      },
    }),
  }));
  const { checkPhotoQuality: check } = await import(
    "../src/lib/community-stories/photo-quality"
  );
  await expect(check(scene(), 160, 120)).rejects.toMatchObject({
    code: "photo_check_unavailable",
  });
});

it("does not treat an unexpected missing decoder result as a successful check", async () => {
  vi.doMock("jsqr", () => ({ default: () => undefined }));
  const { checkPhotoQuality: check } = await import(
    "../src/lib/community-stories/photo-quality"
  );
  await expect(check(scene(), 160, 120)).rejects.toMatchObject({
    code: "photo_check_unavailable",
  });
});
