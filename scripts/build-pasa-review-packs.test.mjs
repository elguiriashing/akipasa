import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  symlinkSync,
  readdirSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildReviewPacks } from "./build-pasa-review-packs.mjs";
const sha = (b) => createHash("sha256").update(b).digest("hex");
function fixture(fn) {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "pasa-review-pack-test-"));
  try {
    const root = path.join(tmp, "repo"),
      images = path.join(tmp, "public-images"),
      out = path.join(tmp, "gallery");
    mkdirSync(path.join(root, "docs"), { recursive: true });
    mkdirSync(path.join(root, "src/app/terms"), { recursive: true });
    mkdirSync(images);
    const route = "src/app/terms/page.tsx",
      fallback = "src/app/not-found.tsx";
    writeFileSync(path.join(root, route), "static page");
    writeFileSync(path.join(root, fallback), "404");
    writeFileSync(
      path.join(root, "docs/AKIPASA_UI_ROUTE_MATRIX_20261028.json"),
      JSON.stringify({
        routes: { [route]: { scope: "consumer", status: "in-progress" } },
      }),
    );
    writeFileSync(
      path.join(root, "docs/AKIPASA_UI_FALLBACK_MATRIX_20261029.json"),
      JSON.stringify({
        boundaries: {
          [fallback]: { scope: "consumer", status: "in-progress" },
        },
      }),
    );
    const image = path.join(images, "fixture.png"),
      bytes = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVf8AAAAASUVORK5CYII=",
        "base64",
      );
    writeFileSync(image, bytes);
    const entry = {
      id: "public-proof",
      publicFixture: true,
      kind: "actual-next-disposable",
      reviewedCommit: "1".repeat(40),
      routes: [route],
      sourceHashes: { [route]: sha("static page") },
      image,
      imageSha256: sha(bytes),
      note: "<script>unsafe</script>",
    };
    fn(
      {
        root,
        outputDirectory: out,
        approvedImageRoots: [images],
        catalogs: [{ entries: [entry] }],
      },
      entry,
      { tmp, images, route, image, out },
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
test("deterministic gallery inventories missing proof without accepting routes", () =>
  fixture((opts, e, { out }) => {
    const a = buildReviewPacks(opts);
    assert.equal(a.rows.length, 2);
    assert.equal(
      a.rows.filter((r) => r.classification === "missing-evidence").length,
      1,
    );
    assert.equal(a.acceptanceInferred, false);
    assert.equal(a.coverageComplete, false);
    const first = readFileSync(path.join(out, "manifest.json"), "utf8");
    buildReviewPacks(opts);
    assert.equal(readFileSync(path.join(out, "manifest.json"), "utf8"), first);
    assert.ok(
      !readFileSync(
        path.join(out, "legal-and-attribution.html"),
        "utf8",
      ).includes("<script>unsafe"),
    );
  }));
test("copies only explicitly public pinned images into portable assets", () =>
  fixture((opts, e, { out }) => {
    buildReviewPacks({ ...opts, copyPublicImages: true });
    assert.equal(readdirSync(path.join(out, "assets")).length, 1);
    assert.match(
      readFileSync(path.join(out, "legal-and-attribution.html"), "utf8"),
      /src="assets\//,
    );
  }));
test("stale source and image hash drift remain explicit", () =>
  fixture((opts, e) => {
    e.sourceHashes[e.routes[0]] = "0".repeat(64);
    e.imageSha256 = "0".repeat(64);
    const r = buildReviewPacks(opts).rows.find((r) => r.evidence.length);
    assert.equal(r.classification, "stale-or-partially-bound-evidence");
    assert.equal(r.evidence[0].imageStatus, "hash-drift");
    assert.equal(r.evidence[0].image, null);
  }));
test("historical unbound images display without invented commit/source binding", () =>
  fixture((opts, e) => {
    e.reviewedCommit = null;
    e.sourceHashes = {};
    const r = buildReviewPacks(opts).rows.find((r) => r.evidence.length);
    assert.equal(r.classification, "stale-or-partially-bound-evidence");
    assert.equal(r.evidence[0].reviewedCommit, null);
  }));
test("unapproved image paths, symlinks and executable image types fail closed", () =>
  fixture((opts, e, { tmp, image }) => {
    e.image = path.join(tmp, "private.png");
    assert.throws(() => buildReviewPacks(opts), /approved roots/);
    e.image = image + ".svg";
    assert.throws(() => buildReviewPacks(opts), /image type/);
    const link = path.join(path.dirname(image), "link.png");
    symlinkSync(image, link);
    e.image = link;
    assert.throws(() => buildReviewPacks(opts), /symlink/);
  }));
test("nonpublic, unknown route and duplicate evidence identities rejected", () =>
  fixture((opts, e) => {
    e.publicFixture = false;
    assert.throws(() => buildReviewPacks(opts), /public fixture/);
    e.publicFixture = true;
    e.routes = ["src/app/unknown/page.tsx"];
    assert.throws(() => buildReviewPacks(opts), /Unknown/);
    e.routes = ["src/app/terms/page.tsx"];
    opts.catalogs[0].entries.push(e);
    assert.throws(() => buildReviewPacks(opts), /duplicate/);
  }));
test("unsafe source paths, URLs and output paths refused", () =>
  fixture((opts, e) => {
    e.sourceHashes = { "../secret": "0".repeat(64) };
    assert.throws(() => buildReviewPacks(opts), /source binding/);
    e.sourceHashes = {};
    e.tests = ["javascript:alert(1)"];
    assert.throws(() => buildReviewPacks(opts), /test evidence URL/);
    e.tests = [];
    assert.throws(
      () =>
        buildReviewPacks({
          ...opts,
          outputDirectory: path.join(opts.root, "gallery"),
        }),
      /outside repository/,
    );
  }));
test("symlinked existing output files cannot overwrite arbitrary files", () =>
  fixture((opts, e, { tmp, out }) => {
    mkdirSync(out);
    const victim = path.join(tmp, "victim");
    writeFileSync(victim, "safe");
    symlinkSync(victim, path.join(out, "index.html"));
    assert.throws(() => buildReviewPacks(opts), /Unsafe output file/);
    assert.equal(readFileSync(victim, "utf8"), "safe");
  }));
