import { expect, test, type Page } from "@playwright/test";

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

async function cameraPolicy(page: Page) {
  return page.evaluate(() => {
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
}

async function documentIdentity(page: Page) {
  return page.evaluate(
    () =>
      (window as Window & { cameraPolicyTestDocument?: string })
        .cameraPolicyTestDocument,
  );
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    // This changes only when a document is created, never on a React/RSC transition.
    Object.defineProperty(window, "cameraPolicyTestDocument", {
      value: crypto.randomUUID(),
    });
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
});

for (const locale of ["en", "es"] as const) {
  test(`${locale} native Home dock entry creates a camera-enabled Check-in document`, async ({
    page,
    context,
  }, testInfo) => {
    await context.grantPermissions(["camera"]);
    await page.goto(`/${locale}`);
    expect(await cameraPolicy(page)).toEqual({
      camera: false,
      microphone: false,
      payment: false,
    });
    const homeDocument = await documentIdentity(page);
    const documents: string[] = [];
    page.on("request", (request) => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame())
        documents.push(request.url());
    });
    await page
      .locator("nav.pasa-dock")
      .getByRole("link", { name: "Check-in", exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/check-in$`));
    const checkinDocument = await documentIdentity(page);
    const policy = await cameraPolicy(page);
    await testInfo.attach("Native Home to Check-in document boundary", {
      body: JSON.stringify({
        homeDocument,
        checkinDocument,
        documents,
        policy,
      }),
      contentType: "application/json",
    });
    expect.soft(checkinDocument).not.toBe(homeDocument);
    expect
      .soft(documents)
      .toContainEqual(
        expect.stringMatching(new RegExp(`/${locale}/check-in$`)),
      );
    expect(policy).toEqual({
      camera: true,
      microphone: false,
      payment: false,
    });
    const scanner = page.getByRole("region", {
      name: locale === "es" ? "Escáner de check-in" : "Check-in scanner",
    });
    const preview = page.getByLabel(
      locale === "es" ? "Vista previa de cámara" : "Camera preview",
    );
    await expect(preview).toHaveJSProperty("srcObject", null);
    await scanner
      .getByRole("button", {
        name: locale === "es" ? "Escanear QR del local" : "Scan venue QR",
      })
      .click();
    await expect(
      scanner.getByRole("button", {
        name: locale === "es" ? "Detener escáner" : "Stop scanner",
      }),
    ).toBeVisible();
    expect(
      await preview.evaluate((video: HTMLVideoElement) => ({
        tracks: (video.srcObject as MediaStream)
          .getVideoTracks()
          .map((track) => track.readyState),
        audio: (video.srcObject as MediaStream).getAudioTracks().length,
      })),
    ).toEqual({ tracks: ["live"], audio: 0 });
  });

  test(`${locale} native Check-in dock exit and browser history restore document camera boundaries`, async ({
    page,
    context,
  }, testInfo) => {
    await context.grantPermissions(["camera"]);
    await page.goto(`/${locale}/check-in`);
    expect(await cameraPolicy(page)).toEqual({
      camera: true,
      microphone: false,
      payment: false,
    });
    const checkinDocument = await documentIdentity(page);
    const documents: string[] = [];
    page.on("request", (request) => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame())
        documents.push(request.url());
    });
    await page
      .locator("nav.pasa-dock")
      .getByRole("link", {
        name: locale === "es" ? "Inicio" : "Home",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${locale}$`));
    const homeDocument = await documentIdentity(page);
    const policy = await cameraPolicy(page);
    await testInfo.attach("Native Check-in to Home document boundary", {
      body: JSON.stringify({
        checkinDocument,
        homeDocument,
        documents,
        policy,
      }),
      contentType: "application/json",
    });
    expect.soft(homeDocument).not.toBe(checkinDocument);
    expect
      .soft(documents)
      .toContainEqual(expect.stringMatching(new RegExp(`/${locale}$`)));
    expect(policy).toEqual({
      camera: false,
      microphone: false,
      payment: false,
    });
    expect(
      await page.evaluate(async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          stream.getTracks().forEach((track) => track.stop());
          return null;
        } catch (error) {
          return (error as DOMException).name;
        }
      }),
    ).toBe("NotAllowedError");
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/${locale}/check-in$`));
    expect(await cameraPolicy(page)).toEqual({
      camera: true,
      microphone: false,
      payment: false,
    });
    await expect(
      page.getByLabel(
        locale === "es" ? "Vista previa de cámara" : "Camera preview",
      ),
    ).toHaveJSProperty("srcObject", null);
    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`/${locale}$`));
    expect(await cameraPolicy(page)).toEqual({
      camera: false,
      microphone: false,
      payment: false,
    });
  });
}
