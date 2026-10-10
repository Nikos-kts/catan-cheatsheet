// Guards the deployed site: fails when a site file changed but the fingerprints
// in sw.js were not regenerated (visitors would then never receive the change).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { applyBlock, buildManifest, renderBlock } from "../scripts/build-offline.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

test("sw.js fingerprints match the site files", () => {
  const worker = readFileSync(join(ROOT, "sw.js"), "utf8");

  const regenerated = applyBlock(worker, renderBlock(buildManifest(ROOT)));

  assert.ok(regenerated === worker, "sw.js is out of date — run: node scripts/build-offline.mjs");
});

test("the site is small enough to save on a phone in one go", () => {
  const { files } = buildManifest(ROOT);
  const bytes = Object.keys(files).reduce((sum, path) => sum + readFileSync(join(ROOT, path)).length, 0);
  const MAX_SITE_BYTES = 5 * 1024 * 1024;

  assert.ok(bytes < MAX_SITE_BYTES, `site is ${(bytes / 1048576).toFixed(1)} MB; offline copy should stay under 5 MB`);
});
