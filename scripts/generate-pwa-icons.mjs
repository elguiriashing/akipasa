import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";
mkdirSync("public/pwa", { recursive: true });
const original = readFileSync("src/app/icon.svg", "utf8");
for (const [brand, background, pin, sparkle] of [
  ["akipasa", "#14213D", "#F26B1D", "#FFBE2E"],
  ["business", "#192B48", "#FFD447", "#F26B1D"],
  ["duermo", "#143C43", "#35C6A6", "#B3F4CD"],
]) {
  const svg = original
    .replace("#14213D", background)
    .replace("#F26B1D", pin)
    .replace("#FFBE2E", sparkle);
  for (const size of [192, 512]) {
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(`public/pwa/${brand}-${size}.png`);
    const maskable = svg
      .replace('rx="23"', 'rx="0"')
      .replace("translate(23 14) scale(.8)", "translate(29 23) scale(.65)");
    await sharp(Buffer.from(maskable))
      .resize(size, size)
      .png()
      .toFile(`public/pwa/${brand}-maskable-${size}.png`);
  }
}
