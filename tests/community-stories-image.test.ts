import { describe, expect, it } from "vitest";
import { storyImageDimensions } from "../src/lib/community-stories/image";
import {
  storyInputSchema,
  storyModerationSchema,
} from "../src/lib/community-stories/contracts";
function image(kind = "VP8L", width = 1280, height = 720) {
  const bytes = new Uint8Array(kind === "VP8L" ? 26 : 30);
  const view = new DataView(bytes.buffer);
  for (const [offset, value] of [
    [0, "RIFF"],
    [8, "WEBP"],
    [12, kind],
  ] as const)
    [...value].forEach((c, i) => (bytes[offset + i] = c.charCodeAt(0)));
  view.setUint32(4, bytes.length - 8, true);
  view.setUint32(16, kind === "VP8L" ? 5 : 10, true);
  if (kind === "VP8L") {
    bytes[20] = 0x2f;
    view.setUint32(21, (width - 1) | ((height - 1) << 14), true);
  } else {
    bytes.set([0x9d, 1, 0x2a], 23);
    view.setUint16(26, width, true);
    view.setUint16(28, height, true);
  }
  return bytes;
}
describe("metadata-free opaque Story image container", () => {
  it.each(["VP8L", "VP8 "])("reads bounded %s dimensions", (kind) =>
    expect(storyImageDimensions(image(kind))).toEqual({
      width: 1280,
      height: 720,
    }),
  );
  it.each(["VP8X", "EXIF", "XMP ", "ICCP", "ANIM", "ALPH"])(
    "rejects %s chunks",
    (kind) => expect(storyImageDimensions(image(kind))).toBeNull(),
  );
  it("rejects trailing metadata even with corrected RIFF length", () => {
    const bytes = new Uint8Array(38);
    bytes.set(image());
    new DataView(bytes.buffer).setUint32(4, 30, true);
    bytes.set([69, 88, 73, 70], 26);
    expect(storyImageDimensions(bytes)).toBeNull();
  });
  it("rejects inconsistent RIFF and chunk lengths", () => {
    for (const offset of [4, 16]) {
      const bytes = image();
      bytes[offset] += 2;
      expect(storyImageDimensions(bytes)).toBeNull();
    }
  });
  it("rejects alpha, version flags, padding and invalid signature", () => {
    for (const offset of [24, 25, 20]) {
      const bytes = image();
      bytes[offset] = 255;
      expect(storyImageDimensions(bytes)).toBeNull();
    }
  });
  it.each([
    [4097, 1],
    [4096, 4096],
    [1, 4097],
  ])("rejects dimensions %s/%s", (w, h) =>
    expect(storyImageDimensions(image("VP8L", w, h))).toBeNull(),
  );
  it("rejects truncated and oversized data", () => {
    expect(storyImageDimensions(image("VP8 ").slice(0, 26))).toBeNull();
    expect(
      storyImageDimensions(new Uint8Array(5 * 1024 * 1024 + 1)),
    ).toBeNull();
  });
});
describe("Stories trust boundary", () => {
  const valid = {
    checkInId: "123e4567-e89b-12d3-a456-426614174000",
    kind: "venue",
    caption: "A real visit",
    publicOptIn: "true",
  };
  it("requires explicit public consent and canonical UUID", () => {
    expect(storyInputSchema.safeParse(valid).success).toBe(true);
    for (const patch of [
      { publicOptIn: "false" },
      { publicOptIn: undefined },
      { checkInId: "a".repeat(36) },
    ])
      expect(storyInputSchema.safeParse({ ...valid, ...patch }).success).toBe(
        false,
      );
  });
  it("rejects client city, coordinates, status and overlong captions", () => {
    for (const patch of [
      { cityId: "forged" },
      { latitude: 1 },
      { status: "approved" },
      { caption: "x".repeat(241) },
    ])
      expect(storyInputSchema.safeParse({ ...valid, ...patch }).success).toBe(
        false,
      );
  });
  it("requires an explicit bounded moderation reason", () => {
    expect(
      storyModerationSchema.safeParse({
        decision: "approve",
        reason: "Reviewed photograph",
      }).success,
    ).toBe(true);
    for (const reason of ["", "  ", "x".repeat(241)])
      expect(
        storyModerationSchema.safeParse({ decision: "approve", reason })
          .success,
      ).toBe(false);
  });
});
