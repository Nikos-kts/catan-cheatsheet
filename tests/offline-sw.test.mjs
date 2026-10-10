// Runs the real sw.js in a sandbox with a fake Cache API and a fake network,
// so the install / update / serve logic is tested without a browser.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { applyBlock, fingerprint, renderBlock } from "../scripts/build-offline.mjs";

const SCOPE = "https://example.test/cheatsheet/";
const WORKER_SOURCE = readFileSync(new URL("../sw.js", import.meta.url), "utf8");

const SITE_V1 = {
  "index.html": "<html>v1</html>",
  "src/js/app.js": "console.log('v1')",
  "src/data/en.json": '{"v":1}',
  "src/assets/images/basic/catan.webp": "image-bytes",
};
const SITE_V2 = { ...SITE_V1, "src/data/en.json": '{"v":2}' };

const manifestOf = (build, site) => ({
  build,
  files: Object.fromEntries(Object.entries(site).map(([path, content]) => [path, fingerprint(Buffer.from(content))])),
});
const V1 = manifestOf("111111111111", SITE_V1);
const V2 = manifestOf("222222222222", SITE_V2);
const cacheName = (manifest) => `cheatsheet-${manifest.build}`;
const urlOf = (path) => SCOPE + path;

class FakeCache {
  entries = new Map();
  async put(request, response) {
    this.entries.set(request.url ?? String(request), Buffer.from(await response.arrayBuffer()));
  }
  async match(request) {
    const body = this.entries.get(request.url ?? String(request));
    return body === undefined ? undefined : new Response(body);
  }
}

class FakeCacheStorage {
  stores = new Map();
  async open(name) {
    if (!this.stores.has(name)) this.stores.set(name, new FakeCache());
    return this.stores.get(name);
  }
  async keys() {
    return [...this.stores.keys()];
  }
  async delete(name) {
    return this.stores.delete(name);
  }
  text(name, path) {
    return this.stores.get(name)?.entries.get(urlOf(path))?.toString();
  }
}

/**
 * Loads sw.js for `manifest`. `server` maps site paths to the content the network
 * returns; `httpCache` holds copies the browser would answer with unless the
 * request says cache: "no-store".
 */
function loadWorker({ manifest, caches, server = {}, httpCache = {}, online = true }) {
  const handlers = {};
  const log = { fetched: [], skipWaiting: 0, claimed: 0 }; // fetched = requests that reached the server
  const self = {
    addEventListener: (type, handler) => { handlers[type] = handler; },
    registration: { scope: SCOPE },
    skipWaiting: async () => { log.skipWaiting += 1; },
    clients: { claim: async () => { log.claimed += 1; } },
  };
  const fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input.url;
    const path = url.slice(SCOPE.length).split("?")[0];
    if (init.cache !== "no-store" && path in httpCache) return new Response(httpCache[path]);
    log.fetched.push({ path: url.slice(SCOPE.length), cache: init.cache });
    if (!online) throw new TypeError("Failed to fetch");
    return path in server ? new Response(server[path]) : new Response("not found", { status: 404 });
  };
  vm.runInNewContext(applyBlock(WORKER_SOURCE, renderBlock(manifest)), {
    self, caches, fetch, crypto: globalThis.crypto, Response, URL, console,
  });

  const dispatch = async (type) => {
    assert.equal(typeof handlers[type], "function", `the worker must handle "${type}"`);
    const pending = [];
    handlers[type]({ waitUntil: (promise) => pending.push(promise) });
    await Promise.all(pending);
  };
  const request = async (url, { method = "GET", mode = "cors" } = {}) => {
    assert.equal(typeof handlers.fetch, "function", 'the worker must handle "fetch"');
    let answer;
    handlers.fetch({ request: { url, method, mode }, respondWith: (promise) => { answer = promise; } });
    return answer === undefined ? undefined : await answer;
  };
  const ask = async (data) => {
    assert.equal(typeof handlers.message, "function", 'the worker must handle "message"');
    const replies = [];
    handlers.message({ data, ports: [{ postMessage: (reply) => replies.push(reply) }] });
    return replies;
  };
  return { install: () => dispatch("install"), activate: () => dispatch("activate"), request, ask, log };
}

async function installed(manifest, site, caches = new FakeCacheStorage()) {
  const worker = loadWorker({ manifest, caches, server: site });
  await worker.install();
  await worker.activate();
  return { worker, caches };
}

test("install saves every listed file in a cache named after the build", async () => {
  const caches = new FakeCacheStorage();
  const worker = loadWorker({ manifest: V1, caches, server: SITE_V1 });

  await worker.install();

  Object.entries(SITE_V1).forEach(([path, content]) => {
    assert.equal(caches.text(cacheName(V1), path), content, path);
  });
});

test("files the browser has just loaded are saved without asking the server again", async () => {
  const caches = new FakeCacheStorage();
  const worker = loadWorker({ manifest: V1, caches, httpCache: SITE_V1, server: SITE_V1 });

  await worker.install();

  assert.deepEqual(worker.log.fetched, []);
  assert.equal(caches.text(cacheName(V1), "src/js/app.js"), SITE_V1["src/js/app.js"]);
});

test("a stale copy in the browser's HTTP cache is never saved: the server is asked directly", async () => {
  const { caches } = await installed(V1, SITE_V1);
  const update = loadWorker({ manifest: V2, caches, httpCache: SITE_V1, server: SITE_V2 });

  await update.install();

  assert.equal(caches.text(cacheName(V2), "src/data/en.json"), SITE_V2["src/data/en.json"]);
  assert.deepEqual(update.log.fetched, [{ path: "src/data/en.json", cache: "no-store" }]);
});

test("a successful install takes over immediately", async () => {
  const worker = loadWorker({ manifest: V1, caches: new FakeCacheStorage(), server: SITE_V1 });

  await worker.install();

  assert.equal(worker.log.skipWaiting, 1);
});

test("an update downloads only the files whose fingerprint changed", async () => {
  const { caches } = await installed(V1, SITE_V1);
  const update = loadWorker({ manifest: V2, caches, server: SITE_V2 });

  await update.install();

  assert.deepEqual(update.log.fetched.map((f) => f.path), ["src/data/en.json"]);
  Object.entries(SITE_V2).forEach(([path, content]) => {
    assert.equal(caches.text(cacheName(V2), path), content, path);
  });
});

test("an update is rejected when a download does not match its fingerprint", async () => {
  const { caches } = await installed(V1, SITE_V1);
  const halfDeployed = { ...SITE_V2, "src/data/en.json": SITE_V1["src/data/en.json"] }; // server still has the old file
  const update = loadWorker({ manifest: V2, caches, server: halfDeployed });

  await assert.rejects(update.install(), /fingerprint/i);

  assert.equal(update.log.skipWaiting, 0);
  assert.equal(caches.text(cacheName(V2), "src/data/en.json"), undefined);
  assert.equal(caches.text(cacheName(V1), "src/data/en.json"), SITE_V1["src/data/en.json"]);
});

test("an update is rejected when a file cannot be downloaded", async () => {
  const { caches } = await installed(V1, SITE_V1);
  const { "src/data/en.json": missing, ...incomplete } = SITE_V2;
  const update = loadWorker({ manifest: V2, caches, server: incomplete });

  await assert.rejects(update.install(), /404/);

  assert.equal(update.log.skipWaiting, 0);
});

test("the previous version keeps working after a rejected update", async () => {
  const { worker, caches } = await installed(V1, SITE_V1);
  const update = loadWorker({ manifest: V2, caches, server: {} });
  await assert.rejects(update.install());

  const response = await worker.request(urlOf("src/data/en.json"));

  assert.equal(await response.text(), SITE_V1["src/data/en.json"]);
});

test("a retry after a rejected update does not download verified files again", async () => {
  const site = { ...SITE_V1, "src/js/app.js": "console.log('v3')", "src/data/en.json": '{"v":3}' };
  const manifest = manifestOf("333333333333", site);
  const { caches } = await installed(V1, SITE_V1);
  const { "src/data/en.json": notYetDeployed, ...partial } = site;
  await assert.rejects(loadWorker({ manifest, caches, server: partial }).install());
  const retry = loadWorker({ manifest, caches, server: site });

  await retry.install();

  assert.deepEqual(retry.log.fetched.map((f) => f.path), ["src/data/en.json"]);
});

test("activate removes the caches of other builds and nothing else", async () => {
  const { caches } = await installed(V1, SITE_V1);
  await caches.open("someone-elses-cache");
  const update = loadWorker({ manifest: V2, caches, server: SITE_V2 });
  await update.install();

  await update.activate();

  assert.deepEqual((await caches.keys()).sort(), [cacheName(V2), "someone-elses-cache"].sort());
  assert.equal(update.log.claimed, 1);
});

test("opening the app with no connection serves the saved page", async () => {
  const { caches } = await installed(V1, SITE_V1);
  const offline = loadWorker({ manifest: V1, caches, online: false });

  const response = await offline.request(SCOPE, { mode: "navigate" });

  assert.equal(await response.text(), SITE_V1["index.html"]);
});

test("saved files are served without touching the network", async () => {
  const { worker } = await installed(V1, SITE_V1);
  const downloads = worker.log.fetched.length;

  const response = await worker.request(urlOf("src/assets/images/basic/catan.webp"));

  assert.equal(await response.text(), SITE_V1["src/assets/images/basic/catan.webp"]);
  assert.equal(worker.log.fetched.length, downloads);
});

test("a query string does not prevent a saved file from being served", async () => {
  const { caches } = await installed(V1, SITE_V1);
  const offline = loadWorker({ manifest: V1, caches, online: false });

  const response = await offline.request(`${SCOPE}index.html?source=homescreen`, { mode: "navigate" });

  assert.equal(await response.text(), SITE_V1["index.html"]);
});

test("a saved file that the browser evicted is fetched from the network instead", async () => {
  const { worker, caches } = await installed(V1, SITE_V1);
  (await caches.open(cacheName(V1))).entries.delete(urlOf("src/js/app.js"));

  const response = await worker.request(urlOf("src/js/app.js"));

  assert.equal(await response.text(), SITE_V1["src/js/app.js"]);
});

test("requests the worker does not own are left to the browser", async () => {
  const { worker } = await installed(V1, SITE_V1);

  const unlisted = await worker.request(urlOf("README.md"));
  const otherSite = await worker.request("https://www.paypal.com/donate/");
  const outsideScope = await worker.request("https://example.test/other-project/index.html");
  const post = await worker.request(urlOf("index.html"), { method: "POST" });

  assert.deepEqual([unlisted, otherSite, outsideScope, post], [undefined, undefined, undefined, undefined]);
});

test("a page can ask which build it is being served", async () => {
  const { worker } = await installed(V1, SITE_V1);

  const replies = await worker.ask({ type: "build" });

  assert.deepEqual(replies.map((reply) => reply.build), [V1.build]); // replies come from the sandbox realm
});

test("unknown messages get no reply", async () => {
  const { worker } = await installed(V1, SITE_V1);

  assert.deepEqual(await worker.ask({ type: "something-else" }), []);
  assert.deepEqual(await worker.ask(null), []);
});
