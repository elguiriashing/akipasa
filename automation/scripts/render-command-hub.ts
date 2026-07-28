import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { listCommands } from "../src/command-router";
import { commandHubHtml } from "../src/dashboard/html";

const outputPath = path.resolve(
  process.argv[2] || ".wrangler/previews/command-hub.html",
);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, commandHubHtml(listCommands()), "utf8");
console.log(outputPath);
