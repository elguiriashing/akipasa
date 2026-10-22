import { execFileSync } from "node:child_process";

const paths = [
  "docs/AKIPASA_MASTER.md",
  "docs/CHANGE_IMPACT_REGISTER.md",
  "src/components/AkiSuiteMembershipGrid.module.css",
  "src/components/AkiSuiteMembershipGrid.tsx",
  "tests/akisuite-membership-render.test.tsx",
  "tests/subscription-ui.test.tsx",
];
execFileSync("./node_modules/.bin/prettier", ["--write", ...paths], { stdio: "inherit" });
const patch = execFileSync("git", ["diff", "--", ...paths], { encoding: "utf8", maxBuffer: 3 * 1024 * 1024 });
const encoded = Buffer.from(patch).toString("base64");
console.log("AKISUITE_PRETTIER_PATCH_BEGIN");
for (let i = 0; i < encoded.length; i += 2000) {
  console.log("AKISUITE_PRETTIER_PATCH_CHUNK " + encoded.slice(i, i + 2000));
}
console.log("AKISUITE_PRETTIER_PATCH_END");
