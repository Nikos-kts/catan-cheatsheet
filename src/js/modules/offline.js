// Offline support, page side: registers the service worker (sw.js), asks it to
// look for a new build when the app is opened or brought back to the front, and
// reports status changes. The worker does the saving, verifying and serving.

const WORKER_URL = "sw.js";
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];
const LOCAL_OPT_IN = "offline"; // e.g. http://localhost:3000/?offline
const BUILD_REPLY_TIMEOUT_MS = 2000;
export const CHECK_INTERVAL_MS = 60 * 60 * 1000;

const listeners = new Set();
let registration = null;
let lastCheck = 0;
let updateReady = false;

/** Off on local previews (a saved copy would hide your edits) unless ?offline is in the address. */
export function isEnabled({ hostname, search }) {
  return !LOCAL_HOSTS.includes(hostname) || new URLSearchParams(search).has(LOCAL_OPT_IN);
}

export function statusOf({ supported, enabled, controlled }) {
  if (!supported) return "unsupported";
  if (!enabled) return "disabled";
  return controlled ? "ready" : "saving";
}

export const isCheckDue = (lastCheckMs, nowMs) => nowMs - lastCheckMs >= CHECK_INTERVAL_MS;

const isSupported = () => typeof navigator !== "undefined" && "serviceWorker" in navigator;
const notify = () => listeners.forEach((listener) => listener());

/** "unsupported" | "disabled" | "saving" | "ready" */
export function getStatus() {
  const supported = isSupported();
  return statusOf({
    supported,
    enabled: isEnabled(window.location),
    controlled: supported && Boolean(navigator.serviceWorker.controller),
  });
}

/** True once a newer build has replaced the one that loaded this page. */
export const isUpdateReady = () => updateReady;

/** Calls `listener` whenever the status or update state changes; returns an unsubscribe function. */
export function onChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Build fingerprint of the saved copy serving this page, or null. */
export function getBuild() {
  const worker = isSupported() ? navigator.serviceWorker.controller : null;
  if (!worker) return Promise.resolve(null);
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(null), BUILD_REPLY_TIMEOUT_MS);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      resolve((event.data && event.data.build) || null);
    };
    worker.postMessage({ type: "build" }, [channel.port2]);
  });
}

function checkForUpdate() {
  if (!registration || !navigator.onLine) return;
  lastCheck = Date.now();
  // Fails when the server can't be reached; the next check simply tries again.
  registration.update().catch((err) => console.debug("Update check failed:", err));
}

async function unregisterAll() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((item) => item.unregister()));
}

/** Call once at boot. */
export async function initOffline() {
  if (!isSupported()) return;
  if (!isEnabled(window.location)) {
    // Local preview: make sure an earlier opt-in doesn't keep serving a saved copy.
    await unregisterAll().catch((err) => console.warn("Could not switch offline support off:", err));
    return;
  }

  let wasControlled = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (wasControlled) updateReady = true;
    wasControlled = true;
    notify();
  });

  try {
    // updateViaCache "none": the browser always asks the server for sw.js itself.
    registration = await navigator.serviceWorker.register(WORKER_URL, { updateViaCache: "none" });
    lastCheck = Date.now(); // opening the page already made the browser check
  } catch (err) {
    console.warn("Offline support unavailable:", err);
    return;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && isCheckDue(lastCheck, Date.now())) checkForUpdate();
  });
  window.addEventListener("online", checkForUpdate);
}
