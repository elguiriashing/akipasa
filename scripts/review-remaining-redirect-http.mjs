import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { createServer } from "node:net";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

// Exercise the unchanged route files through real Next HTTP handling. Only the
// identity/profile read is a local, explicit adapter; no provider or RLS claim.
const root = process.cwd();
const output = resolve("test-results/remaining-redirect-http");
const fixture = resolve(output, "framework");
mkdirSync(fixture, { recursive: true });
const routes = [
  ["account/membership", "account/subscription"],
  ["account/rewards", "passports"],
  ["staff/audit", "admin/audit"],
];
const sha = (file) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");
const sourceHashes = {};
for (const [route] of routes) {
  const source = `src/app/[locale]/${route}/page.tsx`;
  const target = resolve(fixture, `app/[locale]/${route}/page.tsx`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, readFileSync(source));
  sourceHashes[source] = sha(source);
  assert.equal(sha(target), sha(source));
}
for (const file of [
  "src/lib/config.ts",
  "src/lib/roles.ts",
  "package-lock.json",
  "scripts/review-remaining-redirect-http.mjs",
])
  sourceHashes[file] = sha(file);
writeFileSync(
  resolve(fixture, "package.json"),
  JSON.stringify({
    name: "local-redirect-review",
    private: true,
    type: "module",
  }),
);
writeFileSync(
  resolve(fixture, "tsconfig.json"),
  JSON.stringify({
    compilerOptions: {
      target: "ES2017",
      lib: ["dom", "dom.iterable", "esnext"],
      jsx: "preserve",
      module: "esnext",
      moduleResolution: "bundler",
      allowJs: true,
      skipLibCheck: true,
      strict: false,
      noEmit: true,
      esModuleInterop: true,
      resolveJsonModule: true,
      isolatedModules: true,
      baseUrl: ".",
      paths: {
        "@/lib/auth": ["./review-auth.ts"],
        "@/*": [resolve(root, "src/*")],
      },
    },
    include: ["**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  }),
);
writeFileSync(
  resolve(fixture, "next.config.mjs"),
  `export default { devIndicators:false, agentRules:false, experimental:{externalDir:true}, webpack(config){Object.assign(config.resolve.alias, ${JSON.stringify({ "@/lib/auth$": resolve(fixture, "review-auth.ts"), "@/lib/config$": resolve(root, "src/lib/config.ts"), "@/lib/roles$": resolve(root, "src/lib/roles.ts") })});return config;} };\n`,
);
writeFileSync(
  resolve(fixture, "app/layout.tsx"),
  "export default function Layout({children}){return <html><body>{children}</body></html>}\n",
);
writeFileSync(
  resolve(fixture, "review-auth.ts"),
  `import {headers} from 'next/headers';import {redirect} from 'next/navigation';
export async function requireUser(locale,next){const h=await headers();const role=h.get('x-review-role')||'guest';if(role==='guest')redirect('/'+locale+'/auth?next='+encodeURIComponent(next));
const user={id:'00000000-0000-4000-8000-000000000001'};const q={select(){return q},eq(){return q},async maybeSingle(){return{data:role==='missing'?null:{app_role:role},error:null}}};
return{user,supabase:{from(table){if(table!=='profiles')throw Error('Unmodelled read');return q}}}}\n`,
);
const reservation = createServer();
await new Promise((done) => reservation.listen(0, "127.0.0.1", done));
const port = reservation.address().port;
await new Promise((done) => reservation.close(done));
const logs = [];
const child = spawn(
  process.execPath,
  [
    resolve("node_modules/next/dist/bin/next"),
    "dev",
    fixture,
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
    "--webpack",
  ],
  {
    cwd: root,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
for (const pipe of [child.stdout, child.stderr])
  pipe.on("data", (data) => logs.push(String(data)));
const origin = `http://127.0.0.1:${port}`;
const results = [];
try {
  const deadline = Date.now() + 60000;
  let ready = false;
  while (Date.now() < deadline) {
    if (child.exitCode !== null)
      throw Error(`Next exited: ${logs.join("").slice(-2000)}`);
    try {
      await fetch(origin, {
        redirect: "manual",
        signal: AbortSignal.timeout(3000),
      });
      ready = true;
      break;
    } catch {}
    await new Promise((done) => setTimeout(done, 250));
  }
  assert.ok(ready, "Local Next must start");
  for (const locale of ["en", "es"])
    for (const [route, destination] of routes) {
      const path = `/${locale}/${route}`;
      const roles =
        route === "staff/audit"
          ? [
              "guest",
              "consumer",
              "organiser",
              "moderator",
              "administrator",
              "missing",
            ]
          : ["guest", "consumer", "administrator"];
      for (const role of roles) {
        const response = await fetch(origin + path, {
          redirect: "manual",
          headers: { "x-review-role": role },
          signal: AbortSignal.timeout(30000),
        });
        const expectedStatus =
          route === "staff/audit" && !["guest", "administrator"].includes(role)
            ? 404
            : 307;
        const expectedLocation =
          expectedStatus === 404
            ? null
            : role === "guest"
              ? `/${locale}/auth?next=${encodeURIComponent(path)}`
              : `/${locale}/${destination}`;
        assert.equal(response.status, expectedStatus, `${path} ${role} status`);
        assert.equal(
          response.headers.get("location"),
          expectedLocation,
          `${path} ${role} destination`,
        );
        results.push({
          path,
          role,
          status: response.status,
          location: response.headers.get("location"),
          pass: true,
        });
      }
    }
  for (const [route] of routes) {
    const response = await fetch(`${origin}/fr/${route}`, {
      redirect: "manual",
      headers: { "x-review-role": "administrator" },
    });
    assert.equal(response.status, 404);
    results.push({
      path: `/fr/${route}`,
      role: "administrator",
      status: response.status,
      location: response.headers.get("location"),
      pass: true,
    });
  }
  for (const [file, hash] of Object.entries(sourceHashes))
    assert.equal(sha(file), hash, file);
  writeFileSync(
    resolve(output, "results.json"),
    JSON.stringify(
      {
        sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
        sourceHashes,
        actualNextHttp: true,
        identityAndProfileFixtureOnly: true,
        productionAuthRls: false,
        screenshotsApplicable: false,
        destinationAccepted: false,
        mutations: 0,
        results,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `Actual Next redirect review: ${results.length} HTTP cases passed.`,
  );
} finally {
  child.kill("SIGTERM");
  writeFileSync(resolve(output, "next.log"), logs.join(""));
}
