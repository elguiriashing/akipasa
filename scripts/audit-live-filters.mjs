import { chromium } from "@playwright/test";

const origin = process.argv[2] ?? "https://akipasa.com";
const chromeExecutable =
  process.env.AKIPASA_AUDIT_CHROME ??
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const routes = ["/es", "/es/map"];

const browser = await chromium.launch({
  executablePath: chromeExecutable,
  headless: true,
});

const report = [];

try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "es-ES",
    colorScheme: "dark",
  });

  for (const route of routes) {
    const page = await context.newPage();
    const runtimeErrors = [];
    page.on("pageerror", (error) => runtimeErrors.push(String(error)));

    const response = await page.goto(new URL(route, origin).href, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await page
      .waitForLoadState("networkidle", { timeout: 10_000 })
      .catch(() => {});

    const form = page.locator("form.filters-shell");
    await form.waitFor({ state: "visible" });
    await page.waitForFunction(() => {
      const activeForm = document.querySelector("form.filters-shell");
      return (
        activeForm instanceof HTMLFormElement &&
        activeForm.dataset.autoSubmitReady === "true"
      );
    });

    await page.evaluate(() => {
      window.__akipasaFilterAuditMarker = crypto.randomUUID();
    });
    const marker = await page.evaluate(() => window.__akipasaFilterAuditMarker);
    const navigationCountBefore = await page.evaluate(
      () => performance.getEntriesByType("navigation").length,
    );

    const submitLabels = await form
      .locator("button, input[type='submit']")
      .allTextContents();
    const manualSubmitPresent = submitLabels.some((label) =>
      /(?:ver|mostrar|show)\s+(?:los\s+)?planes/iu.test(label),
    );

    const radius = form.locator("select[name='radius']");
    await radius.selectOption("50");
    await page.waitForURL((url) => url.searchParams.get("radius") === "50", {
      timeout: 20_000,
    });
    await page.waitForFunction(() => {
      const activeForm = document.querySelector("form.filters-shell");
      return (
        activeForm instanceof HTMLFormElement &&
        activeForm.dataset.autoSubmitReady === "true"
      );
    });

    const advancedFilters = form.locator(
      "details.filter-group:not(.filter-group-primary)",
    );
    if (!(await advancedFilters.getAttribute("open"))) {
      await advancedFilters.locator("summary").click();
    }

    const accessibility = form.locator("input[name='accessible']");
    await accessibility.scrollIntoViewIfNeeded();
    await accessibility.check();
    await page.waitForURL(
      (url) =>
        url.searchParams.get("radius") === "50" &&
        url.searchParams.get("accessible") === "on",
      { timeout: 20_000 },
    );
    await page.waitForFunction(() => {
      const activeForm = document.querySelector("form.filters-shell");
      return (
        activeForm instanceof HTMLFormElement &&
        activeForm.dataset.autoSubmitReady === "true"
      );
    });

    const finalState = await page.evaluate(() => ({
      marker: window.__akipasaFilterAuditMarker,
      navigationCount: performance.getEntriesByType("navigation").length,
      radius: new URL(location.href).searchParams.get("radius"),
      accessible: new URL(location.href).searchParams.get("accessible"),
      checkboxChecked:
        document.querySelector("input[name='accessible']")?.checked ?? false,
      autoSubmitReady:
        document.querySelector("form.filters-shell")?.dataset
          .autoSubmitReady === "true",
    }));

    report.push({
      route,
      httpStatus: response?.status() ?? null,
      manualSubmitPresent,
      radiusUpdatedLive: finalState.radius === "50",
      accessibilityUpdatedLive:
        finalState.accessible === "on" && finalState.checkboxChecked,
      noFullReload:
        finalState.marker === marker &&
        finalState.navigationCount === navigationCountBefore,
      autoSubmitReady: finalState.autoSubmitReady,
      runtimeErrors: [...new Set(runtimeErrors)],
      finalUrl: page.url(),
    });

    await page.close();
  }

  await context.close();
} finally {
  await browser.close();
}

const failures = report.filter(
  (entry) =>
    entry.httpStatus !== 200 ||
    entry.manualSubmitPresent ||
    !entry.radiusUpdatedLive ||
    !entry.accessibilityUpdatedLive ||
    !entry.noFullReload ||
    !entry.autoSubmitReady ||
    entry.runtimeErrors.length > 0,
);

console.log(JSON.stringify({ failures, report }, null, 2));
process.exitCode = failures.length ? 1 : 0;
