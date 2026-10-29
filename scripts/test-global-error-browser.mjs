import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  symlink,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { chromium, expect } from "@playwright/test";

// An isolated production Next app exercises the actual global-error component.
// Only its root layout/page and failure marker are disposable fixtures.
const output = resolve("test-results/global-error");
await mkdir(output, { recursive: true });
const fixture = await mkdtemp(join(tmpdir(), "akipasa-global-error-"));
const marker = join(fixture, "fail-root");
const hashes = {};
for (const path of [
  "src/app/global-error.tsx",
  "src/app/global-error.module.css",
]) {
  hashes[path] = createHash("sha256")
    .update(await readFile(resolve(path)))
    .digest("hex");
}
hashes["scripts/test-global-error-browser.mjs"] = createHash("sha256")
  .update(await readFile(new URL(import.meta.url)))
  .digest("hex");
let server, browser;
const logs = [];
const run = (args) =>
  new Promise((done, reject) => {
    const child = spawn(
      process.execPath,
      [resolve("node_modules/next/dist/bin/next"), ...args],
      {
        cwd: fixture,
        env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      },
    );
    child.stdout.on("data", (chunk) => logs.push(String(chunk)));
    child.stderr.on("data", (chunk) => logs.push(String(chunk)));
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? done()
        : reject(new Error(`Fixture Next failed (${code}); see build.log`)),
    );
  });
const cases = [];
try {
  await mkdir(join(fixture, "app"));
  await symlink(resolve("node_modules"), join(fixture, "node_modules"), "dir");
  await writeFile(
    join(fixture, "package.json"),
    JSON.stringify({
      private: true,
      scripts: {},
      dependencies: {
        next: JSON.parse(
          await readFile(resolve("node_modules/next/package.json")),
        ).version,
        react: JSON.parse(
          await readFile(resolve("node_modules/react/package.json")),
        ).version,
        "react-dom": JSON.parse(
          await readFile(resolve("node_modules/react-dom/package.json")),
        ).version,
      },
    }),
  );
  await writeFile(
    join(fixture, "next.config.mjs"),
    "export default {experimental:{externalDir:true}};",
  );
  await symlink(
    resolve("src/app/global-error.tsx"),
    join(fixture, "app/global-error.tsx"),
  );
  await symlink(
    resolve("src/app/global-error.module.css"),
    join(fixture, "app/global-error.module.css"),
  );
  await writeFile(
    join(fixture, "app/layout.tsx"),
    `import {connection} from 'next/server';import {existsSync} from 'node:fs';export default async function Layout({children}){await connection();if(existsSync(${JSON.stringify(marker)}))throw new Error('PRIVATE_ROOT_LAYOUT_CANARY');return <html lang="en"><body>{children}</body></html>}`,
  );
  await writeFile(
    join(fixture, "app/page.tsx"),
    "export default function Page(){return <main><h1>Disposable root recovered</h1></main>}",
  );
  await run(["build", "--webpack"]);
  const socket = createServer();
  await new Promise((done) => socket.listen(0, "127.0.0.1", done));
  const port = socket.address().port;
  await new Promise((done) => socket.close(done));
  server = spawn(
    process.execPath,
    [
      resolve("node_modules/next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    { cwd: fixture, env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } },
  );
  server.stdout.on("data", (chunk) => logs.push(String(chunk)));
  server.stderr.on("data", (chunk) => logs.push(String(chunk)));
  const origin = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    if (attempt === 99) throw new Error("Fixture server not ready");
    await new Promise((done) => setTimeout(done, 200));
  }
  browser = await chromium.launch({
    executablePath:
      process.env.BOOKING_BROWSER_PATH ||
      "/home/agent/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome",
    headless: true,
  });
  for (const theme of ["light", "dark"])
    for (const width of [360, 390, 820, 1440]) {
      await writeFile(marker, "local fixture only");
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        colorScheme: theme,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      const mutations = [],
        external = [];
      page.on("request", (request) => {
        if (!["GET", "HEAD"].includes(request.method()))
          mutations.push(request.method());
        if (!request.url().startsWith(origin)) external.push(request.url());
      });
      await page.goto(origin, { waitUntil: "networkidle" });
      await expect(
        page.getByRole("heading", {
          name: "We couldn’t open this page",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", {
          name: "No hemos podido abrir esta página",
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        "noindex, nofollow",
      );
      await expect(page.locator('[lang="es"]').first()).toBeVisible();
      expect(await page.locator("body").innerText()).not.toMatch(
        /PRIVATE_ROOT_LAYOUT_CANARY|digest|stack|Error:|incident/i,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
      ).toBe(false);
      const retry = page.getByRole("link", {
        name: "Retry · Reintentar",
        exact: true,
      });
      expect(
        await retry.evaluate(
          (element) => element.getBoundingClientRect().height,
        ),
      ).toBeGreaterThanOrEqual(44);
      const visual = await retry.evaluate((element) => {
        const rgb = (value) => (value.match(/[\d.]+/g) || []).map(Number);
        const lum = (value) =>
          rgb(value)
            .slice(0, 3)
            .map((channel) => {
              const c = channel / 255;
              return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
            })
            .reduce(
              (sum, c, index) => sum + c * [0.2126, 0.7152, 0.0722][index],
              0,
            );
        const css = getComputedStyle(element),
          a = lum(css.color),
          b = lum(css.backgroundColor);
        return {
          contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
          animation: css.animationName,
          reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
        };
      });
      expect(visual.contrast).toBeGreaterThanOrEqual(4.5);
      expect(visual.animation).toBe("none");
      expect(visual.reducedMotion).toBe(true);
      await page.keyboard.press("Tab");
      await expect(retry).toBeFocused();
      await page.screenshot({
        path: join(output, `${theme}-${width}-failure.png`),
        fullPage: true,
      });
      await rm(marker);
      const navigation = page.waitForNavigation({ waitUntil: "networkidle" });
      await page.keyboard.press("Enter");
      await navigation;
      await expect(
        page.getByRole("heading", {
          name: "Disposable root recovered",
          exact: true,
        }),
      ).toBeVisible();
      expect(mutations).toEqual([]);
      expect(external).toEqual([]);
      cases.push({
        theme,
        width,
        reducedMotion: true,
        rootFailure: true,
        keyboardGetRecovery: true,
        mutationRequests: 0,
        externalRequests: 0,
        retryContrast: visual.contrast,
      });
      await context.close();
    }
  await writeFile(
    join(output, "evidence.json"),
    JSON.stringify(
      {
        fixture: true,
        liveAcceptance: false,
        observedAt: new Date().toISOString(),
        hashes,
        cases,
      },
      null,
      2,
    ),
  );
  console.log(`Global-error production fixture: ${cases.length} cases passed`);
} finally {
  await browser?.close();
  server?.kill("SIGTERM");
  await writeFile(join(output, "build.log"), logs.join(""));
  await rm(fixture, { recursive: true, force: true });
}
