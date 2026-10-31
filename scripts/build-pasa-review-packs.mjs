#!/usr/bin/env node
// Deterministic offline HTML evidence index. Never runs browsers, DBs or network.
import { createHash } from "node:crypto";
import {
  lstatSync,
  readFileSync,
  realpathSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
function writeArtifact(file, bytes) {
  if (
    lstatExists(file) &&
    (!lstatSync(file).isFile() || lstatSync(file).isSymbolicLink())
  )
    throw Error("Unsafe output file");
  writeFileSync(file, bytes);
}
const hash = (b) => createHash("sha256").update(b).digest("hex");
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const inside = (root, file) =>
  file === root || file.startsWith(root + path.sep);
function safePath(file, roots) {
  const p = path.resolve(file);
  if (!roots.some((r) => inside(path.resolve(r), p)))
    throw Error("Path outside approved roots");
  try {
    if (
      lstatSync(p).isSymbolicLink() ||
      realpathSync(p) !== p ||
      !lstatSync(p).isFile()
    )
      throw Error("Nonregular/symlinked evidence path");
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  return p;
}
function lstatExists(file) {
  try {
    lstatSync(file);
    return true;
  } catch (e) {
    if (e.code === "ENOENT") return false;
    throw e;
  }
}
function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}
export function familyFor(file) {
  if (!file.endsWith("page.tsx")) return "Fallback boundaries";
  const route = file.replace(/^src\/app\/(?:\[locale\]\/)?/, "");
  if (route.startsWith("admin/")) return "Admin operations";
  if (route.startsWith("staff/")) return "Staff operations";
  if (route.startsWith("owner/")) return "Owner workspace";
  if (route.startsWith("account/") || route.startsWith("profile/"))
    return "Account and profile";
  if (/^(passport|prestige|achievements)/.test(route))
    return "Passport and progression";
  if (/^(community|creators)/.test(route)) return "Community and creators";
  if (/^(auth|onboarding|terms\/accept)/.test(route))
    return "Sign-in and onboarding";
  if (/^(business|moderation|hq-login)/.test(route))
    return "Business and operational entry";
  if (/^(membership|pricing|referrals)/.test(route))
    return "Membership and referrals";
  if (/^(privacy|terms|photo-credits)/.test(route))
    return "Legal and attribution";
  if (/^(roadmap|waitlist)/.test(route) || file === "src/app/page.tsx")
    return "Launch and entrypoints";
  if (/^(akipals|pals|avatar)/.test(route)) return "AkiPals identity";
  return "Discovery and detail";
}
const kinds = new Set([
  "actual-next-disposable",
  "component-disposable",
  "browser-emulated",
  "physical-device",
  "redirect-http-only",
]);
export function buildReviewPacks({
  root,
  outputDirectory,
  catalogs = [],
  approvedImageRoots = [],
  candidateCommit = null,
  copyPublicImages = false,
}) {
  root = path.resolve(root);
  const out = path.resolve(outputDirectory);
  if (
    inside(root, out) ||
    out === path.parse(out).root ||
    realpathSync(path.dirname(out)) !== path.dirname(out)
  )
    throw Error("Output must be outside repository under real existing parent");
  if (candidateCommit !== null && !/^[a-f0-9]{40}$/.test(candidateCommit))
    throw Error("Invalid candidate commit label");
  const matrix = readJson(
    path.join(root, "docs/AKIPASA_UI_ROUTE_MATRIX_20261028.json"),
  );
  const fallback = readJson(
    path.join(root, "docs/AKIPASA_UI_FALLBACK_MATRIX_20261029.json"),
  );
  const rows = [
    ...Object.entries(matrix.routes).filter(
      ([, r]) => r.scope !== "other-product" && r.status !== "excluded",
    ),
    ...Object.entries(fallback.boundaries),
  ].map(([file, r]) => ({
    sourcePath: file,
    family: familyFor(file),
    matrixStatus: r.status,
    sourceSha256: hash(readFileSync(safePath(path.join(root, file), [root]))),
    evidence: [],
  }));
  const routes = new Map(rows.map((r) => [r.sourcePath, r]));
  for (const catalog of catalogs)
    for (const review of catalog.routeReviews || []) {
      if (!routes.has(review.source)) throw Error("Unknown inventory route");
      const row = routes.get(review.source);
      (row.ownerReviews ??= []).push(review);
    }
  const ids = new Set();
  for (const catalog of catalogs)
    for (const item of catalog.entries || []) {
      if (typeof item.id !== "string" || ids.has(item.id))
        throw Error("Missing/duplicate evidence identity");
      ids.add(item.id);
      if (item.publicFixture !== true || !kinds.has(item.kind))
        throw Error("Evidence must declare approved public fixture/type");
      if (
        !Array.isArray(item.routes) ||
        !item.routes.length ||
        item.routes.some((r) => !routes.has(r))
      )
        throw Error("Unknown evidence route");
      if (
        item.reviewedCommit != null &&
        !/^[a-f0-9]{40}$/.test(item.reviewedCommit)
      )
        throw Error("Evidence requires real reviewed source commit");
      const sources = Object.entries(item.sourceHashes || {});

      let sourceMatch = sources.length > 0;
      for (const [file, sha] of sources) {
        if (
          path.isAbsolute(file) ||
          file.split(/[\\/]/).includes("..") ||
          !["src/", "tests/", "scripts/", "public/"].some((prefix) =>
            file.startsWith(prefix),
          ) ||
          !/^[a-f0-9]{64}$/.test(sha)
        )
          throw Error("Unsafe source binding");
        const p = safePath(path.join(root, file), [root]);
        try {
          if (hash(readFileSync(p)) !== sha) sourceMatch = false;
        } catch (e) {
          if (e.code !== "ENOENT") throw e;
          sourceMatch = false;
        }
      }
      let imageStatus = "not-required-redirect",
        image = null;
      if (item.kind !== "redirect-http-only" || item.image) {
        if (!/^[a-f0-9]{64}$/.test(item.imageSha256 || ""))
          throw Error("Image requires pinned SHA256");
        const p = safePath(item.image, approvedImageRoots);
        if (!/\.(png|jpe?g|webp)$/i.test(p)) throw Error("Unsafe image type");
        try {
          const bytes = readFileSync(p);
          if (bytes.length > 25 * 1024 * 1024) throw Error("Image too large");
          if (
            !(
              bytes
                .subarray(0, 8)
                .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
              (bytes[0] === 255 && bytes[1] === 216) ||
              (bytes.subarray(0, 4).toString() === "RIFF" &&
                bytes.subarray(8, 12).toString() === "WEBP")
            )
          )
            throw Error("Invalid image bytes");
          imageStatus =
            hash(bytes) === item.imageSha256 ? "hash-verified" : "hash-drift";
          if (imageStatus === "hash-verified") image = p;
        } catch (e) {
          if (e.code !== "ENOENT") throw e;
          imageStatus = "missing-file";
        }
      }
      const tests = (item.tests || []).map((url) => {
        if (
          !/^https:\/\/github\.com\/elguiriashing\/akipasa\/(?:actions\/runs|pull)\/\d+(?:[\/#?].*)?$/.test(
            url,
          )
        )
          throw Error("Unsafe test evidence URL");
        return url;
      });
      for (const route of item.routes) {
        const row = routes.get(route);
        row.evidence.push({
          id: item.id,
          kind: item.kind,
          reviewedCommit: item.reviewedCommit || null,
          sourceLabel: item.sourceLabel || "unbound",
          sourceHashes: Object.fromEntries(sources),
          sourceMatch,
          routeSourcePinned: item.sourceHashes[route] === row.sourceSha256,
          imageStatus,
          image,
          imageSha256: item.imageSha256 || null,
          locale: item.locale || "unspecified",
          theme: item.theme || "unspecified",
          viewport: item.viewport || "unspecified",
          state: item.state || "unspecified",
          role: item.role || "unspecified",
          tests,
          note: item.note || "",
          approval: "not-inferred",
        });
      }
    }
  for (const row of rows) {
    row.evidence.sort((a, b) => a.id.localeCompare(b.id));
    row.classification = !row.evidence.length
      ? "missing-evidence"
      : row.evidence.some(
            (e) =>
              e.reviewedCommit &&
              e.sourceMatch &&
              e.routeSourcePinned &&
              ["hash-verified", "not-required-redirect"].includes(
                e.imageStatus,
              ),
          )
        ? "scoped-source-bound-evidence"
        : "stale-or-partially-bound-evidence";
  }
  rows.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
  const families = [...new Set(rows.map((r) => r.family))].sort();
  const result = {
    version: 1,
    candidateCommitLabel: candidateCommit,
    finalCandidateLabelVerified: false,
    scope: {
      inScopeRoutes: rows.filter((r) => r.sourcePath.endsWith("page.tsx"))
        .length,
      fallbacks: rows.filter((r) => !r.sourcePath.endsWith("page.tsx")).length,
    },
    unassignedEvidence: catalogs.flatMap((c) => c.unassignedEvidence || []),
    acceptanceInferred: false,
    coverageComplete: false,
    inventoryHasEvidenceForEveryRecord: rows.every(
      (r) => r.classification !== "missing-evidence",
    ),
    rows,
  };
  mkdirSync(out, { recursive: true });
  if (lstatSync(out).isSymbolicLink() || realpathSync(out) !== out)
    throw Error("Unsafe output directory");
  if (copyPublicImages) {
    const assets = path.join(out, "assets");
    mkdirSync(assets, { recursive: true });
    if (realpathSync(assets) !== assets) throw Error("Unsafe asset directory");
    for (const row of rows) {
      let selected = 0;
      for (const e of row.evidence) {
        e.galleryImage = null;
        if (e.image && selected < 2) {
          const target = path.join(
            assets,
            e.imageSha256 + path.extname(e.image).toLowerCase(),
          );
          if (lstatExists(target) && lstatSync(target).isSymbolicLink())
            throw Error("Unsafe asset symlink");
          writeArtifact(target, readFileSync(e.image));
          e.galleryImage = target;
          selected++;
        }
      }
    }
  } else
    for (const row of rows)
      for (const e of row.evidence) e.galleryImage = e.image;
  const slug = (f) => f.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const style =
    "body{margin:0;background:#0a0b0c;color:#f7f3ef;font:16px/1.6 system-ui}main{min-width:0;max-width:1250px;margin:auto;padding:24px}a{color:#ffb17c}h1,h2{line-height:1.15}nav{display:flex;gap:14px;flex-wrap:wrap}article{border:1px solid #493a2d;border-radius:16px;padding:20px;margin:24px 0}table{border-collapse:collapse;width:100%}td,th{overflow-wrap:anywhere;padding:10px;text-align:left;border-bottom:1px solid #333}.shots{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}figure{margin:0;padding:10px;background:#171717;border-radius:10px}img{width:100%;height:320px;object-fit:contain;background:#080808}small,code,h1,h2,p,li,figcaption{overflow-wrap:anywhere}.missing{color:#ffcda4}.pill{border:1px solid #555;border-radius:10px;padding:3px 8px}input{font:inherit;padding:10px;width:min(90%,600px);margin:16px 0}summary{cursor:pointer}figcaption{font-size:12px}";
  const page = (title, content) =>
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' file:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'"><title>${escape(title)}</title><style>${style}</style><main><nav><a href="index.html">All families</a><a href="manifest.json">Machine-readable evidence</a></nav><h1>${escape(title)}</h1><p>Candidate label: ${escape(candidateCommit || "NOT FINAL — unpublished candidate")}. Evidence and matrix status are separate. No acceptance, hardware testing or full route coverage is inferred.</p>${content}</main></html>`;
  const display = (row) =>
    `<article id="${escape(row.sourcePath)}"><h2>${escape(row.sourcePath)}</h2><p><span class="pill">${escape(row.classification)}</span> Matrix: ${escape(row.matrixStatus)}<br>${row.ownerReviews?.map((v) => `<span class="pill">Implementation class ${escape(v.class)}: ${escape(v.classLabel || v.label || "owner inventory")}</span><p>${escape((v.missingProof || v.missingStates || []).join("; "))}</p>`).join("") || "Implementation classification: owner inventory pending.<br>"}<small>Current file SHA256 ${row.sourceSha256}</small></p>${
      !row.evidence.length
        ? '<p class="missing">Missing: source-bound screenshot/redirect proof, state/role coverage and responsible review. Owner inventory required.</p>'
        : `<div class="shots">${row.evidence
            .filter((e) => e.galleryImage || e.kind === "redirect-http-only")
            .map(
              (e) =>
                `<figure>${e.galleryImage ? `<a href="${escape(path.relative(out, e.galleryImage).split(path.sep).join("/"))}"><img loading="lazy" src="${escape(path.relative(out, e.galleryImage).split(path.sep).join("/"))}" alt="${escape(row.sourcePath + " " + e.locale + " " + e.theme + " " + e.viewport)}"></a>` : `<p>${escape(e.imageStatus)}</p>`}<figcaption><strong>${escape(e.kind)}</strong> · ${escape(e.locale)} · ${escape(e.theme)} · ${escape(e.viewport)}<br>State: ${escape(e.state)} · Role: ${escape(e.role)}<br>Source: ${escape(e.reviewedCommit)}<br>Declared source hashes match: ${e.sourceMatch}; this route pinned: ${e.routeSourcePinned}<br>${e.tests.map((u, i) => `<a href="${escape(u)}">Test evidence ${i + 1}</a>`).join(" ")}<details><summary>Original file and limitations</summary>${escape(e.image || "No screen: redirect-only")}<br>${escape(e.note)}</details></figcaption></figure>`,
            )
            .join(
              "",
            )}</div><details><summary>All ${row.evidence.length} evidence records, including historical/uncopied originals</summary><table><tr><th>Context</th><th>Kind / binding</th><th>Original screenshot</th></tr>${row.evidence.map((e) => `<tr><td>${escape(e.locale)} / ${escape(e.theme)} / ${escape(e.viewport)}<br>${escape(e.state)}</td><td>${escape(e.kind)}<br>${escape(e.imageStatus)}; declared-source match ${e.sourceMatch}; route pinned ${e.routeSourcePinned}<br>${escape(e.note)}</td><td><small>${escape(e.image || "Redirect only; no screen")}<br>SHA256 ${escape(e.imageSha256 || "n/a")}</small></td></tr>`).join("")}</table></details>`
    }</article>`;
  for (const family of families)
    writeArtifact(
      path.join(out, slug(family) + ".html"),
      page(
        family,
        rows
          .filter((r) => r.family === family)
          .map(display)
          .join("\n"),
      ),
    );
  const missing = rows.filter(
    (r) => r.classification !== "scoped-source-bound-evidence",
  );
  writeArtifact(
    path.join(out, "index.html"),
    page(
      "AkiPasa route review packs",
      `<p>${result.scope.inScopeRoutes} in-scope routes + ${result.scope.fallbacks} fallback boundaries. ${missing.length} records lack complete declared scoped source binding. These counts are not release acceptance.</p><nav>${families.map((f) => `<a href="${slug(f)}.html">${escape(f)} (${rows.filter((r) => r.family === f).length})</a>`).join("")}</nav><h2>Missing or stale proof</h2><table><tr><th>Route / boundary</th><th>Classification</th><th>Family</th></tr>${missing.map((r) => `<tr><td><a href="${slug(r.family)}.html#${escape(r.sourcePath)}">${escape(r.sourcePath)}</a></td><td>${escape(r.classification)}</td><td>${escape(r.family)}</td></tr>`).join("")}</table>`,
    ),
  );
  writeArtifact(
    path.join(out, "manifest.json"),
    JSON.stringify(result, null, 2) + "\n",
  );
  return result;
}
export function runCli(args = process.argv.slice(2)) {
  const opts = {
    root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
    catalogs: [],
    approvedImageRoots: [],
  };
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i],
      value = args[i + 1];
    if (!value) throw Error("Missing option value");
    if (flag === "--root") opts.root = path.resolve(value);
    else if (flag === "--output") opts.outputDirectory = path.resolve(value);
    else if (flag === "--catalog")
      opts.catalogs.push(
        readJson(safePath(value, [path.dirname(path.resolve(value))])),
      );
    else if (flag === "--public-fixture-root")
      opts.approvedImageRoots.push(path.resolve(value));
    else if (flag === "--candidate") opts.candidateCommit = value;
    else if (flag === "--copy-public-images") {
      if (!["true", "false"].includes(value))
        throw Error("Copy option requires true/false");
      opts.copyPublicImages = value === "true";
    } else throw Error("Unknown option; no execution/apply/network modes");
  }
  if (!opts.outputDirectory)
    throw Error("Explicit outside-repository --output required");
  const r = buildReviewPacks(opts);
  console.log(
    JSON.stringify({
      scope: r.scope,
      evidenceRecords: r.rows.filter((v) => v.evidence.length).length,
      missing: r.rows.filter((v) => !v.evidence.length).length,
      acceptanceInferred: false,
    }),
  );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    runCli();
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
