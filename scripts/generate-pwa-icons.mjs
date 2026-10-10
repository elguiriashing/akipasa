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
  const uploaded =
    brand !== "akipasa" ? readFileSync(`public/brand/${brand}-icon.png`) : null;
  for (const size of [192, 512]) {
    await sharp(uploaded || Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(`public/pwa/${brand}-${size}.png`);
    const maskable = svg
      .replace('rx="23"', 'rx="0"')
      .replace("translate(23 14) scale(.8)", "translate(29 23) scale(.65)");
    // Keep the uploaded mark inside the Android maskable safe area.
    const maskableInput = uploaded
      ? await sharp({
          create: { width: size, height: size, channels: 4, background },
        })
          .composite([
            {
              input: await sharp(uploaded)
                .resize(Math.round(size * 0.8))
                .png()
                .toBuffer(),
              gravity: "centre",
            },
          ])
          .png()
          .toBuffer()
      : Buffer.from(maskable);
    await sharp(maskableInput)
      .resize(size, size)
      .png()
      .toFile(`public/pwa/${brand}-maskable-${size}.png`);
  }
}
