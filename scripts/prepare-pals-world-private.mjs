import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

// One-time source assembly. No deployment, database, or external account writes.
const branch = "release/akipals-world-private-20261031";
assert.equal(process.env.GITHUB_REF, `refs/heads/${branch}`);
const marker = "docs/AKIPALS_PRIVATE_RELEASE_20261031.md";
if (existsSync(marker)) process.exit(0);
const source = "125a38db785ce8bbb5ad228e8e5e3c63c850c599";
const baseline = "76cb96df21bf9404d50db373cf57bb0287fd9a80";
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
git("merge-base", "--is-ancestor", baseline, "HEAD");
git("fetch", "origin", source);
const paths = [
  "src/app/pals/route.ts", "src/app/pals/identity/route.ts",
  "src/app/pals/world/page.tsx", "src/app/pals/world/venues/route.ts",
  "src/components/pals/identity-preview.ts", "src/components/pals/studio-3d.js",
  "src/components/pals/WorldExplorer.tsx", "src/components/pals/WorldExplorer.module.css",
  "src/lib/pals/avatar-v2.ts", "src/lib/pals/world.ts", "public/pals/models",
  "scripts/build-pals-3d.mjs", "scripts/test-pals-identity-browser.mjs",
  "tests/pals-3d-assets.test.ts", "tests/pals-identity.test.ts",
  "tests/pals-world.test.ts", "tests/pals-world-route.test.ts",
  "database/migrations/20261028235830_pals_human_avatar_profiles.sql",
  "docs/AKIPALS_IDENTITY_V2_20261028.md", "docs/AKIPALS_WORLD_EXPLORER_20261031.md",
];
git("restore", `--source=${source}`, "--staged", "--worktree", "--", ...paths);
const read = (p) => readFileSync(p, "utf8");
const save = (p, s) => writeFileSync(p, s);
const change = (p, before, after) => {
  const text = read(p);
  assert.equal(text.split(before).length, 2, `Unique source insertion: ${p}: ${before.slice(0, 70)}`);
  save(p, text.replace(before, after));
};
const pkg = JSON.parse(read("package.json"));
pkg.dependencies.three = "0.186.1";
pkg.scripts["pals:3d:bundle"] = "node scripts/build-pals-3d.mjs";
for (const key of ["predev", "prebuild", "prebuild:cloudflare"]) {
  assert.ok(!pkg.scripts[key], `Preserve existing lifecycle: ${key}`);
  pkg.scripts[key] = "npm run pals:3d:bundle";
}
pkg.scripts["test:pals:browser"] = "npm run pals:3d:bundle && node scripts/test-pals-browser.mjs && node scripts/test-pals-identity-browser.mjs && node scripts/test-pals-world-browser.mjs";
save("package.json", JSON.stringify(pkg, null, 2) + "\n");
const lock = JSON.parse(read("package-lock.json"));
const sourceLock = JSON.parse(git("show", `${source}:package-lock.json`));
assert.equal(sourceLock.packages["node_modules/three"].version, "0.186.1");
lock.packages[""].dependencies.three = "0.186.1";
lock.packages["node_modules/three"] = sourceLock.packages["node_modules/three"];
save("package-lock.json", JSON.stringify(lock, null, 2) + "\n");
if (!read(".gitignore").includes("public/pals/runtime")) save(".gitignore", read(".gitignore") + "\n/public/pals/runtime/\n");
change("next.config.ts", '      // Place token-bearing confirmation override LAST:', `      {
        source: "/pals/world/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "CDN-Cache-Control", value: "no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
      // Place token-bearing confirmation override LAST:`);

const world = "src/components/pals/WorldExplorer.tsx";
change(world, 'import "maplibre-gl/dist/maplibre-gl.css";', 'import "maplibre-gl/dist/maplibre-gl.css";\nimport Link from "next/link";');
// Read position through React state, not a ref hidden behind unrelated dependencies.
change(world, "  const position = useRef<Coordinates | null>(null);", "  const position = useRef<Coordinates | null>(null);\n  const [currentPosition, setCurrentPosition] = useState<Coordinates | null>(null);\n  const [browseCenter, setBrowseCenter] = useState<Coordinates>(WORLD_START);\n  const gpsEpoch = useRef(0);\n  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);");
change(world, "  const center = useMemo(\n    () => position.current || WORLD_START,\n    [gpsActive, gpsStatus, venues],\n  );", "  const center = currentPosition || browseCenter;");
change(world, '    const start = async () => {', '    let loading = false;\n    const start = async () => {\n      if (cancelled || loading || avatarStage.current) return;');
change(world, '      if (!target) return;\n      try {', '      if (!target) return;\n      loading = true;\n      try {');
change(world, '        // Show the explicit avatar fallback; the map must not fail due to WebGL.\n      }', '        if (!cancelled) {\n          target.textContent = "3D unavailable";\n          target.setAttribute("role", "status");\n        }\n      } finally { loading = false; }');
change(world, '        if (!response.ok) return;', '        if (!response.ok) throw new Error("Saved avatar unavailable");');
change(world, '    let localMap: MapInstance | null = null;', '    let localMap: MapInstance | null = null;\n    const ownedMarkers = markers.current;');
change(world, '      markers.current.forEach((marker) => marker.remove());\n      markers.current.clear();', '      ownedMarkers.forEach((marker) => marker.remove());\n      ownedMarkers.clear();');
change(world, '        const at = nextMap.getCenter();\n        void requestVenues', '        const at = nextMap.getCenter();\n        setBrowseCenter({ latitude: at.lat, longitude: at.lng });\n        void requestVenues');
change(world, '    if (!map.current || !lib.current) return;\n    markers.current.forEach', '    if (!map.current || !lib.current) return;\n    const ownedMarkers = markers.current;\n    markers.current.forEach');
// Capture the same marker collection for effect cleanup.
change(world, '    return () => {\n      markers.current.forEach((marker) => marker.remove());\n      markers.current.clear();\n    };', '    return () => {\n      ownedMarkers.forEach((marker) => marker.remove());\n      ownedMarkers.clear();\n    };');
change(world, '  const stopGPS = useCallback(() => {', '  const stopGPS = useCallback(() => {\n    gpsEpoch.current += 1;\n    if (idleTimer.current !== null) clearTimeout(idleTimer.current);');
change(world, '    position.current = null;\n    setGpsActive(false);', '    position.current = null;\n    setCurrentPosition(null);\n    setGpsActive(false);');
change(world, '    setGpsStatus("Waiting for device location permission…");', '    const epoch = ++gpsEpoch.current;\n    setGpsStatus("Waiting for device location permission…");');
change(world, '        if (!tracking.current && gpsWatch.current === null) return;', '        if (epoch !== gpsEpoch.current || document.hidden) return;\n        if (Date.now() - sample.timestamp > 30000 || sample.timestamp > Date.now() + 5000) {\n          setGpsStatus("Waiting for a fresh GPS position…");\n          return;\n        }');
change(world, '        const next = { latitude, longitude };', '        if (!Number.isFinite(accuracy) || accuracy > 100 || accuracy < 0) {\n          setGpsStatus("GPS is too imprecise. Your Pal has not moved; try near an entrance.");\n          return;\n        }\n        const next = { latitude, longitude };\n        setCurrentPosition(next);');
change(world, '        void requestVenues(next);', '        if (idleTimer.current !== null) clearTimeout(idleTimer.current);\n        idleTimer.current = setTimeout(() => avatarStage.current?.setMotion?.({ walking: false }), 1800);\n        void requestVenues(next);');
change(world, '      (error) => {\n        stopGPS();', '      (error) => {\n        if (epoch !== gpsEpoch.current) return;\n        stopGPS();');
change(world, '      document.removeEventListener("visibilitychange", onHidden);', '      document.removeEventListener("visibilitychange", onHidden);\n      gpsEpoch.current += 1;\n      tracking.current = false;\n      if (idleTimer.current !== null) clearTimeout(idleTimer.current);');
change(world, '  const selectedDistance = selected\n    ? distanceMetres(position.current || WORLD_START, selected)\n    : null;', '  const selectedDistance = selected ? distanceMetres(center, selected) : null;');
change(world, '            <div className={styles.mapTools}>', '            <div className={styles.mapTools}>\n              <button type="button" className={styles.iconButton} onClick={() => gpsWatch.current !== null ? stopGPS() : startGPS()} aria-label={gpsActive ? "Stop location tracking" : "Locate my AkiPal"} title={gpsStatus}>◎</button>');
change(world, '          <div className={styles.tourCard}>', '          <div className={styles.tourCard}>\n            <p role="status" data-pals-gps-status>{gpsStatus}</p>');
change(world, '            <p className={styles.status} role="status">\n              {worldStatus}\n            </p>', '            <p className={styles.status} role="status">{worldStatus}</p>\n            <button type="button" className={styles.secondary} onClick={() => { lastCell.current = null; void requestVenues(browseCenter); }}>Refresh nearby places</button>');
// Next internal links use its router and retain the Android application shell.
let text = read(world).replaceAll('<a ', '<Link ').replaceAll('</a>', '</Link>');
save(world, text);
change("src/lib/pals/world.ts", '      row.id.length > 120 ||', '      !row.id.trim() ||\n      row.id.length > 120 ||');
change("src/lib/pals/world.ts", '      claimStatus: row.claimStatus === "unclaimed" ? "unclaimed" : "claimed",', '      claimStatus: row.claimStatus === "claimed" ? "claimed" : "unclaimed",');

const css = "src/components/pals/WorldExplorer.module.css";
save(css, read(css) + '\n/* Keep recovery and venue list available on touch screens. */\n@media(max-width:880px){.side>.panel:last-of-type{display:block}.venueList{max-height:170px}.world{min-height:440px}.tourCard p[data-pals-gps-status]{font-size:11px;margin-bottom:8px}.map :global(.maplibregl-ctrl-bottom-right){bottom:255px}}\n');

const entry = `\n## 2026-10-31 | Owner-authorized restricted AkiPals World playtest\n\nAlex explicitly requested live testing of AkiPals World and Wardrobe. This\nrelease is assembled on production ${baseline}, importing only\nthe reviewed avatar/World source from ${source}; it does not\nmerge the separate consumer overhaul #332 or restore older public application files.\nThe existing server-side administrator/invitation gate, owner-only avatar RLS,\npublic-only venue RPC, and legacy saves are preserved. No migrations are executed.\nPrecise GPS is opt-in and in-memory; callbacks after Stop/background/unmount are\ninvalidated, stale/inaccurate fixes cannot reposition the avatar, and the Stop\ncontrol remains visible while inspecting a venue. World HTTP headers are private,\nno-store and noindex. Venue lookups use rounded map centres; map providers receive\ntile-area requests. No AR recording, rewards, public location sharing or payments.\nFull source check, real WebGL browser fixtures and exact-source Cloudflare packaging\nare mandatory before merge. Fixture tests are not physical Android/GPS or real\nauthenticated production acceptance. Read docs/AKIPALS_PRIVATE_RELEASE_20261031.md.\nRollback reverts this scoped release without deleting avatar or legacy saves.\n`;
for (const p of ["docs/AKIPASA_MASTER.md", "docs/CHANGE_IMPACT_REGISTER.md"]) {
  const value = read(p); const end = value.indexOf("\n");
  save(p, value.slice(0, end + 1) + entry + "\n" + value.slice(end + 1));
}
save(marker, `# AkiPals restricted live test candidate\n\nUser authorization: Alex requested live testing on 31 October 2026.\n\n## Isolation\n\nBase: ${baseline}. Prototype source: ${source}.\nOnly AkiPals source/assets/tests, its build lifecycle, its scoped private HTTP\nheaders and additive documentation are changed. No #332 merge, public navigation\nchange, DB migration execution, new resources, paid services or customer mail.\nThe existing avatar table was installed by the earlier avatar work; deployment\nmust verify it read-only, not reapply its migration. World: /pals/world. Wardrobe: /pals.\n\n## Validation\n\nThe release workflow runs complete npm check, existing playground tests, genuine\n3D Wardrobe and World browser fixtures, and Cloudflare packaging. Screenshots\nand test receipts must be reviewed before merging. All failures remain visible.\nActual physical GPS/Android and signed-in production saves are owner playtest\nitems; do not misrepresent fixture verification as those acceptances.\n\n## Privacy and limits\n\nExisting administrator or active invitation authorization is mandatory. No new\npublic entry links are introduced. This repository is public and the current\nadministrator gate includes existing administrators, not an Alex-only secret.\nGPS runs only on request and stops on hiding the tab. No recording, camera use,\nAR, spatial capture, automatic check-in, XP, reward or real-time friend sharing\nis activated. No fake event/activity data. The world character has preliminary\nmotion rather than a final skeletal walk cycle.\n\n## Rollout\n\nMerge only a validated exact candidate after inspection, observe the existing\nautomatic Cloudflare master build, then verify exact release SHA and private\nroute/asset responses over HTTPS. Do not run a competing manual deployment.\nRollback uses the previous Worker version/source, retaining all user data.\n`);
console.log("Assembled source-pinned restricted AkiPals release; no deployment performed.");
