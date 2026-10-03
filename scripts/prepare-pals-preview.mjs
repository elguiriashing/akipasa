import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

// One-time integration on the isolated preview branch. Exact source hashes
// prevent replacing concurrent or unrelated changes. Removed before release.
if (process.env.GITHUB_REF !== "refs/heads/agent/akipals-secret-preview") {
  throw new Error("This preparation is restricted to the preview branch");
}
function readExpected(path, expected) {
  const content = readFileSync(path);
  const hash = createHash("sha1").update(`blob ${content.length}\0`).update(content).digest("hex");
  if (hash !== expected) throw new Error(`Source changed; review ${path} before integrating`);
  return content.toString("utf8");
}
function replaceOnce(content, from, to) {
  if (!content.includes(from) || content.indexOf(from) !== content.lastIndexOf(from)) throw new Error(`Expected a unique integration anchor: ${from}`);
  return content.replace(from, to);
}
let path = "src/app/[locale]/map/page.tsx";
let content = readExpected(path, "6a0eb06022431cf0de075599a21f1f672c3872b1");
content = 'import { MapCompanion } from "@/components/pals/MapCompanion";\nimport { mapPreviewPortrait } from "@/lib/pals/server";\n' + content;
content = replaceOnce(content, "  const m = msg(locale);", "  const m = msg(locale);\n  const companion = await mapPreviewPortrait();");
content = replaceOnce(content, '<main className="shell discover-page map-page">', '<main className="shell discover-page map-page">\n      {companion && <MapCompanion portrait={companion} />}');
writeFileSync(path, content);

path = "src/lib/auth-security.ts";
content = readExpected(path, "f1a938d6a8d578077102006f90493b73ad4ee318");
content = replaceOnce(content, 'return requested?.startsWith(`/${locale}/`)', 'return requested === "/pals" || requested?.startsWith(`/${locale}/`)');
writeFileSync(path, content);

path = "src/lib/seo.ts";
content = readExpected(path, "e5f5b8eb0b8502cf376f7ec461a655d32dd89cd3");
content = replaceOnce(content, "export function shouldNoindex(pathname: string) {\n  return (", "export function shouldNoindex(pathname: string) {\n  return (\n    /^\\/pals(?:\\/|$)/.test(pathname) ||");
writeFileSync(path, content);

path = "src/middleware.ts";
content = readExpected(path, "d775325d5aab1096a5ff019dbb738a514fd29b8a");
content = replaceOnce(content, "  const response = await refreshSession(request);", "  const response = await refreshSession(request);\n  if (request.cookies.has(\"akipals_preview\") && /^\\/(en|es)\\/map$/.test(pathname)) {\n    response.headers.set(\"Cache-Control\", \"private, no-store\");\n    response.headers.set(\"CDN-Cache-Control\", \"no-store\");\n  }");
writeFileSync(path, content);

path = "package.json";
content = readExpected(path, "73c036d6628e05bb0bef97b2e936005c778cf348");
content = replaceOnce(content, "tests/compact-studio.test.tsx &&", "tests/compact-studio.test.tsx tests/pals.test.ts tests/pals-integration.test.ts &&");
writeFileSync(path, content);

path = "src/lib/pals/engine.ts";
content = readExpected(path, "f22fc618b730af265db410e39ec1264ce9a7cab5");
content = replaceOnce(content, String.raw`/[\u0000-\u001f\u007f<>]/u.test(name)`, 'Array.from(name).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 || character === "<" || character === ">")');
writeFileSync(path, content);
console.log("Integrated the private map, exact sign-in return, noindex and tests without changing other page content.");
