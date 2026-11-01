import sharp from "sharp";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

// Derive every AkiPasa mark from the same founder-approved trace used by BrandMark.
// The trace also contains a wordmark: retain only its movement mark and endpoint.
const root = process.cwd();
const trace = await readFile(
  resolve(root, "public/brand/pasa-2026-traced.svg"),
  "utf8",
);
const paths = [
  ...trace.matchAll(/<path fill="([^"]+)" fill-rule="evenodd" d="([^"]+)"/g),
];
const movement = paths[0][2].slice(paths[0][2].indexOf("M351,90"));
const endpoint = paths[1][2].slice(paths[1][2].indexOf("M600,372"));
if (!movement.startsWith("M351,90") || !endpoint.startsWith("M600,372"))
  throw new Error(
    "Approved logo geometry changed; review the trace before regenerating.",
  );
const artwork = `<path fill="#ff6716" fill-rule="evenodd" d="${movement}"/><path fill="#0d1e37" fill-rule="evenodd" d="${endpoint}"/>`;
const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="100 75 550 440" role="img" aria-label="AkiPasa">${artwork}</svg>\n`;
const icon = (maskable = false, foreground = false) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="AkiPasa icon">${foreground ? "" : `<rect width="128" height="128"${maskable ? "" : ' rx="29"'} fill="#FAF7F2"/>`}<svg x="${maskable ? 24 : 10}" y="${maskable ? 32 : 20}" width="${maskable ? 80 : 108}" height="${maskable ? 64 : 86.4}" viewBox="100 75 550 440">${artwork}</svg></svg>\n`;
const put = async (path, bytes) => {
  await mkdir(dirname(resolve(root, path)), { recursive: true });
  await writeFile(resolve(root, path), bytes);
};
await put("public/brand/pasa-2026-mark.svg", mark);
for (const stem of ["pasa", "pasa-2026"]) {
  await put(`public/brand/v3/${stem}.svg`, icon());
  await put(`public/brand/v3/${stem}-maskable.svg`, icon(true));
  for (const size of [32, 180, 192, 512, 1024])
    await put(
      `public/brand/v3/${stem}-${size}.png`,
      await sharp(Buffer.from(icon())).resize(size).png().toBuffer(),
    );
  for (const size of [192, 512])
    await put(
      `public/brand/v3/${stem}-maskable-${size}.png`,
      await sharp(Buffer.from(icon(true)))
        .resize(size)
        .png()
        .toBuffer(),
    );
}
for (const path of [
  "src/app/icon.svg",
  "public/favicon.svg",
  "public/pwa-icon.svg",
])
  await put(path, icon());
for (const size of [32, 180, 192, 512])
  await put(
    `public/icon-${size}.png`,
    await readFile(resolve(root, `public/brand/v3/pasa-${size}.png`)),
  );
for (const size of [192, 512]) {
  await put(
    `public/pwa/akipasa-${size}.png`,
    await readFile(resolve(root, `public/brand/v3/pasa-${size}.png`)),
  );
  await put(
    `public/pwa/akipasa-maskable-${size}.png`,
    await readFile(resolve(root, `public/brand/v3/pasa-maskable-${size}.png`)),
  );
}
// PNG-compressed ICO is supported by modern browsers and Windows launchers.
const png = await readFile(resolve(root, "public/icon-32.png"));
const ico = Buffer.alloc(22);
ico.writeUInt16LE(1, 2);
ico.writeUInt16LE(1, 4);
ico[6] = 32;
ico[7] = 32;
ico.writeUInt16LE(1, 10);
ico.writeUInt16LE(32, 12);
ico.writeUInt32LE(png.length, 14);
ico.writeUInt32LE(22, 18);
await put("public/favicon.ico", Buffer.concat([ico, png]));
for (const layout of ["horizontal", "stacked"])
  for (const theme of ["dark", "light"]) {
    const path = `public/brand/logo-${layout}-${theme}.svg`;
    const old = await readFile(resolve(root, path), "utf8");
    const replacement = `<svg x="${layout === "horizontal" ? 4 : 130}" y="5" width="${layout === "horizontal" ? 76 : 110}" height="88" viewBox="100 75 550 440">${artwork}</svg>`;
    await put(path, old.replace(/<g.*<\/g>/, replacement));
  }
await put(
  "mobile/icons/store-1024.png",
  await sharp(Buffer.from(icon(true)))
    .resize(1024)
    .png()
    .toBuffer(),
);
const foreground = await sharp(Buffer.from(icon(true, true)))
  .resize(432)
  .png()
  .toBuffer();
await put("mobile/icons/adaptive-foreground.png", foreground);
await put("mobile/icons/background.txt", "#FAF7F2\n");
await put(
  "Android/app/src/main/res/drawable-nodpi/ic_launcher_foreground.png",
  foreground,
);
await put(
  "Android/app/src/main/res/drawable/ic_launcher_background.xml",
  '<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#FAF7F2" /></shape>\n',
);
await put(
  "Android/app/src/main/res/drawable/ic_notification.xml",
  `<?xml version="1.0" encoding="utf-8"?>\n<!-- Monochrome version of the approved movement mark; Android supplies the tint. -->\n<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="550" android:viewportHeight="440"><group android:translateX="-100" android:translateY="-75"><path android:fillColor="#FFFFFFFF" android:fillType="evenOdd" android:pathData="${movement}"/><path android:fillColor="#FFFFFFFF" android:fillType="evenOdd" android:pathData="${endpoint}"/></group></vector>\n`,
);
