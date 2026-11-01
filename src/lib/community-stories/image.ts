/** Stories accept only opaque, metadata-free, single-frame WebP containers.
 * This structural check is not a decoder or proof that a photograph is genuine.
 */
export const STORY_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export function storyImageDimensions(bytes: Uint8Array) {
  if (bytes.length < 26 || bytes.length > STORY_IMAGE_MAX_BYTES) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (at: number, value: string) =>
    [...value].every((c, i) => bytes[at + i] === c.charCodeAt(0));
  if (
    !text(0, "RIFF") ||
    !text(8, "WEBP") ||
    view.getUint32(4, true) !== bytes.length - 8
  )
    return null;
  const size = view.getUint32(16, true);
  if (
    size + 20 + (size % 2) !== bytes.length ||
    (size % 2 && bytes[bytes.length - 1] !== 0)
  )
    return null;
  let width = 0,
    height = 0;
  if (text(12, "VP8 ")) {
    if (size < 10 || (bytes[20] & 1) !== 0 || !text(23, "\u009d\u0001\u002a"))
      return null;
    width = view.getUint16(26, true) & 0x3fff;
    height = view.getUint16(28, true) & 0x3fff;
  } else if (text(12, "VP8L")) {
    if (size < 5 || bytes[20] !== 0x2f) return null;
    const packed = view.getUint32(21, true);
    if (packed >>> 28 !== 0) return null; // Alpha flag and reserved version bits.
    width = (packed & 0x3fff) + 1;
    height = ((packed >>> 14) & 0x3fff) + 1;
  } else return null;
  return width > 0 &&
    height > 0 &&
    width <= 4096 &&
    height <= 4096 &&
    width * height <= 16_000_000
    ? { width, height }
    : null;
}
