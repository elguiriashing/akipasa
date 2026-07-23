import { spawn } from "node:child_process";

const root = new URL("../", import.meta.url);
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3100",
  ],
  { cwd: root, stdio: "inherit", windowsHide: true },
);

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null)
      throw new Error(`Next server exited with ${server.exitCode}`);
    try {
      const response = await fetch("http://127.0.0.1:3100/en");
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for the Next production server");
}

function runPlaywright() {
  return new Promise((resolve, reject) => {
    const test = spawn(
      process.execPath,
      ["node_modules/@playwright/test/cli.js", "test"],
      {
        cwd: root,
        stdio: "inherit",
        windowsHide: true,
        env: { ...process.env, PLAYWRIGHT_EXTERNAL_SERVER: "1" },
      },
    );
    test.once("error", reject);
    test.once("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Playwright exited with ${code}`)),
    );
  });
}

try {
  await waitForServer();
  await runPlaywright();
} finally {
  server.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => server.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 3_000)),
  ]);
  if (server.exitCode === null) server.kill("SIGKILL");
}
