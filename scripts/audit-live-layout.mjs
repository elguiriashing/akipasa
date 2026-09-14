import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "@playwright/test";

const origin = process.argv[2] ?? "https://akipasa.com";
const crmAudit = new URL(origin).hostname === "crm.akipasa.com";
const chromeExecutable =
  process.env.AKIPASA_AUDIT_CHROME ??
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const outputDirectory = join(tmpdir(), "akipasa-live-layout-audit");

const publicRoutes = [
  "/es",
  "/es/map",
  "/es/community",
  "/es/community?view=suggest",
  "/es/community?view=suggestions",
  "/es/community?view=report",
  "/es/community?view=reports",
  "/es/community/creator",
  "/es/community/creators",
  "/es/creators",
  "/es/membership",
  "/es/passports",
  "/es/business/apply",
  "/es/privacy",
  "/es/terms",
  "/es/terms/accept",
  "/es/auth",
  "/es/auth/recover",
];
const routes = crmAudit ? ["/"] : publicRoutes;

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
];

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({
  executablePath: chromeExecutable,
  headless: true,
});

const report = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      locale: "es-ES",
      colorScheme: "dark",
    });
    const page = await context.newPage();
    const runtimeErrors = [];

    page.on("pageerror", (error) => runtimeErrors.push(String(error)));

    for (const route of routes) {
      runtimeErrors.length = 0;
      const response = await page.goto(new URL(route, origin).href, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
      await page
        .waitForLoadState("networkidle", { timeout: 10_000 })
        .catch(() => {});

      const topMetrics = await page.evaluate(() => {
        const root = document.documentElement;
        const bodyText = document.body?.innerText ?? "";
        return {
          title: document.title,
          url: location.href,
          statusText: bodyText.slice(0, 120),
          clientWidth: root.clientWidth,
          scrollWidth: root.scrollWidth,
          scrollHeight: root.scrollHeight,
          mojibake: /(?:Ã.|Â.|â(?:€|€™|€œ|€\u009d)|�)/u.test(bodyText),
        };
      });

      await page.evaluate(async () => {
        const pause = () => new Promise((resolve) => setTimeout(resolve, 35));
        const step = Math.max(300, Math.floor(window.innerHeight * 0.75));
        for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
          window.scrollTo({ top: y, behavior: "instant" });
          await pause();
        }
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: "instant",
        });
        await pause();
      });

      const bottomMetrics = await page.evaluate(() => ({
        scrollY: window.scrollY,
        viewportBottom: window.scrollY + window.innerHeight,
        documentHeight: document.documentElement.scrollHeight,
        fixedNavigation: [
          ...document.querySelectorAll("nav, [role='navigation']"),
        ]
          .map((element) => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return {
              position: style.position,
              top: Math.round(rect.top),
              bottom: Math.round(rect.bottom),
              width: Math.round(rect.width),
              visible: rect.width > 0 && rect.height > 0,
            };
          })
          .filter((item) => item.visible && item.position === "fixed"),
      }));

      const screenshotRoute =
        route
          .replace(/^\/es\/?/u, "")
          .replace(/[^a-z0-9]+/giu, "-")
          .replace(/^-|-$/gu, "") || "discover";
      if (
        [
          "/",
          "/es",
          "/es/map",
          "/es/membership",
          "/es/business/apply",
        ].includes(route)
      ) {
        await page.screenshot({
          path: join(
            outputDirectory,
            `${viewport.name}-${screenshotRoute}-bottom.png`,
          ),
          fullPage: false,
        });
        await page.evaluate(() =>
          window.scrollTo({ top: 0, behavior: "instant" }),
        );
        await page.screenshot({
          path: join(
            outputDirectory,
            `${viewport.name}-${screenshotRoute}-top.png`,
          ),
          fullPage: false,
        });
      }

      report.push({
        viewport: viewport.name,
        route,
        httpStatus: response?.status() ?? null,
        redirectedTo: new URL(topMetrics.url).pathname,
        overflowPixels: Math.max(
          0,
          topMetrics.scrollWidth - topMetrics.clientWidth,
        ),
        scrolledToBottom:
          bottomMetrics.viewportBottom >= bottomMetrics.documentHeight - 2,
        mojibake: topMetrics.mojibake,
        runtimeErrors: [...new Set(runtimeErrors)],
        fixedNavigation: bottomMetrics.fixedNavigation,
        documentHeight: topMetrics.scrollHeight,
        title: topMetrics.title,
      });
    }

    await context.close();
  }
} finally {
  await browser.close();
}

console.log(
  JSON.stringify(
    {
      outputDirectory,
      failures: report.filter(
        (entry) =>
          entry.httpStatus !== 200 ||
          entry.overflowPixels > 0 ||
          !entry.scrolledToBottom ||
          entry.mojibake ||
          entry.runtimeErrors.length > 0,
      ),
      report,
    },
    null,
    2,
  ),
);
