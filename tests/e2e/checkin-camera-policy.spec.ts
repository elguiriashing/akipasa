import { expect, test } from "@playwright/test";

// Real Chromium media capture with a synthetic DEVICE; getUserMedia is never mocked.
// Barcode decoding alone returns no results, so no venue visit/token/XP is submitted.
test.use({
  launchOptions: {
    ...(process.env.BOOKING_BROWSER_PATH
      ? { executablePath: process.env.BOOKING_BROWSER_PATH }
      : {}),
    args: ["--use-fake-device-for-media-stream"],
  },
});
for (const locale of ["en", "es"] as const) {
  test(`${locale} explicit scanner capture is allowed only on check-in and stops all tracks`, async ({
    page,
    context,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => {
      Object.defineProperty(window, "BarcodeDetector", {
        configurable: true,
        value: class {
          async detect() {
            return [];
          }
        },
      });
      document.cookie = "ak_consent_version=2; Path=/";
    });
    const response = await page.goto(`/${locale}/check-in`);
    expect(response?.status()).toBe(200);
    expect(response?.headers()["permissions-policy"]).toBe(
      "camera=(self), microphone=(), geolocation=(self), payment=()",
    );
    const policy = await page.evaluate(() => {
      const policy = (
        document as Document & {
          featurePolicy?: { allowsFeature: (name: string) => boolean };
        }
      ).featurePolicy;
      return {
        camera: policy?.allowsFeature("camera"),
        microphone: policy?.allowsFeature("microphone"),
        payment: policy?.allowsFeature("payment"),
      };
    });
    expect(policy).toEqual({ camera: true, microphone: false, payment: false });
    const video = page.getByLabel(
      locale === "es" ? "Vista previa de cámara" : "Camera preview",
    );
    await expect(video).toHaveJSProperty("srcObject", null);
    const scanner = page.getByRole("region", {
      name: locale === "es" ? "Escáner de check-in" : "Check-in scanner",
    });
    const start = scanner.getByRole("button", {
      name: locale === "es" ? "Escanear QR del local" : "Scan venue QR",
    });
    await expect(start).toBeEnabled();
    // Explicit test permission precedes the actual user Start action; no automatic capture.
    await context.grantPermissions(["camera"]);
    await expect(video).toHaveJSProperty("srcObject", null);
    await start.click();
    const stop = scanner.getByRole("button", {
      name: locale === "es" ? "Detener escáner" : "Stop scanner",
    });
    await expect(stop).toBeVisible();
    const live = await video.evaluate((element: HTMLVideoElement) => {
      const stream = element.srcObject as MediaStream;
      (
        window as Window & { testCameraTracks?: MediaStreamTrack[] }
      ).testCameraTracks = stream.getTracks();
      return {
        videoTracks: stream.getVideoTracks().map((track) => track.readyState),
        audioTracks: stream.getAudioTracks().length,
        paused: element.paused,
      };
    });
    expect(live).toEqual({
      videoTracks: ["live"],
      audioTracks: 0,
      paused: false,
    });
    const image = testInfo.outputPath("explicit-camera-live-fake-device.png");
    await page.screenshot({ path: image, animations: "disabled" });
    await testInfo.attach("Actual scanner using Chromium fake camera device", {
      path: image,
      contentType: "image/png",
    });
    await stop.click();
    await expect(video).toHaveJSProperty("srcObject", null);
    expect(
      await page.evaluate(() =>
        (
          window as Window & { testCameraTracks?: MediaStreamTrack[] }
        ).testCameraTracks?.map((track) => track.readyState),
      ),
    ).toEqual(["ended"]);
    await expect(start).toBeVisible();
    const home = await page.goto(`/${locale}`);
    expect(home?.headers()["permissions-policy"]).toBe(
      "camera=(), microphone=(), geolocation=(self), payment=()",
    );
    const denial = await page.evaluate(async () => {
      const policy = (
        document as Document & {
          featurePolicy?: { allowsFeature: (name: string) => boolean };
        }
      ).featurePolicy;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        stream.getTracks().forEach((track) => track.stop());
        return {
          camera: policy?.allowsFeature("camera"),
          microphone: policy?.allowsFeature("microphone"),
          error: null,
        };
      } catch (error) {
        return {
          camera: policy?.allowsFeature("camera"),
          microphone: policy?.allowsFeature("microphone"),
          error: (error as DOMException).name,
        };
      }
    });
    expect(denial).toEqual({
      camera: false,
      microphone: false,
      error: "NotAllowedError",
    });
  });
}
