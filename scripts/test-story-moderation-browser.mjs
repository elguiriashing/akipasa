// Actual component, synthetic HTTP fixtures. No real staff session, private media,
// database, provider or production decision is exercised by this browser proof.
import { build } from "esbuild";
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
const out = resolve(
  process.env.STORY_MODERATION_OUTPUT || "test-results/story-moderation",
);
mkdirSync(out, { recursive: true });
const files = [
  "src/components/community/StoryModeration.tsx",
  "src/components/community/StoryModeration.module.css",
  "scripts/test-story-moderation-browser.mjs",
];
const pins = () =>
  Object.fromEntries(
    files.map((p) => [
      p,
      createHash("sha256").update(readFileSync(p)).digest("hex"),
    ]),
  );
const before = pins();
const compiled = await build({
  stdin: {
    contents: `import React from "react";import {createRoot} from "react-dom/client";import {StoryModeration} from "./src/components/community/StoryModeration";createRoot(document.getElementById("root")).render(<StoryModeration locale={new URLSearchParams(location.search).get("locale")||"en"}/>);`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  bundle: true,
  write: false,
  outdir: out,
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  loader: { ".css": "local-css" },
  define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" },
});
const js = compiled.outputFiles.find((f) => f.path.endsWith(".js")).text;
const css = compiled.outputFiles.find((f) => f.path.endsWith(".css")).text;
const server = createServer((req, res) => {
  if (req.url === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(js);
  } else if (req.url === "/style.css") {
    res.setHeader("Content-Type", "text/css");
    res.end(css);
  } else {
    res.setHeader("Content-Type", "text/html");
    const q = new URL(req.url, "http://local").searchParams;
    res.end(
      `<html data-theme="${q.get("theme") === "light" ? "light" : "dark"}"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><style>body{margin:0;padding:20px;background:${q.get("theme") === "light" ? "#f5eee5" : "#0a0908"};font-family:Arial,sans-serif}#root{max-width:1100px;margin:auto}button,textarea{scroll-margin:30px}</style><div id="root"></div><script src="/bundle.js"></script></html>`,
    );
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = "http://127.0.0.1:" + server.address().port;
let browser;
const results = [];
const id = "00000000-0000-4000-8000-000000000041";
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.BOOKING_BROWSER_PATH
      ? { executablePath: process.env.BOOKING_BROWSER_PATH }
      : {}),
  });
  for (const locale of ["en", "es"])
    for (const theme of ["dark", "light"])
      for (const width of [360, 390, 820, 1440]) {
        const context = await browser.newContext({
          viewport: { width, height: width === 820 ? 1180 : 900 },
          reducedMotion: "reduce",
          colorScheme: theme,
        });
        let state = "pending",
          posted = false;
        const decisions = [],
          external = [],
          errors = [];
        await context.route("**/*", async (route) => {
          const req = route.request(),
            url = new URL(req.url());
          if (url.origin !== origin) {
            external.push(url.origin);
            return route.abort();
          }
          if (url.pathname === `/api/community/stories/${id}/media`)
            return route.fulfill({
              contentType: "image/svg+xml",
              body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="800"><rect width="640" height="800" fill="#4e3022"/><text x="45" y="400" fill="#fff" font-size="32">Synthetic review artwork</text></svg>',
            });
          if (url.pathname === `/api/community/stories/${id}/moderate`) {
            decisions.push(req.postDataJSON());
            posted = true;
            return route.fulfill({ json: { available: true } });
          }
          if (url.pathname === "/api/community/stories/moderation") {
            if (state === "error")
              return route.fulfill({ status: 503, json: { available: false } });
            if (state === "restricted")
              return route.fulfill({ status: 403, json: { available: false } });
            const reported = url.searchParams.get("queue") === "reported";
            return route.fulfill({
              json: {
                available: true,
                stories:
                  posted || state === "empty"
                    ? []
                    : [
                        {
                          id,
                          citySlug: "malaga",
                          venueName: "Disposable review venue",
                          caption:
                            "Synthetic submitted content — not a real visitor or public story.",
                          kind: "venue",
                          status: reported ? "approved" : "pending",
                          createdAt: "2026-10-31T12:00:00Z",
                          expiresAt: "2026-11-01T12:00:00Z",
                          mediaUrl: `/api/community/stories/${id}/media`,
                          reportCount: reported ? 2 : 0,
                        },
                      ],
              },
            });
          }
          if (!["GET", "HEAD"].includes(req.method()))
            throw Error("Unexpected fixture write");
          return route.continue();
        });
        const page = await context.newPage();
        page.on("pageerror", (e) => errors.push(e.message));
        const name = `${locale}-${theme}-${width}`;
        await page.goto(`${origin}/?locale=${locale}&theme=${theme}`, {
          waitUntil: "networkidle",
        });
        const approve = page.getByRole("button", {
          name: locale === "es" ? "Aprobar publicación" : "Approve publication",
        });
        await approve.waitFor();
        await page.waitForFunction(
          () =>
            document.querySelector("img")?.complete &&
            document.querySelector("img")?.naturalWidth > 0,
        );
        await approve.scrollIntoViewIfNeeded();
        const points = await approve.evaluate((el) => {
          const b = el.getBoundingClientRect();
          return [0.15, 0.5, 0.85].map((x) => {
            const hit = document.elementFromPoint(
              b.x + b.width * x,
              b.y + b.height * 0.5,
            );
            return !!hit && (hit === el || el.contains(hit));
          });
        });
        if (points.some((p) => !p))
          throw Error("Obscured approval target " + name);
        await page.screenshot({
          path: `${out}/${name}-pending-full.png`,
          fullPage: true,
        });
        await page
          .getByRole("textbox")
          .fill("Synthetic authorized fixture content review");
        await approve.focus();
        await page.keyboard.press("Shift+Tab");
        await page.keyboard.press("Tab");
        if (!(await approve.evaluate((e) => e === document.activeElement)))
          throw Error("Native Tab target failed " + name);
        await page.keyboard.press("Enter");
        await page
          .getByRole("heading", {
            name:
              locale === "es"
                ? "No hay historias pendientes"
                : "No stories awaiting review",
          })
          .waitFor();
        if (decisions.length !== 1 || decisions[0].decision !== "approve")
          throw Error("Wrong explicit decision");
        await page.screenshot({
          path: `${out}/${name}-empty-full.png`,
          fullPage: true,
        });
        posted = false;
        await page
          .getByRole("button", {
            name:
              locale === "es" ? "Denuncias y retirada" : "Reports and takedown",
          })
          .click();
        await page
          .getByRole("button", {
            name: locale === "es" ? "Retirar publicación" : "Take down story",
          })
          .waitFor();
        await page.waitForFunction(
          () =>
            document.querySelector("img")?.complete &&
            document.querySelector("img")?.naturalWidth > 0,
        );
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        );
        await page.screenshot({
          path: `${out}/${name}-reported-full.png`,
          fullPage: true,
        });
        state = "error";
        await page
          .getByRole("button", {
            name: locale === "es" ? "Actualizar" : "Refresh",
            exact: true,
          })
          .click();
        await page
          .getByRole("button", {
            name: locale === "es" ? "Reintentar" : "Retry",
            exact: true,
          })
          .waitFor();
        await page.screenshot({
          path: `${out}/${name}-error-full.png`,
          fullPage: true,
        });
        state = "restricted";
        await page
          .getByRole("button", {
            name: locale === "es" ? "Reintentar" : "Retry",
            exact: true,
          })
          .click();
        await page.getByRole("alert").waitFor();
        await page.screenshot({
          path: `${out}/${name}-restricted-full.png`,
          fullPage: true,
        });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        );
        if (overflow || external.length || errors.length)
          throw Error(JSON.stringify({ name, overflow, external, errors }));
        results.push({
          locale,
          theme,
          width,
          states: ["pending", "empty", "reported", "error", "restricted"],
          nativeApproval: true,
          points,
          decisions,
          overflow,
          external,
          errors,
        });
        await context.close();
      }
  const after = pins();
  if (JSON.stringify(before) !== JSON.stringify(after))
    throw Error("Owned source changed during capture");
  writeFileSync(
    out + "/results.json",
    JSON.stringify(
      {
        fixtureOnly: true,
        actualComponent: true,
        actualNext: false,
        realAuthRLS: false,
        physicalDevice: false,
        sourceHashes: after,
        results,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS16 contexts,80 state captures,16 native Tab/Enter decisions,48 pointer hit checks; synthetic only",
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
