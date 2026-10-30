import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

async function waitForVisiblePassportImages(page: Page) {
  await expect
    .poll(
      async () =>
        page.locator("main.passport-experience img").evaluateAll((images) =>
          images
            .filter((image) => {
              const box = image.getBoundingClientRect();
              let left = Math.max(0, box.left),
                right = Math.min(innerWidth, box.right),
                top = Math.max(0, box.top),
                bottom = Math.min(innerHeight, box.bottom);
              let parent = image.parentElement;
              while (parent) {
                const style = getComputedStyle(parent),
                  clip = parent.getBoundingClientRect();
                if (/auto|scroll|hidden|clip/.test(style.overflowX)) {
                  left = Math.max(left, clip.left);
                  right = Math.min(right, clip.right);
                }
                if (/auto|scroll|hidden|clip/.test(style.overflowY)) {
                  top = Math.max(top, clip.top);
                  bottom = Math.min(bottom, clip.bottom);
                }
                parent = parent.parentElement;
              }
              return right > left + 1 && bottom > top + 1;
            })
            .filter(
              (image) =>
                !(image as HTMLImageElement).complete ||
                (image as HTMLImageElement).naturalWidth === 0,
            )
            .map(
              (image) =>
                (image as HTMLImageElement).currentSrc ||
                (image as HTMLImageElement).src,
            ),
        ),
      {
        timeout: 20_000,
        message:
          "Every image actually visible through the Passport nested scroll viewport must decode",
      },
    )
    .toEqual([]);
}

async function openPassportMenu(page: Page, locale: "en" | "es" = "en") {
  if ((page.viewportSize()?.width ?? 0) <= 700) {
    const menu = page.getByRole("button", {
      name: locale === "es" ? "Abrir menú del pasaporte" : "Open passport menu",
      exact: true,
    });
    await expect(menu).toBeVisible();
    if ((await menu.getAttribute("aria-expanded")) !== "true") {
      await menu.click();
    }
    await expect(menu).toHaveAttribute("aria-expanded", "true");
  }
  const chapters = page.getByRole("navigation", {
    name: locale === "es" ? "Capítulos del pasaporte" : "Passport chapters",
  });
  await expect(chapters).toBeVisible();
  return chapters;
}

async function closePassportMenu(page: Page, locale: "en" | "es" = "en") {
  if ((page.viewportSize()?.width ?? 0) > 700) return;
  const menu = page.getByRole("button", {
    name: locale === "es" ? "Abrir menú del pasaporte" : "Open passport menu",
    exact: true,
  });
  if ((await menu.getAttribute("aria-expanded")) === "true") {
    await menu.click();
  }
  await expect(menu).toHaveAttribute("aria-expanded", "false");
}

async function expectComfortableControls(page: Page) {
  expect(
    await page
      .locator("main button, main a.button, main summary")
      .evaluateAll((elements) =>
        elements
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return (
              r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44)
            );
          })
          .map((el) => ({
            label: el.getAttribute("aria-label") || el.textContent,
            width: el.getBoundingClientRect().width,
            height: el.getBoundingClientRect().height,
          })),
      ),
  ).toEqual([]);
}

// Passport interactions model returning visitors; privacy tests exercise first load.
test.beforeEach(async ({ page }, testInfo) => {
  if (!/accept all|reject optional|passport fits/.test(testInfo.title)) {
    await page.addInitScript(() => {
      document.cookie = "ak_consent_version=2; Path=/";
    });
  }
});

test("city pages reuse discovery photos, turn with keys, and expose real discovery links", async ({
  page,
}) => {
  await page.goto("/en/passports");
  await page
    .getByRole("button", { name: "Open passport", exact: true })
    .click();
  await page.getByRole("searchbox", { name: "Find a city" }).fill("malaga");
  await page.getByRole("button", { name: /^Málaga/ }).click();
  const photo = page.getByRole("img", { name: /Málaga/ });
  await expect(photo).toHaveAttribute("src", "/images/cities/malaga.webp");
  await expect(photo).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Explore the city ↗" }),
  ).toHaveAttribute("href", /locality=malaga/);
  await page
    .getByRole("heading", { name: "Málaga", exact: true, level: 2 })
    .press("ArrowRight");
  await expect(
    page.getByRole("heading", { name: "Málaga", exact: true, level: 2 }),
  ).toHaveCount(0);
  await page.locator("h2").filter({ hasText: /.+/ }).first().press("ArrowLeft");
  await expect(page.getByRole("button", { name: "Previous page" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "Next page" })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Málaga", exact: true, level: 2 }),
  ).toBeVisible();
  await openPassportMenu(page);
  const foilControl = page.getByRole("button", {
    name: "Holographic foil",
    exact: true,
  });
  await expect(foilControl).toHaveAttribute("aria-pressed", "true");
  await foilControl.click();
  await expect(foilControl).toHaveAttribute("aria-pressed", "false");
  await closePassportMenu(page);
  await expect(page.locator('[data-shine="false"]')).toBeVisible();
});

test("legacy chapter URLs and reward feedback remain available", async ({
  page,
}) => {
  await page.goto("/en/passports?view=stamps&reward=ready");
  await expect(
    page.getByRole("heading", { name: "Stamp cards" }),
  ).toBeVisible();
  await expect(
    page.getByText("Reward ready. Your code appears in Progress."),
  ).toBeVisible();
});

test("reduced motion disables tilt and page rotation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/es/passports");
  await openPassportMenu(page, "es");
  await expect(
    page.getByRole("button", { name: "Activar inclinación" }),
  ).toBeDisabled();
  await expect(page.locator('[data-motion="off"]')).toBeVisible();
  await expect(page.locator('[data-shine="false"]')).toBeVisible();
  await closePassportMenu(page, "es");
  await page
    .getByRole("button", { name: "Abrir pasaporte", exact: true })
    .click();
  await expect(
    page.getByRole("searchbox", { name: "Busca una ciudad" }),
  ).toBeVisible();
});

test("denied motion permission falls back to touch", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("akipasa:passport-motion", "off");
    Object.defineProperty(window.DeviceOrientationEvent, "requestPermission", {
      value: async () => "denied",
      configurable: true,
    });
  });
  await page.goto("/en/passports");
  await openPassportMenu(page);
  await expect(page.getByRole("button", { name: "Enable tilt" })).toBeVisible();
  await page.getByRole("button", { name: "Enable tilt" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Motion unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enable tilt" }),
  ).toHaveAttribute("aria-pressed", "false");
});

test("granted tilt drives the foil and can be recentered", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("akipasa:passport-motion", "off");
    Object.defineProperty(window.DeviceOrientationEvent, "requestPermission", {
      value: async () => "granted",
      configurable: true,
    });
  });
  await page.goto("/en/passports");
  await openPassportMenu(page);
  await expect(page.getByRole("button", { name: "Enable tilt" })).toBeVisible();
  await page.getByRole("button", { name: "Enable tilt" }).click();
  await page.evaluate(() => {
    window.dispatchEvent(
      new DeviceOrientationEvent("deviceorientation", { beta: 40, gamma: 0 }),
    );
    window.dispatchEvent(
      new DeviceOrientationEvent("deviceorientation", { beta: 52, gamma: 14 }),
    );
  });
  await expect(
    page.getByRole("status").filter({ hasText: "Tilt gently" }),
  ).toBeVisible();
  const foil = page.locator('[data-shine="true"]');
  await expect
    .poll(() =>
      foil.evaluate((el) =>
        Number.parseFloat((el as HTMLElement).style.getPropertyValue("--mx")),
      ),
    )
    .toBeGreaterThan(60);
  await page
    .getByRole("button", { name: "Recenter tilt", exact: true })
    .click();
  await expect
    .poll(() =>
      foil.evaluate((el) =>
        Math.abs(
          Number.parseFloat(
            (el as HTMLElement).style.getPropertyValue("--mx"),
          ) - 50,
        ),
      ),
    )
    .toBeLessThan(0.1);
});

test("horizontal touch gestures turn pages without changing vertical scroll", async ({
  page,
}) => {
  await page.goto("/en/passports");
  const heading = page.getByRole("heading", {
    name: "Passport",
    exact: true,
    level: 2,
  });
  await heading.dispatchEvent("touchstart", {
    touches: [{ identifier: 1, clientX: 300, clientY: 200 }],
  });
  await heading.dispatchEvent("touchend", {
    changedTouches: [{ identifier: 1, clientX: 180, clientY: 202 }],
  });
  await expect(
    page.getByRole("searchbox", { name: "Find a city" }),
  ).toBeVisible();
  const index = page.getByRole("heading", { name: "Cities", exact: true });
  await index.dispatchEvent("touchstart", {
    touches: [{ identifier: 1, clientX: 200, clientY: 200 }],
  });
  await index.dispatchEvent("touchend", {
    changedTouches: [{ identifier: 1, clientX: 190, clientY: 380 }],
  });
  await expect(index).toBeVisible();
});

test("default tilt calibrates while unearned city cards stay still", async ({
  page,
}) => {
  await page.goto("/en/passports");
  await openPassportMenu(page);
  await expect(
    page.getByRole("button", { name: "Disable tilt" }),
  ).toBeVisible();
  // A live sensor supplies its calibration before the user browses city pages.
  await page.evaluate(() =>
    window.dispatchEvent(
      new DeviceOrientationEvent("deviceorientation", { beta: 63, gamma: 18 }),
    ),
  );
  await closePassportMenu(page);
  await page
    .getByRole("button", { name: "Open passport", exact: true })
    .click();
  await page.getByRole("searchbox", { name: "Find a city" }).fill("malaga");
  await page.getByRole("button", { name: /^Málaga/ }).click();
  const card = page.locator("[data-finish]");
  const book = page.locator('[data-tilt="on"]');
  await page.evaluate(() =>
    window.dispatchEvent(
      new DeviceOrientationEvent("deviceorientation", { beta: 63, gamma: 18 }),
    ),
  );
  await expect
    .poll(() =>
      card.evaluate((el) =>
        Number.parseFloat((el as HTMLElement).style.getPropertyValue("--ry")),
      ),
    )
    .toBe(0);
  await page.evaluate(() =>
    window.dispatchEvent(
      new DeviceOrientationEvent("deviceorientation", { beta: 75, gamma: 32 }),
    ),
  );
  await expect
    .poll(() =>
      card.evaluate((el) =>
        Number.parseFloat((el as HTMLElement).style.getPropertyValue("--ry")),
      ),
    )
    .toBeGreaterThan(1);
  await expect
    .poll(() => card.evaluate((el) => getComputedStyle(el).transform))
    .toBe("none");
  await expect(book).toHaveCSS("transform", "none");
  await expect(
    page.getByRole("link", { name: "Explore the city ↗" }),
  ).toBeVisible();
});

test("accept all requests required motion permission within the click", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.DeviceOrientationEvent, "requestPermission", {
      value: async () => {
        (window as Window & { motionRequests?: number }).motionRequests =
          ((window as Window & { motionRequests?: number }).motionRequests ||
            0) + 1;
        return "granted";
      },
      configurable: true,
    });
  });
  await page.route("**/api/v1/personalisation/consent", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );
  await page.goto("/en");
  await page.getByRole("button", { name: "Accept all", exact: true }).click();
  expect(
    await page.evaluate(
      () => (window as Window & { motionRequests?: number }).motionRequests,
    ),
  ).toBe(1);
  expect(
    await page.evaluate(() => localStorage.getItem("akipasa:passport-motion")),
  ).toBe("on");
  await page.goto("/en/passports");
  await openPassportMenu(page);
  await expect(
    page.getByRole("button", { name: "Disable tilt" }),
  ).toBeVisible();
});

test("reject optional disables motion without requesting sensor permission", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.DeviceOrientationEvent, "requestPermission", {
      value: async () => {
        throw new Error("Should not request motion");
      },
      configurable: true,
    });
  });
  await page.route("**/api/v1/personalisation/consent", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );
  await page.goto("/en/passports");
  await page
    .getByRole("button", { name: "Reject optional", exact: true })
    .click();
  await expect(page.locator('[data-tilt="off"]')).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("akipasa:passport-motion")),
  ).toBe("off");
  await page.reload();
  await openPassportMenu(page);
  await expect(page.getByRole("button", { name: "Enable tilt" })).toBeVisible();
});

for (const viewport of [
  { name: "small phone", width: 320, height: 740, columns: 2, spread: 1 },
  { name: "phone", width: 390, height: 844, columns: 2, spread: 1 },
  { name: "tablet portrait", width: 820, height: 1180, columns: 6, spread: 2 },
  { name: "tablet landscape", width: 1024, height: 768, columns: 6, spread: 2 },
  { name: "desktop", width: 1440, height: 1000, columns: 1, spread: 2 },
]) {
  test(`passport fits ${viewport.name} with comfortable controls`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/v1/personalisation/consent", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "{}",
      }),
    );
    await page.goto("/en/passports");
    const privacy = page.locator("aside.personalisation-consent");
    await expect(privacy).toBeVisible();
    expect(
      await privacy.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return (
          r.x >= 0 &&
          r.right <= innerWidth &&
          r.y >= 0 &&
          r.bottom <= innerHeight
        );
      }),
    ).toBe(true);
    await privacy
      .getByRole("button", { name: "Accept all", exact: true })
      .click();
    const bookmarks = await openPassportMenu(page);
    expect(
      await bookmarks.evaluate(
        (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
      ),
    ).toBe(viewport.columns);
    await expectComfortableControls(page);
    await closePassportMenu(page);
    await page
      .getByRole("button", { name: "Open passport", exact: true })
      .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("searchbox", { name: "Find a city" }).fill("malaga");
    await page.getByRole("button", { name: /^Málaga/ }).click();
    expect(
      await page
        .getByRole("link", { name: "Explore the city ↗" })
        .evaluate(
          (el) =>
            getComputedStyle(
              el.parentElement!.parentElement!,
            ).gridTemplateColumns.split(" ").length,
        ),
    ).toBe(viewport.spread);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expectComfortableControls(page);
    await page.screenshot({
      path: `test-results/passport-${viewport.name.replaceAll(" ", "-")}.png`,
      fullPage: true,
    });
  });
}

test("unearned city cards show grey stamp slots and offer category progress", async ({
  page,
}) => {
  await page.goto("/en/passports?city=fuengirola");
  const card = page.locator("[data-finish]");
  await expect(card).toHaveAttribute("data-finish", "plain");
  await expect(card).toHaveAttribute("data-shine", "false");
  await expect(page.getByRole("img", { name: /Fuengirola/ })).toHaveAttribute(
    "src",
    "/passport-placeholder.svg",
  );
  await expect(card.locator('button[data-tier="0"]')).toHaveCount(10);
  await expect(
    page.getByLabel("View stamp progress").locator("option"),
  ).toHaveCount(11);
  await expect(page.getByTestId("passport-negative")).toBeHidden();
  await expect(page.getByTestId("passport-echo")).toBeHidden();
  await page.getByLabel("View stamp progress").selectOption("restaurant");
  await expect(
    page.getByRole("button", { name: "Close details" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Close details" }).click();
  await expect(page.getByRole("button", { name: "Close details" })).toHaveCount(
    0,
  );
});

for (const locale of ["en", "es"] as const) {
  test(`${locale} passport start acknowledgement uses the actual route deadline`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/passports?passport=started`);
    await expect(
      page.getByText(
        locale === "es"
          ? "Pasaporte iniciado. Consulta la fecha límite de tu ruta en Progreso."
          : "Passport started. Check your route’s deadline in Progress.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByText(/(?:Tienes 30 d[ií]as|You have 30 days)/),
    ).toHaveCount(0);
  });
}

for (const locale of ["en", "es"] as const) {
  for (const width of [360, 390, 820, 1440]) {
    for (const theme of ["dark", "light"] as const) {
      test(`${locale} ${width}/${theme} generated chapter links survive reload and city labels stay readable`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({
          reducedMotion: "reduce",
          colorScheme: theme,
        });
        await page.addInitScript(
          (value) => localStorage.setItem("akipasa.theme", value),
          theme,
        );
        await page.goto(`/${locale}/passports`);
        await page
          .getByRole("button", {
            name: locale === "es" ? "Abrir pasaporte" : "Open passport",
            exact: true,
          })
          .click();
        await expect(page).toHaveURL(/view=index/);
        await page.reload();
        await expect(
          page.getByRole("heading", {
            name: locale === "es" ? "Ciudades" : "Cities",
            exact: true,
          }),
        ).toBeVisible();
        const card = page.getByRole("button", { name: /^Málaga/ });
        await card.scrollIntoViewIfNeeded();
        const contrast = await card.evaluate((button) => {
          // Include wrapped long city names, not only the Málaga sample.
          return [
            ...button.parentElement!.querySelectorAll(":scope > button"),
          ].flatMap((cityCard) => {
            const gradient = getComputedStyle(
              cityCard,
              "::after",
            ).backgroundImage;
            const stops = [...gradient.matchAll(/rgba?\(([^)]+)\)/g)].map(
              (match) => match[1].split(",").map(Number),
            );
            if (stops.length !== 2 || stops.some((stop) => stop.length !== 4))
              throw Error(`Unexpected city scrim: ${gradient}`);
            const bounds = cityCard.getBoundingClientRect();
            const luminance = (channels: number[]) =>
              channels
                .slice(0, 3)
                .map((channel) => channel / 255)
                .map((channel) =>
                  channel <= 0.04045
                    ? channel / 12.92
                    : ((channel + 0.055) / 1.055) ** 2.4,
                )
                .reduce(
                  (sum, value, index) =>
                    sum + value * [0.2126, 0.7152, 0.0722][index],
                  0,
                );
            return [...cityCard.querySelectorAll("b, small")].map((label) => {
              const top =
                (label.getBoundingClientRect().top - bounds.top) /
                bounds.height;
              const alpha =
                stops[0][3] +
                (stops[1][3] - stops[0][3]) * Math.max(0, Math.min(1, top));
              // White is the brightest possible photograph pixel. Composite the
              // actual scrim at the label's actual top for a conservative bound.
              const background = stops[0]
                .slice(0, 3)
                .map((channel) => channel * alpha + 255 * (1 - alpha));
              const foreground = getComputedStyle(label)
                .color.match(/[\d.]+/g)!
                .map(Number);
              const a = luminance(foreground),
                b = luminance(background);
              return {
                label: label.textContent,
                ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
              };
            });
          });
        });
        for (const result of contrast)
          expect(
            result.ratio,
            `${result.label}: worst-case photo contrast`,
          ).toBeGreaterThanOrEqual(4.5);
        await waitForVisiblePassportImages(page);
        await page.screenshot({
          path: `test-results/passport-city-contrast-${locale}-${width}-${theme}.png`,
          fullPage: false,
          animations: "disabled",
        });
        await card.click();
        await page.reload();
        await expect(
          page.getByRole("heading", { name: "Málaga", exact: true, level: 2 }),
        ).toBeVisible();
        const menu = await openPassportMenu(page, locale);
        await menu
          .getByRole("button", {
            name: locale === "es" ? /Pasaporte$/ : /Passport$/,
          })
          .click();
        await expect(page).toHaveURL(/view=cover/);
        await page.reload();
        await expect(
          page.getByRole("button", {
            name: locale === "es" ? "Abrir pasaporte" : "Open passport",
            exact: true,
          }),
        ).toBeVisible();
        const captures = [];
        const chapters = [
          "cover",
          "index",
          "progress",
          "passports",
          "stamps",
          "badges",
        ];
        for (const [index, chapter] of chapters.entries()) {
          const navigation = await openPassportMenu(page, locale);
          const button = navigation.locator(":scope > button").nth(index);
          await button.focus();
          await button.press("Enter");
          await expect(page).toHaveURL(new RegExp(`view=${chapter}`));
          await expect(
            page
              .getByRole("main", {
                name:
                  locale === "es"
                    ? "Pasaporte interactivo"
                    : "Interactive passport",
                exact: true,
              })
              .locator("h2")
              .first(),
          ).toBeVisible();
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
          const file = `test-results/passport-release/${locale}-${width}-${theme}-${chapter}.png`;
          mkdirSync("test-results/passport-release", { recursive: true });
          await waitForVisiblePassportImages(page);
          await page.screenshot({
            path: file,
            fullPage: false,
            animations: "disabled",
          });
          captures.push({ chapter, file });
        }
        const files = [
          "src/components/PassportBook.module.css",
          "src/app/[locale]/passports/page.tsx",
          "src/components/PassportBook.tsx",
          "src/lib/passport-collection.ts",
          "tests/e2e/passport-book.spec.ts",
        ];
        writeFileSync(
          `test-results/passport-release/${locale}-${width}-${theme}.json`,
          JSON.stringify(
            {
              sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
                encoding: "utf8",
              }).trim(),
              sourceDirty: Boolean(
                execFileSync("git", ["status", "--porcelain"], {
                  encoding: "utf8",
                }).trim(),
              ),
              sourceHashes: Object.fromEntries(
                files.map((file) => [
                  file,
                  createHash("sha256").update(readFileSync(file)).digest("hex"),
                ]),
              ),
              locale,
              width,
              theme,
              role: "guest",
              syntheticBackend: true,
              physicalAndroid: false,
              providerRLSAcceptance: false,
              captures,
            },
            null,
            2,
          ),
        );
      });
    }
  }
}
