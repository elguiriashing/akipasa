// Reuse the existing disposable Owner fixture unchanged; add native pointer and keyboard clearance proof.
// This does not establish real Owner Auth/RLS/storage or physical-device acceptance.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const fixture = readFileSync(
  "scripts/test-owner-read-recovery-browser.mjs",
  "utf8",
);
const marker = '  for (const locale of ["en", "es"])';
if (!fixture.includes(marker))
  throw Error("Owner fixture structure changed; inspect before adapting");
let setup = fixture.slice(0, fixture.indexOf(marker));
setup = setup.replace(
  'resolve(root, "test-results/owner-read-recovery")',
  'resolve(process.env.OWNER_CLEARANCE_OUTPUT || "test-results/owner-launcher-clearance")',
);
const exercise = async ({ browser, origin, out, results, writeFileSync }) => {
  for (const locale of ["en", "es"])
    for (const theme of ["dark", "light"])
      for (const width of [360, 390, 820, 1440]) {
        const context = await browser.newContext({
          viewport: { width, height: width === 820 ? 1180 : 900 },
          colorScheme: theme,
          reducedMotion: "reduce",
        });
        await context.route("**/*", (route) =>
          new URL(route.request().url()).origin === origin &&
          ["GET", "HEAD"].includes(route.request().method())
            ? route.continue()
            : route.abort(),
        );
        const page = await context.newPage();
        await page.goto(
          `${origin}/${locale}/owner?locale=${locale}&theme=${theme}&scenario=unavailable`,
          { waitUntil: "networkidle" },
        );
        await page.waitForFunction(() => window.ready || window.failure);
        const target = page.locator("[role=alert] a").first();
        const measure = () =>
          page.evaluate(() => {
            const a = document.querySelector("[role=alert] a"),
              t = document.querySelector(".owner-toolbox-trigger"),
              b = a.getBoundingClientRect(),
              d = t.getBoundingClientRect();
            const points = [
              [0.15, 0.5],
              [0.5, 0.5],
              [0.85, 0.5],
              [0.85, 0.85],
              [0.5, 0.85],
            ].map(([x, y]) => {
              let px = b.x + b.width * x,
                py = b.y + b.height * y,
                e = document.elementFromPoint(px, py);
              return {
                x: px,
                y: py,
                clear: !!e && (e === a || a.contains(e)),
                hit: e?.outerHTML.slice(0, 180),
              };
            });
            return {
              retry: { x: b.x, y: b.y, width: b.width, height: b.height },
              launcher: { x: d.x, y: d.y, width: d.width, height: d.height },
              overlap:
                Math.max(
                  0,
                  Math.min(b.right, d.right) - Math.max(b.left, d.left),
                ) *
                Math.max(
                  0,
                  Math.min(b.bottom, d.bottom) - Math.max(b.top, d.top),
                ),
              points,
            };
          });
        const initial = await measure();
        await target.focus();
        await page.keyboard.press("Shift+Tab");
        await page.keyboard.press("Tab");
        if (!(await target.evaluate((e) => e === document.activeElement)))
          throw Error("Native Tab did not restore Retry focus");
        const focused = await measure();
        if (
          initial.overlap ||
          focused.overlap ||
          initial.points.some((p) => !p.clear) ||
          focused.points.some((p) => !p.clear)
        )
          throw Error(`Retry obscured ${locale}/${theme}/${width}`);
        await page.screenshot({
          path: out + `/${locale}-${theme}-${width}-initial.png`,
        });
        for (const mode of ["pointer", "keyboard"]) {
          if (mode === "keyboard") {
            await page.goto(
              `${origin}/${locale}/owner?locale=${locale}&theme=${theme}&scenario=unavailable`,
              { waitUntil: "networkidle" },
            );
            await page.waitForFunction(() => window.ready || window.failure);
            await target.focus();
            await page.keyboard.press("Shift+Tab");
            await page.keyboard.press("Tab");
          }
          await Promise.all([
            page.waitForNavigation({ waitUntil: "networkidle" }),
            mode === "pointer"
              ? target.click({
                  position: {
                    x: initial.retry.width * 0.85,
                    y: initial.retry.height * 0.5,
                  },
                })
              : page.keyboard.press("Enter"),
          ]);
          await page.waitForFunction(() => window.ready || window.failure);
          const recovery = await page.evaluate(() => ({
            alerts: document.querySelectorAll("[role=alert]").length,
            form: document.querySelectorAll(".owner-preferences-form").length,
            actions: window.__ownerActions.length,
            launcher: document.querySelectorAll(".owner-toolbox-trigger")
              .length,
          }));
          if (
            recovery.alerts ||
            recovery.form !== 1 ||
            recovery.actions ||
            recovery.launcher !== 1
          )
            throw Error("Native " + mode + " recovery failed");
        }
        results.push({
          locale,
          theme,
          width,
          initial,
          focused,
          pointerRecovery: true,
          keyboardRecovery: true,
        });
        await context.close();
      }
  writeFileSync(out + "/probe.json", JSON.stringify(results, null, 2));
  console.log(
    JSON.stringify(
      results.map((x) => ({
        locale: x.locale,
        theme: x.theme,
        width: x.width,
        overlap: x.initial.overlap,
        blocked: x.initial.points.filter((p) => !p.clear).length,
      })),
      null,
      2,
    ),
  );
};
const loop = `await (${exercise.toString()})({ browser, origin, out, results, writeFileSync });
} finally { await browser?.close(); await new Promise(r => server.close(r)); }`;
const result = spawnSync(process.execPath, ["--input-type=module"], {
  input: setup + loop,
  stdio: ["pipe", "inherit", "inherit"],
  env: process.env,
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
