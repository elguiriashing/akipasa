import { build } from "esbuild";
import { mkdir } from "node:fs/promises";

await mkdir("public/pals/runtime", { recursive: true });
await build({
  entryPoints: ["src/components/pals/studio-3d.js"],
  outfile: "public/pals/runtime/creator.min.js",
  bundle: true,
  minify: true,
  treeShaking: true,
  sourcemap: false,
  format: "iife",
  platform: "browser",
  target: ["es2022", "chrome112", "safari16"],
  legalComments: "none",
  logLevel: "warning",
});
console.log("Built first-party AkiPals 3D creator bundle.");
