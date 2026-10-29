import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const origin = "http://127.0.0.1:3597";
const browser = await chromium.launch({
  executablePath: process.env.BOOKING_BROWSER_PATH,
  headless: true,
});
const results = [];
const blocked = [];
const errors = [];
await mkdir("test-results/first-live", { recursive: true });
try {
  for (const locale of ["en", "es"])
    for (const theme of ["light", "dark"])
      for (const width of [360, 390, 820, 1440]) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          colorScheme: theme,
          reducedMotion: "reduce",
          hasTouch: width < 820,
        });
        await context.addCookies([
          { name: "ak_consent_version", value: "2", url: origin },
        ]);
        await context.addInitScript(
          (t) => localStorage.setItem("akipasa.theme", t),
          theme,
        );
        const page = await context.newPage();
        page.on("pageerror", (e) => errors.push(e.message));
        await page.route(/^https?:\/\//, (route) => {
          const req = route.request();
          if (new URL(req.url()).origin !== origin) {
            blocked.push(new URL(req.url()).origin);
            return route.abort();
          }
          assert.equal(req.method(), "GET");
          return route.continue();
        });
        const response = await page.goto(`${origin}/${locale}`);
        assert.equal(response.status(), 200);
        const hero = page.locator(
          'section[aria-labelledby="plans-first-title"]',
        );
        await hero.waitFor();
        const search = hero.getByRole("button");
        await search.waitFor({ state: "visible" });
        await search.isEnabled().then(async (ready) => {
          if (!ready)
            await page.waitForFunction(() =>
              document.querySelector(
                'section[aria-labelledby="plans-first-title"] button:not(:disabled)',
              ),
            );
        });
        assert.equal(
          await hero
            .locator("img")
            .evaluate((i) => i.complete && i.naturalWidth > 0),
          true,
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          true,
        );
        const links = await hero.locator("a").evaluateAll((xs) =>
          xs.map((x) => ({
            label: x.textContent,
            href: x.getAttribute("href"),
          })),
        );
        assert.equal(links.length, 5);
        assert(!links.some((x) => x.href === `/${locale}/tonight`));
        for (const link of links.slice(0, 4))
          assert.equal(new URL(link.href, origin).pathname, `/${locale}`);
        assert.equal(new URL(links[4].href, origin).pathname, `/${locale}/map`);
        await page.screenshot({
          path: `test-results/first-live/home-${locale}-${theme}-${width}.png`,
          fullPage: false,
        });
        await search.focus();
        await page.keyboard.press("Enter");
        await page.locator("#global-time").selectOption("weekend");
        await page.waitForURL((u) => u.searchParams.get("time") === "weekend");
        await page.keyboard.press("Escape");
        await hero.getByRole("button").focus();
        await page.keyboard.press("Enter");
        const filters = page.locator(
          '#site-search-panel form[data-search-handlers-ready="true"]',
        );
        await filters.evaluate((form) => form.requestSubmit());
        await page.waitForTimeout(250);
        assert.equal(new URL(page.url()).searchParams.get("time"), "weekend");
        assert.equal(await hero.getByRole("button").isEnabled(), true);
        results.push({
          locale,
          theme,
          width,
          screen: "home",
          links,
          queryNavigation: "weekend and same-value submit preserved",
        });
        for (const mode of ["signin", "signup", "magic", "recover"]) {
          const next = `/${locale}/account/profile`;
          await page.goto(
            `${origin}/${locale}/auth?mode=${mode}&next=${encodeURIComponent(next)}&error=invalid`,
          );
          await page.locator("main.auth-theme-akipasa").waitFor();
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            true,
          );
          const inputs = await page
            .locator('.auth-focus-panel input[name="next"]')
            .evaluateAll((xs) => xs.map((x) => x.value));
          assert(inputs.length > 0);
          assert(inputs.every((x) => x === next));
          assert.equal(
            await page.locator("button.google-button").count(),
            ["signin", "signup"].includes(mode) ? 1 : 0,
          );
          for (const checkbox of await page
            .locator('input[type="checkbox"]')
            .all())
            assert.equal(await checkbox.isChecked(), false);
          assert.equal(
            await page.locator("main.auth-theme-akipasa svg.brand-pin").count(),
            1,
          );
          assert.equal(
            await page
              .locator("main.auth-theme-akipasa svg.brand-pin")
              .evaluate((x) => getComputedStyle(x).overflow),
            "hidden",
          );
          assert.equal(
            await page.locator(".app-bottom-nav").isVisible(),
            false,
          );
          const homeExit = page.locator('header a[aria-label="AkiPasa"]');
          assert.equal(await homeExit.getAttribute("href"), `/${locale}`);
          const visibleHomeExit = (await homeExit.isVisible())
            ? homeExit
            : page.locator(".suite-discovery-brand");
          assert.equal(
            await visibleHomeExit.getAttribute("href"),
            `/${locale}`,
          );
          await visibleHomeExit.focus();
          assert.equal(
            await visibleHomeExit.evaluate(
              (el) => document.activeElement === el,
            ),
            true,
          );
          const support = page.locator(".global-support-trigger");
          assert.equal(
            await support.evaluate((el) => getComputedStyle(el).position),
            "static",
          );
          assert.notEqual(
            await support
              .locator(".global-support-label")
              .evaluate((el) => getComputedStyle(el).display),
            "none",
          );
          for (const submit of await page
            .locator(".auth-focus-panel button[type=submit]")
            .all()) {
            await submit.scrollIntoViewIfNeeded();
            assert.equal(
              await submit.evaluate((el) => {
                const r = el.getBoundingClientRect();
                return el.contains(
                  document.elementFromPoint(
                    r.x + r.width / 2,
                    r.y + r.height / 2,
                  ),
                );
              }),
              true,
            );
          }
          await page.evaluate(
            () => (document.documentElement.dataset.ownerFocus = "true"),
          );
          assert.equal(await support.isVisible(), false);
          await page.evaluate(
            () => delete document.documentElement.dataset.ownerFocus,
          );
          await page.screenshot({
            path: `test-results/first-live/auth-${locale}-${theme}-${width}-${mode}.png`,
            fullPage: true,
          });
          results.push({
            locale,
            theme,
            width,
            screen: "auth",
            mode,
            googleGate: await page.locator("button.google-button").count(),
            next,
          });
        }
        await context.close();
      }
  assert.deepEqual(errors, []);
  await writeFile(
    "test-results/first-live/receipt.json",
    JSON.stringify(
      {
        states: results.length,
        results,
        blockedOrigins: [...new Set(blocked)],
        pageErrors: errors,
        limits:
          "Disposable local fixtures; no auth action/provider/OAuth/customer mutation, no production/device acceptance",
      },
      null,
      2,
    ),
  );
  console.log("PASS " + results.length + " actual Home/Auth states");
} finally {
  await browser.close();
}
