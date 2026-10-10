import { test } from "node:test";
import assert from "node:assert/strict";
import { isEnabled, statusOf, isCheckDue, CHECK_INTERVAL_MS } from "../src/js/modules/offline.js";

test("offline saving is on for the published site", () => {
  assert.equal(isEnabled({ hostname: "nikos-kts.github.io", search: "" }), true);
});

test("offline saving stays off on a local preview so edits are never hidden by a saved copy", () => {
  assert.equal(isEnabled({ hostname: "localhost", search: "" }), false);
  assert.equal(isEnabled({ hostname: "127.0.0.1", search: "?lang=el" }), false);
});

test("a local preview can opt in with ?offline", () => {
  assert.equal(isEnabled({ hostname: "localhost", search: "?offline" }), true);
  assert.equal(isEnabled({ hostname: "127.0.0.1", search: "?lang=el&offline=1" }), true);
});

test("status is 'unsupported' when the browser has no service workers", () => {
  assert.equal(statusOf({ supported: false, enabled: true, controlled: false }), "unsupported");
});

test("status is 'disabled' on a local preview without the opt-in", () => {
  assert.equal(statusOf({ supported: true, enabled: false, controlled: false }), "disabled");
});

test("status is 'saving' until the saved copy controls the page, then 'ready'", () => {
  assert.equal(statusOf({ supported: true, enabled: true, controlled: false }), "saving");
  assert.equal(statusOf({ supported: true, enabled: true, controlled: true }), "ready");
});

test("an update check is due only after the interval has passed", () => {
  const now = 1_000_000_000;

  assert.equal(isCheckDue(now - CHECK_INTERVAL_MS - 1, now), true);
  assert.equal(isCheckDue(now - CHECK_INTERVAL_MS + 1000, now), false);
});
