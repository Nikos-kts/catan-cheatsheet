import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  fingerprint,
  listSiteFiles,
  buildManifest,
  renderBlock,
  applyBlock,
} from "../scripts/build-offline.mjs";

function makeSite(files) {
  const root = mkdtempSync(join(tmpdir(), "offline-build-"));
  Object.entries(files).filter(([, content]) => content !== undefined).forEach(([path, content]) => {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), content);
  });
  return root;
}

const SITE = {
  "index.html": "<html></html>",
  "src/css/styles.css": "body{}",
  "src/js/app.js": "console.log(1)",
  "src/data/en.json": "{}",
  "src/assets/images/basic/catan.webp": "webp-bytes",
};

test("fingerprint is 16 hex characters and depends only on the content", () => {
  const a = fingerprint(Buffer.from("hello"));
  const b = fingerprint(Buffer.from("hello"));
  const c = fingerprint(Buffer.from("hello!"));

  assert.match(a, /^[0-9a-f]{16}$/);
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("listSiteFiles returns index.html and everything under src/, sorted", () => {
  const root = makeSite(SITE);
  try {
    const files = listSiteFiles(root);

    assert.deepEqual(files, [
      "index.html",
      "src/assets/images/basic/catan.webp",
      "src/css/styles.css",
      "src/data/en.json",
      "src/js/app.js",
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("listSiteFiles leaves out the worker, hidden files and everything that is not part of the site", () => {
  const root = makeSite({
    ...SITE,
    "sw.js": "// worker",
    "README.md": "# readme",
    "tests/x.test.mjs": "test",
    "scripts/build-offline.mjs": "script",
    "src/.DS_Store": "junk",
    "src/assets/notes.txt": "not served to the app",
  });
  try {
    const files = listSiteFiles(root);

    assert.equal(files.length, Object.keys(SITE).length);
    assert.ok(!files.some((f) => /sw\.js|README|tests\/|scripts\/|DS_Store|notes\.txt/.test(f)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("buildManifest records one fingerprint per file", () => {
  const root = makeSite(SITE);
  try {
    const manifest = buildManifest(root);

    assert.deepEqual(Object.keys(manifest.files), listSiteFiles(root));
    assert.equal(manifest.files["src/js/app.js"], fingerprint(Buffer.from(SITE["src/js/app.js"])));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the build fingerprint changes when any site file changes, and only then", () => {
  const root = makeSite(SITE);
  try {
    const before = buildManifest(root).build;
    writeFileSync(join(root, "README.md"), "not part of the site");
    const afterUnrelated = buildManifest(root).build;
    writeFileSync(join(root, "src/data/en.json"), '{"changed":true}');
    const afterChange = buildManifest(root).build;

    assert.match(before, /^[0-9a-f]{12}$/);
    assert.equal(afterUnrelated, before);
    assert.notEqual(afterChange, before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the build fingerprint changes when a file is renamed without changing its content", () => {
  const root = makeSite(SITE);
  const renamed = makeSite({ ...SITE, "src/js/main.js": SITE["src/js/app.js"], "src/js/app.js": undefined });
  try {
    assert.notEqual(buildManifest(root).build, buildManifest(renamed).build);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(renamed, { recursive: true, force: true });
  }
});

test("applyBlock replaces only the generated block of the worker", () => {
  const manifest = { build: "abc123abc123", files: { "index.html": "1111111111111111" } };
  const source = `// header\n${renderBlock({ build: "000000000000", files: {} })}\nconst rest = true;\n`;

  const updated = applyBlock(source, renderBlock(manifest));

  assert.ok(updated.startsWith("// header\n"));
  assert.ok(updated.endsWith("\nconst rest = true;\n"));
  assert.ok(updated.includes('const BUILD = "abc123abc123";'));
  assert.ok(updated.includes('"index.html": "1111111111111111"'));
  assert.ok(!updated.includes("000000000000"));
});

test("applyBlock is idempotent", () => {
  const block = renderBlock({ build: "abc123abc123", files: { "index.html": "1111111111111111" } });
  const source = `// header\n${block}\n// footer\n`;

  assert.equal(applyBlock(source, block), source);
});

test("applyBlock refuses a worker without the generated-block markers", () => {
  const block = renderBlock({ build: "abc123abc123", files: {} });

  assert.throws(() => applyBlock("const nothing = 1;\n", block), /marker/i);
});
