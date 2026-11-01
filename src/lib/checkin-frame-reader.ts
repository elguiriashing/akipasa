/** Local-only QR decoding. Frames never leave the device. */
export type QrFrameReader = {
  detect: (video: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
};
type NativeFactory = new (options: { formats: string[] }) => QrFrameReader;

export function createCheckInFrameReader(
  Factory?: NativeFactory,
): QrFrameReader {
  let native: QrFrameReader | undefined;
  try {
    native = Factory ? new Factory({ formats: ["qr_code"] }) : undefined;
  } catch {
    // Some browsers expose the constructor without supporting QR detection.
  }
  let canvas: HTMLCanvasElement | undefined;
  return {
    async detect(video) {
      if (native) {
        try {
          let timer: ReturnType<typeof setTimeout> | undefined;
          let results: { rawValue: string }[];
          try {
            results = await Promise.race([
              native.detect(video),
              new Promise<never>((_, reject) => {
                timer = setTimeout(
                  () => reject(new Error("Native QR timeout")),
                  750,
                );
              }),
            ]);
          } finally {
            clearTimeout(timer);
          }
          if (results.length) return results;
        } catch {
          // Decode the same frame locally when the native implementation fails.
          native = undefined;
        }
      }
      if (!video.videoWidth || !video.videoHeight || video.readyState < 2)
        return [];
      canvas ??= document.createElement("canvas");
      const scale = Math.min(
        1,
        960 / Math.max(video.videoWidth, video.videoHeight),
      );
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("QR frame unavailable");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      const { default: decode } = await import("jsqr");
      const result = decode(image.data, image.width, image.height, {
        inversionAttempts: "attemptBoth",
      });
      return result ? [{ rawValue: result.data }] : [];
    },
  };
}
