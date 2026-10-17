// Mirror AkiHQ and AkiCoches product marks into AkiPasa's cross-app navigation.
// Source assets are SVG; regenerated before both Next and Cloudflare builds.
import { readFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import sharp from "sharp";
const root=process.cwd();
const files=[
  ["public/brand/hq-mark.svg",512,"public/brand/hq-icon.png"],
];
for(const [src,size,out] of files){
 const target=resolve(root,out);
 await mkdir(dirname(target),{recursive:true});
 await sharp(await readFile(resolve(root,src))).resize(size,size).png().toFile(target);
}
