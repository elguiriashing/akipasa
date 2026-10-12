import { spawn } from "node:child_process";
import { startPublicUiSupabase } from "../tests/fixtures/public-ui-supabase.mjs";

const root = new URL("../", import.meta.url);
const baseURL = new URL(
  process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100",
);
if (
  baseURL.protocol !== "http:" ||
  !["127.0.0.1", "localhost", "[::1]"].includes(baseURL.hostname) ||
  !baseURL.port
) {
  throw new Error(
    "The E2E runner requires a localhost HTTP server URL with an explicit port.",
  );
}
let server;
let playwright;
let fixture;
let interrupted = false;

function startServer() {
  return spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      baseURL.hostname === "[::1]" ? "::1" : baseURL.hostname,
      "--port",
      baseURL.port,
    ],
    {
      cwd: root,
      stdio: "inherit",
      windowsHide: true,
      env: {
        ...process.env,
        // The fixture has already validated and bound its disposable local URL.
        // Never inherit this override when no fixture backend was started.
        AKIPASA_E2E_PUBLIC_UI: fixture ? "1" : "0",
      },
    },
  );
}

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (interrupted) throw new Error("E2E run interrupted");
    if (server.exitCode !== null || server.signalCode !== null)
      throw new Error(`Next server exited with ${server.exitCode}`);
    try {
      const response = await fetch(new URL("/en", baseURL));
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for the Next production server");
}

function runPlaywright() {
  return new Promise((resolve, reject) => {
    playwright = spawn(
      process.execPath,
      [
        "node_modules/@playwright/test/cli.js",
        "test",
        ...process.argv.slice(2),
      ],
      {
        cwd: root,
        stdio: "inherit",
        windowsHide: true,
        env: {
          ...process.env,
          PLAYWRIGHT_BASE_URL: baseURL.origin,
          PLAYWRIGHT_EXTERNAL_SERVER: "1",
        },
      },
    );
    playwright.once("error", reject);
    playwright.once("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Playwright exited with ${code}`)),
    );
  });
}

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 3_000)),
  ]);
  if (child.exitCode === null && child.signalCode === null)
    child.kill("SIGKILL");
}

function interrupt() {
  interrupted = true;
  playwright?.kill("SIGTERM");
  server?.kill("SIGTERM");
}
process.once("SIGINT", interrupt);
process.once("SIGTERM", interrupt);

try {
  fixture = await startPublicUiSupabase();
  if (fixture)
    console.log(
      `Public UI uses ${fixture.address.origin} with 2,105 synthetic venue fixtures.`,
    );
  if (interrupted) throw new Error("E2E run interrupted");
  server = startServer();
  await waitForServer();
  await runPlaywright();
} finally {
  await stopChild(playwright);
  await stopChild(server);
  await fixture?.close();
  process.removeListener("SIGINT", interrupt);
  process.removeListener("SIGTERM", interrupt);
}
