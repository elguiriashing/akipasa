import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// This exercises the real restricted document, client, renderer and game engine.
// Only the HTTP/storage boundary is disposable. No authentication is disabled in
// application code, and this process has no database or production credentials.
// SQL transactions, RLS and real-account access are separate acceptance gates.
const outputDir = resolve("test-results/pals-browser");
const buildDir = mkdtempSync(resolve(tmpdir(), "akipals-browser-"));
mkdirSync(outputDir, { recursive: true });
await build({
  stdin: {
    contents: `export { previewHtml } from "./src/components/pals/preview";
export * from "./src/lib/pals/engine";
export { payload } from "./src/lib/pals/view";`,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  outfile: resolve(buildDir, "runtime.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
});
const game = await import(pathToFileURL(resolve(buildDir, "runtime.mjs")));
const icon = readFileSync("src/app/icon.svg");
const baseTime = Date.UTC(2026, 9, 12, 12);
let fixture;

function newFixture() {
  fixture = {
    state: game.initialState(baseTime),
    version: 0,
    ledger: new Set(),
    commands: [],
    analytics: [],
    serverErrors: [],
    malformedNextCommit: false,
    started: Date.now(),
    randomSeed: 42,
  };
}
function now() {
  return baseTime + Date.now() - fixture.started;
}
function random() {
  fixture.randomSeed = (1664525 * fixture.randomSeed + 1013904223) >>> 0;
  return fixture.randomSeed / 4294967296;
}
function json(response, value, status = 200) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow",
  });
  response.end(JSON.stringify(value));
}
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, "http://127.0.0.1").pathname;
    if (path === "/icon.svg") {
      response.writeHead(200, { "Content-Type": "image/svg+xml" });
      response.end(icon);
      return;
    }
    if (path === "/pals" && request.method === "GET") {
      const nonce = randomUUID().replaceAll("-", "");
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
        "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; style-src-attr 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'`,
      });
      response.end(game.previewHtml(nonce));
      return;
    }
    if (path === "/pals/analytics" && request.method === "POST") {
      let body = "";
      for await (const chunk of request) body += chunk;
      fixture.analytics.push(JSON.parse(body));
      response.writeHead(204);
      response.end();
      return;
    }
    if (path !== "/pals/api") {
      response.writeHead(404);
      response.end("Only the disposable AkiPals fixture is available.");
      return;
    }
    if (request.method === "GET") {
      json(response, game.payload(fixture.state, fixture.version, true, now()));
      return;
    }
    if (request.method !== "POST") {
      json(response, { error: "Method not allowed" }, 405);
      return;
    }
    const expectedOrigin = `http://${request.headers.host}`;
    if (request.headers.origin !== expectedOrigin) {
      json(
        response,
        { error: "The disposable fixture requires same origin." },
        403,
      );
      return;
    }
    let body = "";
    for await (const chunk of request) {
      body += chunk;
      if (Buffer.byteLength(body) > 4096) {
        json(response, { error: "Request too large" }, 413);
        return;
      }
    }
    const command = JSON.parse(body);
    const receipt = { command, committed: false, duplicate: false };
    fixture.commands.push(receipt);
    if (fixture.ledger.has(command.id)) {
      receipt.duplicate = true;
      json(
        response,
        game.payload(fixture.state, fixture.version, false, now()),
      );
      return;
    }
    if (command.version !== fixture.version) {
      json(
        response,
        {
          ...game.payload(fixture.state, fixture.version, false, now()),
          error: "The latest fixture save is loaded. Try the action again.",
        },
        409,
      );
      return;
    }
    try {
      fixture.state = game.applyAction(fixture.state, command.action, {
        now: now(),
        id: randomUUID,
        random,
        achievements: [],
      });
    } catch (error) {
      if (!(error instanceof game.RuleError)) throw error;
      json(
        response,
        {
          ...game.payload(fixture.state, fixture.version, false, now()),
          error: error.message,
        },
        400,
      );
      return;
    }
    fixture.version++;
    fixture.ledger.add(command.id);
    receipt.committed = true;
    if (fixture.malformedNextCommit) {
      fixture.malformedNextCommit = false;
      // The ledger has committed, but the client cannot decode the response.
      // Its only safe recovery is to retain and replay the original UUID.
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end('{"state":');
      return;
    }
    json(response, game.payload(fixture.state, fixture.version, false, now()));
  } catch (error) {
    fixture?.serverErrors.push(error.stack || String(error));
    if (!response.headersSent)
      json(response, { error: "Disposable adapter failed" }, 500);
    else response.end();
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;
const launchArgs = process.env.PALS_BROWSER_ARGS
  ? JSON.parse(process.env.PALS_BROWSER_ARGS)
  : [];
if (
  !Array.isArray(launchArgs) ||
  launchArgs.some((arg) => typeof arg !== "string")
)
  throw new Error(
    "PALS_BROWSER_ARGS must be a JSON array of Chromium arguments.",
  );
const browser = await chromium.launch({
  headless: true,
  args: launchArgs,
  ...(process.env.PALS_BROWSER_PATH
    ? { executablePath: process.env.PALS_BROWSER_PATH }
    : {}),
});
const results = [];
const scenarios = [];
const viewports = [
  { name: "phone-360", width: 360, height: 800 },
  { name: "phone-390", width: 390, height: 844 },
  { name: "tablet-portrait", width: 820, height: 1180 },
  { name: "tablet-landscape", width: 1180, height: 820 },
  { name: "short-split", width: 640, height: 400 },
  { name: "desktop", width: 1440, height: 900 },
];
const item = (id) => fixture.state.equipment.find((entry) => entry.id === id);
const balances = () => ({
  threads: fixture.state.threads,
  scrap: fixture.state.scrap,
  xp: fixture.state.xp,
});
const action = (page, type, extra = "") =>
  page
    .locator(`[data-act="${type}"]${extra}`)
    .filter({ visible: true })
    .first();

async function mutation(page, perform, { replay = false } = {}) {
  const version = fixture.version;
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url() === `${origin}/pals/api` &&
      response.request().method() === "POST",
  );
  await perform();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  await expect(page.locator("#main")).toHaveAttribute("aria-busy", "false");
  expect(fixture.version).toBe(version + Number(!replay));
  await expect(page.locator("#connection-status")).toHaveText("Account saved");
}
async function go(page, target) {
  const desktop = page.locator(`#nav [data-tab="${target}"]`);
  const mobile = page.locator(`#mobile-nav [data-tab="${target}"]`);
  if (await desktop.isVisible()) await desktop.click();
  else if (await mobile.isVisible()) await mobile.click();
  else {
    await page.locator('#mobile-nav [data-tab="more"]').click();
    await expect(page.locator("#dialog")).toBeVisible();
    await page.locator(`#dialog [data-tab="${target}"]`).click();
  }
  await expect(page.locator(`#nav [data-tab="${target}"]`)).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.locator("#page-title")).toBeFocused();
}
async function layout(page, checkpoint, caseName, screenshot = true) {
  if (screenshot)
    await page.evaluate(() => {
      if (!document.querySelector("dialog[open]")) window.scrollTo(0, 0);
    });
  const dimensions = await page.evaluate(() => {
    const root = document.documentElement;
    const dialog = document.querySelector("dialog[open]");
    const nav = document.querySelector("#mobile-nav");
    const navRect = nav?.getBoundingClientRect();
    const navVisible = nav && getComputedStyle(nav).display !== "none";
    const seenIds = new Set();
    const duplicateIds = [];
    for (const element of document.querySelectorAll("[id]")) {
      if (seenIds.has(element.id)) duplicateIds.push(element.id);
      seenIds.add(element.id);
    }
    return {
      width: window.innerWidth,
      scrollWidth: root.scrollWidth,
      dialogOverflow: dialog ? dialog.scrollWidth - dialog.clientWidth : 0,
      mobileNavVisible: Boolean(navVisible),
      duplicateIds,
      mobileNavOnscreen:
        !navVisible ||
        (navRect.left >= -1 &&
          navRect.right <= window.innerWidth + 1 &&
          navRect.bottom <= window.innerHeight + 1 &&
          navRect.top >= 0),
      unexpectedWideElements: [
        ...document.querySelectorAll("main *, dialog[open] *"),
      ]
        .filter((element) => {
          if (element.closest("svg")) return false;
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.right > window.innerWidth + 2;
        })
        .slice(0, 8)
        .map((element) => `${element.tagName}.${element.className}`),
    };
  });
  expect(
    dimensions.scrollWidth,
    JSON.stringify(dimensions),
  ).toBeLessThanOrEqual(dimensions.width + 1);
  expect(dimensions.dialogOverflow).toBeLessThanOrEqual(1);
  expect(dimensions.mobileNavOnscreen).toBe(true);
  expect(dimensions.duplicateIds).toEqual([]);
  if (screenshot) {
    await page.screenshot({
      path: resolve(outputDir, `${caseName}-${checkpoint}.png`),
      fullPage: false,
      animations: "disabled",
    });
  }
}
async function adopt(page, name = "Pocket legend") {
  await page.goto(`${origin}/pals`);
  await expect(page.locator(".cast-card")).toHaveCount(10);
  await action(page, "family", '[data-id="moka"]').click();
  await page.getByLabel("A name for your new Moka").fill(name);
  await mutation(page, () =>
    page.locator('#adopt-form button[type="submit"]').click(),
  );
  expect(fixture.state.family).toBe("moka");
  expect(fixture.state.name).toBe(name);
  expect(fixture.state.equipment).toHaveLength(4);
  await expect(page.locator("#page-title")).toBeVisible();
}
async function finishStory(page, id = "gig") {
  await go(page, "adventures");
  await mutation(page, () =>
    action(page, "start", `[data-id="${id}"]`).click(),
  );
  const story = game.adventures.find((entry) => entry.id === id);
  for (const [stepIndex, step] of story.steps.entries()) {
    const option = step.options.findIndex((entry) => entry.need === 3);
    await mutation(page, () =>
      action(page, "choice", `[data-index="${option}"]`).click(),
    );
    expect(fixture.state.run.step).toBe(stepIndex + 1);
  }
  await expect(page.getByText("Small adventure. Lovely ending.")).toBeVisible();
  await mutation(page, () => action(page, "finish").click());
  expect(fixture.state.run).toBeNull();
}
async function collectParcel(page) {
  await go(page, "home");
  const before = balances();
  await mutation(page, () => action(page, "parcel").click());
  expect(fixture.state.threads).toBe(before.threads + 40);
  expect(fixture.state.scrap).toBe(before.scrap + 15);
  await expect(page.locator("#dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#dialog")).not.toBeVisible();
  await expect(action(page, "parcel")).toBeDisabled();
}
async function inspect(page, id) {
  await action(page, "inspect", `[data-id="${id}"]`).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}
async function closeDialog(page) {
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}

for (const viewport of viewports)
  for (const theme of ["dark", "light"]) {
    scenarios.push({
      name: `journey-${viewport.name}-${theme}`,
      viewport,
      theme,
      reducedMotion: theme === "light" ? "reduce" : "no-preference",
      run: async (page, name) => {
        await adopt(page);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await page.locator("#pals-theme").click();
        await expect(page.locator("html")).toHaveAttribute(
          "data-theme",
          theme === "dark" ? "light" : "dark",
        );
        await page.locator("#pals-theme").click();
        const original = balances();
        await mutation(page, () =>
          action(page, "care", '[data-activity="snack"]').click(),
        );
        await mutation(page, () =>
          action(page, "care", '[data-activity="snack"]').click(),
        );
        expect(balances()).toEqual({ ...original, xp: original.xp + 5 });
        expect(fixture.state.report.text).toContain("Just for fun");
        await collectParcel(page);
        await page.evaluate(() => window.scrollTo(0, 0));
        await layout(page, "hideout", name);
        if (theme === "light") {
          await action(page, "boop").click();
          expect(
            await page
              .locator(".pal-art")
              .evaluate((element) => getComputedStyle(element).animationName),
          ).toBe("none");
        }

        await go(page, "wardrobe");
        await action(page, "filter", '[data-slot="head"]').click();
        for (const text of await page.locator(".item-meta").allTextContents())
          expect(text).toContain("Headwear");
        await page.locator("#piece-search").fill("a piece that does not exist");
        await expect(page.locator(".item-card")).toHaveCount(0);
        await expect(page.locator(".empty")).toBeVisible();
        await page.locator("#piece-search").fill("");
        await action(page, "filter", '[data-slot="all"]').click();
        await page.locator("#collection-filter").selectOption("moka");
        const signature = game
          .payload(fixture.state, fixture.version, true, now())
          .catalog.families.find((family) => family.id === "moka")
          .style.signature;
        const expected = fixture.state.equipment.filter((entry) =>
          signature.includes(entry.appearance),
        );
        await expect(page.locator(".item-card")).toHaveCount(expected.length);
        await page.locator("#collection-filter").selectOption("all");
        const head = fixture.state.equipped.head;
        await inspect(page, head);
        await page.keyboard.press("Tab");
        await page.keyboard.press("Shift+Tab");
        const focus = await page.evaluate(() => ({
          inside: document
            .querySelector("#dialog")
            .contains(document.activeElement),
          active: document.activeElement.outerHTML.slice(0, 400),
          modal: document.querySelector("#dialog").matches(":modal"),
        }));
        expect(focus.inside, JSON.stringify(focus)).toBe(true);
        await layout(page, "equipment-dialog", name);
        await page.keyboard.press("Escape");
        await expect(page.locator("#dialog")).not.toBeVisible();
        await expect(
          action(page, "inspect", `[data-id="${head}"]`),
        ).toBeFocused();
        await layout(page, "wardrobe", name);

        await go(page, "workshop");
        await inspect(page, head);
        await page.locator("#socket-0").focus();
        await mutation(page, () =>
          page.locator("#socket-0").selectOption("wits"),
        );
        expect(item(head).sockets).toEqual(["wits"]);
        expect(game.stats(fixture.state).wits).toBe(5);
        await expect(page.locator("#socket-0")).toBeFocused();
        await mutation(page, () =>
          action(page, "upgrade", `[data-id="${head}"]`).click(),
        );
        expect(item(head).level).toBe(2);
        await expect(
          action(page, "upgrade", `[data-id="${head}"]`),
        ).toBeFocused();
        await mutation(page, () =>
          action(page, "socket", `[data-id="${head}"]`).click(),
        );
        expect(item(head).sockets).toEqual(["wits", null]);
        expect(
          await page.evaluate(() =>
            document.querySelector("#dialog").contains(document.activeElement),
          ),
        ).toBe(true);
        await layout(page, "workshop-dialog", name);
        await closeDialog(page);
        await expect(
          action(page, "inspect", `[data-id="${head}"]`),
        ).toBeFocused();

        await finishStory(page);
        await expect(
          action(page, "journey-claim", '[data-period="day"]'),
        ).toBeEnabled();
        const beforeDaily = balances();
        await mutation(page, () =>
          action(page, "journey-claim", '[data-period="day"]').click(),
        );
        expect(balances()).toEqual({
          threads: beforeDaily.threads + 25,
          scrap: beforeDaily.scrap + 10,
          xp: beforeDaily.xp + 15,
        });
        await expect(
          action(page, "journey-claim", '[data-period="day"]'),
        ).toBeDisabled();
        await go(page, "adventures");
        await expect(page.locator(".story-card")).toHaveCount(10);
        await layout(page, "stories", name);
        await go(page, "arcade");
        await expect(
          action(page, "arcade-start", '[data-game="memory"]'),
        ).toBeVisible();
        await expect(
          action(page, "arcade-start", '[data-game="trail"]'),
        ).toBeVisible();
        await layout(page, "arcade", name);
        await playArcade(page, "memory", { checkpointName: name });
        await playArcade(page, "trail", { checkpointName: name });

        await go(page, "shop");
        await mutation(page, () =>
          action(page, "goal", '[data-id="moka-beret"]').click(),
        );
        expect(fixture.state.goal).toBe("moka-beret");
        await layout(page, "shop", name);
        await go(page, "keepsakes");
        await mutation(page, () => action(page, "claim").click());
        expect(fixture.state.claimed).toEqual([]);
        await layout(page, "keepsakes", name);
        await go(page, "cast");
        const collection = structuredClone(fixture.state.equipment);
        await action(page, "cast-mode", '[data-mode="master"]').click();
        await expect(page.locator(".cast-card")).toHaveCount(10);
        await layout(page, "cast", name);
        await mutation(page, () =>
          action(page, "family", '[data-id="lux"]').click(),
        );
        expect(fixture.state.family).toBe("lux");
        expect(fixture.state.equipment).toEqual(collection);
        await action(page, "collection", '[data-id="lux"]').click();
        await expect(page.locator("#collection-filter")).toHaveValue("lux");
        await expect(page.locator(".item-card")).toHaveCount(4);
        expect(fixture.state.equipment).toEqual(collection);

        await go(page, "settings");
        await expect(page.locator("#map-setting")).not.toBeChecked();
        await mutation(page, () => page.locator("#map-setting").check());
        expect(fixture.state.mapEnabled).toBe(true);
        await mutation(page, () => page.locator("#map-setting").uncheck());
        expect(fixture.state.mapEnabled).toBe(false);
        await layout(page, "settings", name);
        const saved = structuredClone(fixture.state);
        const version = fixture.version;
        await page.reload();
        await expect(page.locator(".pal-bar h2")).toHaveText("Pocket legend");
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        expect(fixture.version).toBe(version);
        expect(fixture.state).toEqual(saved);
        await layout(page, "saved-reload", name, false);
      },
    });
  }

scenarios.push({
  name: "collection-persistence-and-ambiguous-retry",
  viewport: viewports[1],
  theme: "dark",
  reducedMotion: "reduce",
  run: async (page, name) => {
    await adopt(page, "Workshop legend");
    await collectParcel(page);
    const sku = game.designs
      .filter(
        (design) =>
          design.slot === "head" &&
          design.price > 0 &&
          design.source !== "earned" &&
          !fixture.state.wardrobe.includes(design.id),
      )
      .sort((a, b) => a.price - b.price)[0];
    for (const story of game.adventures) {
      if (fixture.state.threads >= sku.price * 2) break;
      await finishStory(page, story.id);
    }
    await go(page, "shop");
    await page.locator("#piece-search").fill(sku.name);
    await action(page, "buy", `[data-id="${sku.id}"]`).click();
    const beforeCancel = structuredClone(fixture.state);
    await action(page, "cancel-confirm").click();
    expect(fixture.state).toEqual(beforeCancel);
    await action(page, "buy", `[data-id="${sku.id}"]`).click();
    fixture.malformedNextCommit = true;
    const beforePurchase = balances();
    const version = fixture.version;
    await action(page, "confirm").click();
    await expect(action(page, "retry")).toBeVisible();
    await expect(page.locator("#main")).toHaveAttribute("aria-busy", "false");
    expect(fixture.version).toBe(version + 1);
    expect(fixture.state.threads).toBe(beforePurchase.threads - sku.price);
    const firstReceipt = fixture.commands.at(-1);
    const commandCount = fixture.commands.length;
    await action(page, "goal", `[data-id="${sku.id}"]`).click();
    expect(fixture.commands).toHaveLength(commandCount);
    await expect(page.locator("#toast")).toContainText(
      "Finish the pending request first",
    );
    await layout(page, "pending-safe-retry", name);
    await mutation(page, () => action(page, "retry").click(), { replay: true });
    expect(fixture.commands.at(-1).command).toEqual(firstReceipt.command);
    expect(fixture.commands.at(-1).duplicate).toBe(true);
    expect(
      fixture.commands.filter(
        (entry) =>
          entry.command.id === firstReceipt.command.id && entry.committed,
      ),
    ).toHaveLength(1);
    expect(fixture.state.threads).toBe(beforePurchase.threads - sku.price);
    const firstId = fixture.state.equipment.find(
      (entry) => entry.design === sku.id,
    ).id;
    await action(page, "buy", `[data-id="${sku.id}"]`).click();
    await mutation(page, () => action(page, "confirm").click());
    const spareId = fixture.state.equipment.find(
      (entry) => entry.design === sku.id && entry.id !== firstId,
    ).id;

    await go(page, "workshop");
    await inspect(page, firstId);
    await mutation(page, () =>
      action(page, "equip", `[data-id="${firstId}"]`).click(),
    );
    await mutation(page, () =>
      action(page, "upgrade", `[data-id="${firstId}"]`).click(),
    );
    await mutation(page, () =>
      action(page, "socket", `[data-id="${firstId}"]`).click(),
    );
    await mutation(page, () => page.locator("#socket-0").selectOption("wits"));
    await mutation(page, () =>
      page.locator("#socket-1").selectOption("energy"),
    );
    const stats = game.stats(fixture.state);
    await mutation(page, () =>
      page.locator("#appearance").selectOption("bucket-hat"),
    );
    expect(item(firstId).design).toBe(sku.id);
    expect(item(firstId).appearance).toBe("bucket-hat");
    expect(game.stats(fixture.state)).toEqual(stats);
    await expect(
      action(page, "ask-scrap", `[data-id="${firstId}"]`),
    ).toBeDisabled();
    await closeDialog(page);
    await inspect(page, spareId);
    await mutation(page, () => page.locator("#socket-0").selectOption("charm"));
    await closeDialog(page);
    await inspect(page, firstId);
    const beforeMerge = structuredClone(fixture.state);
    await action(page, "ask-merge", `[data-id="${firstId}"]`).click();
    await action(page, "cancel-confirm").click();
    expect(fixture.state).toEqual(beforeMerge);
    await action(page, "ask-merge", `[data-id="${firstId}"]`).click();
    await mutation(page, () => action(page, "confirm").click());
    expect(item(spareId)).toBeUndefined();
    expect(item(firstId).level).toBe(2);
    expect(item(firstId).sockets).toEqual(["wits", "energy"]);
    expect(fixture.state.modules.charm).toBe(beforeMerge.modules.charm + 1);
    await mutation(page, () =>
      action(page, "unequip", '[data-slot="head"]').click(),
    );
    await action(page, "ask-scrap", `[data-id="${firstId}"]`).click();
    const beforeScrap = structuredClone(fixture.state);
    await action(page, "cancel-confirm").click();
    expect(fixture.state).toEqual(beforeScrap);
    await action(page, "ask-scrap", `[data-id="${firstId}"]`).click();
    await mutation(page, () => action(page, "confirm").click());
    expect(item(firstId)).toBeUndefined();
    expect(fixture.state.wardrobe).toContain(sku.id);
    expect(fixture.state.wardrobe).toContain("bucket-hat");
    expect(fixture.state.modules.wits).toBe(beforeScrap.modules.wits + 1);
    expect(fixture.state.modules.energy).toBe(beforeScrap.modules.energy + 1);
    await go(page, "home");
    await action(page, "rename").click();
    await page.getByLabel("Pal name", { exact: true }).fill("Recycled legend");
    await mutation(page, () =>
      page.getByRole("button", { name: "Save name", exact: true }).click(),
    );
    await expect(page.locator("#dialog")).not.toBeVisible();
    await go(page, "settings");
    const downloadPromise = page.waitForEvent("download");
    await action(page, "export").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("akipals-save.json");
    const exported = JSON.parse(readFileSync(await download.path(), "utf8"));
    expect(exported.state).toEqual(fixture.state);
    const saved = structuredClone(fixture.state);
    await page.reload();
    await expect(page.locator(".pal-bar h2")).toHaveText("Recycled legend");
    expect(fixture.state).toEqual(saved);
    await layout(page, "restored-collection", name);
  },
});

function trailPath(run) {
  const blocked = new Set(run.blocked);
  const allStars = (1 << run.stars.length) - 1;
  const starMask = (position) => {
    const index = run.stars.indexOf(position);
    return index < 0 ? 0 : 1 << index;
  };
  const queue = [{ position: run.start, mask: starMask(run.start), path: [] }];
  const visited = new Set();
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const node = queue[cursor];
    const key = `${node.position}:${node.mask}`;
    if (visited.has(key)) continue;
    visited.add(key);
    if (node.position === run.goal && node.mask === allStars) return node.path;
    for (const next of [
      node.position - run.size,
      node.position + run.size,
      node.position - 1,
      node.position + 1,
    ]) {
      if (next < 0 || next >= run.size * run.size || blocked.has(next))
        continue;
      const distance =
        Math.abs(
          Math.floor(next / run.size) - Math.floor(node.position / run.size),
        ) + Math.abs((next % run.size) - (node.position % run.size));
      if (distance !== 1) continue;
      queue.push({
        position: next,
        mask: node.mask | starMask(next),
        path: [...node.path, next],
      });
    }
  }
  throw new Error("The server-generated trail has no complete solution.");
}
async function playArcade(page, type, { reload = false, checkpointName } = {}) {
  await mutation(page, () =>
    action(page, "arcade-start", `[data-game="${type}"]`).click(),
  );
  const run = structuredClone(fixture.state.arcade.active);
  const commandCount = fixture.commands.length;
  await expect(action(page, "arcade-finish")).toBeDisabled();
  if (type === "memory") {
    const pairs = new Map();
    run.board.forEach((face, index) =>
      pairs.set(face, [...(pairs.get(face) || []), index]),
    );
    let completedPairs = 0;
    for (const indices of pairs.values()) {
      for (const index of indices)
        await action(page, "arcade-flip", `[data-index="${index}"]`).click();
      if (reload && ++completedPairs === 1) {
        await action(page, "arcade-back").click();
        await action(page, "arcade-resume").click();
        await expect(
          page.locator('[data-act="arcade-flip"]:not(:disabled)').first(),
        ).toBeFocused();
        const commands = fixture.commands.length;
        await page.reload();
        await expect(page.locator(".pal-bar h2")).toBeVisible();
        await go(page, "arcade");
        expect(fixture.commands).toHaveLength(commands);
        for (const index of indices)
          await expect(
            action(page, "arcade-flip", `[data-index="${index}"]`),
          ).toBeDisabled();
      }
    }
  } else {
    let position = run.start;
    const path = trailPath(run);
    for (const [step, next] of path.entries()) {
      const direction =
        next === position - run.size
          ? "up"
          : next === position + run.size
            ? "down"
            : next < position
              ? "left"
              : "right";
      if (step % 3 === 0) {
        await page.locator("#arcade-board").focus();
        await page.keyboard.press(
          `Arrow${direction[0].toUpperCase()}${direction.slice(1)}`,
        );
      } else if (step % 3 === 1) {
        await action(
          page,
          "arcade-direction",
          `[data-direction="${direction}"]`,
        ).click();
      } else
        await action(page, "arcade-step", `[data-index="${next}"]`).click();
      position = next;
    }
  }
  expect(fixture.commands).toHaveLength(commandCount);
  await expect(action(page, "arcade-finish")).toBeEnabled();
  if (checkpointName)
    await layout(page, `${type}-complete-board`, checkpointName);
  await mutation(page, () => action(page, "arcade-finish").click());
  expect(fixture.state.arcade.active).toBeNull();
  expect(fixture.state.arcade.lastResult.score).toBe(1000);
  return run;
}
for (const [viewport, theme] of [
  [viewports[1], "dark"],
  [viewports[5], "light"],
]) {
  scenarios.push({
    name: `arcade-completion-${viewport.name}-${theme}`,
    viewport,
    theme,
    reducedMotion: "reduce",
    run: async (page, name) => {
      await adopt(page, "Arcade legend");
      await go(page, "arcade");
      for (const type of ["memory", "trail"]) {
        const before = balances();
        await playArcade(page, type, {
          reload: type === "memory",
          checkpointName: name,
        });
        expect(balances()).toEqual({
          threads: before.threads + 20,
          scrap: before.scrap + 8,
          xp: before.xp + 10,
        });
        await layout(page, `${type}-reward`, name);
        const rewarded = balances();
        await playArcade(page, type);
        expect(balances()).toEqual(rewarded);
        expect(fixture.state.arcade.plays[type]).toBe(2);
        await layout(page, `${type}-practice`, name);
      }
      await go(page, "home");
      const summary = game.payload(fixture.state, fixture.version, false, now())
        .derived.journey;
      expect(summary.daily.tasks.find((task) => task.id === "play").done).toBe(
        true,
      );
      expect(summary.weekly.completed).toBe(0);
      await layout(page, "arcade-progress", name);
    },
  });
}

try {
  const selected = scenarios.filter(
    (scenario) =>
      !process.env.PALS_BROWSER_CASE ||
      scenario.name.includes(process.env.PALS_BROWSER_CASE),
  );
  if (!selected.length)
    throw new Error("PALS_BROWSER_CASE matched no acceptance scenarios.");
  for (const scenario of selected) {
    newFixture();
    const context = await browser.newContext({
      viewport: {
        width: scenario.viewport.width,
        height: scenario.viewport.height,
      },
      colorScheme: scenario.theme,
      reducedMotion: scenario.reducedMotion,
      acceptDownloads: true,
    });
    const page = await context.newPage();
    const errors = [];
    const externalRequests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await context.route("**/*", async (route) => {
      const url = route.request().url();
      if (!url.startsWith(origin + "/")) {
        externalRequests.push(url);
        await route.abort();
        return;
      }
      await route.continue();
    });
    page.setDefaultTimeout(12_000);
    const started = Date.now();
    let result = "pass";
    let detail;
    try {
      await scenario.run(page, scenario.name);
      expect(errors).toEqual([]);
      expect(externalRequests).toEqual([]);
      expect(fixture.serverErrors).toEqual([]);
    } catch (error) {
      result = "fail";
      detail = error.stack || String(error);
      await page
        .screenshot({
          path: resolve(outputDir, `${scenario.name}-failure.png`),
          fullPage: true,
        })
        .catch(() => {});
      writeFileSync(
        resolve(outputDir, `${scenario.name}-failure.html`),
        await page.content().catch(() => ""),
      );
    }
    const row = {
      name: scenario.name,
      result,
      durationMs: Date.now() - started,
      viewport: scenario.viewport,
      theme: scenario.theme,
      reducedMotion: scenario.reducedMotion,
      commands: fixture.commands.length,
      committed: fixture.ledger.size,
      errors,
      externalRequests,
      serverErrors: fixture.serverErrors,
      ...(detail ? { detail } : {}),
    };
    results.push(row);
    writeFileSync(
      resolve(outputDir, "results.json"),
      JSON.stringify(results, null, 2),
    );
    console.log(
      `${result.toUpperCase()}: ${scenario.name} (${row.durationMs} ms; ${row.committed} committed commands)`,
    );
    if (detail) console.error(detail);
    await context.close();
    if (result === "fail" && process.env.PALS_BROWSER_FAIL_FAST === "1") break;
  }
  const failed = results.filter((row) => row.result === "fail").length;
  console.log(
    `${results.length - failed}/${results.length} AkiPals browser scenarios passed. Real document/client/engine; loopback-only in-memory transport and save ledger. Production auth, SQL, provider availability and physical-device acceptance are separate gates.`,
  );
  if (failed) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((done) => server.close(done));
  rmSync(buildDir, { recursive: true, force: true });
}
