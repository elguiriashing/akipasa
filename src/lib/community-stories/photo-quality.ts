/** Local, advisory pixel checks only. These do not prove attendance, identity,
 * whether an image depicts a venue, or that a camera/photo cannot be bypassed. */
export type PhotoQualityIssue = "blank_photo" | "qr_photo" | "invalid_image";

export class PhotoQualityUnavailableError extends Error {
  readonly code = "photo_check_unavailable";
  constructor() {
    super("photo_check_unavailable");
    this.name = "PhotoQualityUnavailableError";
  }
}

/** Caller supplies a decoded/downsampled frame: at most640px per side.
 * No pixels, decoded QR contents or location data leave this function. */
export async function checkPhotoQuality(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): Promise<PhotoQualityIssue | null> {
  if (
    !(rgba instanceof Uint8ClampedArray || rgba instanceof Uint8Array) ||
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 640 ||
    height > 640 ||
    rgba.length !== width * height * 4
  )
    return "invalid_image";

  // Variance, not brightness: genuinely detailed low-light scenes remain valid.
  // Composite alpha over black consistently with the opaque photo preparation.
  const total = width * height;
  const sums = [0, 0, 0];
  const squares = [0, 0, 0];
  for (let offset = 0; offset < rgba.length; offset += 4) {
    const alpha = rgba[offset + 3] / 255;
    for (let channel = 0; channel < 3; channel++) {
      const value = rgba[offset + channel] * alpha;
      sums[channel] += value;
      squares[channel] += value * value;
    }
  }
  const variance =
    sums.reduce(
      (value, sum, channel) =>
        value + Math.max(0, squares[channel] / total - (sum / total) ** 2),
      0,
    ) / 3;
  // Near-uniform camera/blank frames, with tolerance for tiny compression noise.
  if (variance <= 0.75) return "blank_photo";

  try {
    const { default: decode } = await import("jsqr");
    if (typeof decode !== "function") throw new PhotoQualityUnavailableError();
    // Own the bounded buffer; the caller's frame is never mutated by a decoder.
    const result = decode(new Uint8ClampedArray(rgba), width, height, {
      inversionAttempts: "attemptBoth",
    });
    if (result === null) return null;
    if (!result) throw new PhotoQualityUnavailableError();
    const points = [
      result.location.topLeftCorner,
      result.location.topRightCorner,
      result.location.bottomRightCorner,
      result.location.bottomLeftCorner,
    ];
    if (
      points.some(
        (point) => !Number.isFinite(point?.x) || !Number.isFinite(point?.y),
      )
    )
      throw new PhotoQualityUnavailableError();
    const twiceArea = points.reduce((area, point, index) => {
      const next = points[(index + 1) % points.length];
      return area + point.x * next.y - next.x * point.y;
    }, 0);
    const area = Math.abs(twiceArea) / 2;
    if (!Number.isFinite(area) || area <= 0)
      throw new PhotoQualityUnavailableError();
    // Finder quadrilateral excludes the quiet margin. A small menu/sign QR in
    // the background is allowed; a clearly dominant decoded code is not a photo.
    return area / total >= 0.15 ? "qr_photo" : null;
  } catch {
    // A missing chunk or failed decoder is not a successful quality check.
    throw new PhotoQualityUnavailableError();
  }
}
