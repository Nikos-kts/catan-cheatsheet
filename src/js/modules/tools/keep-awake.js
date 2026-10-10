// Keep-screen-on tool (Screen Wake Lock API): stops the phone from dimming or
// locking while it sits next to the board. The choice is remembered; the lock
// is re-acquired whenever the page becomes visible again (browsers release it
// when the tab is hidden).

import { STORAGE_KEYS } from "../constants.js";
import { getString, setString } from "../storage.js";

let sentinel = null;
let onChange = null; // the mounted tool's refresh callback, if any

const isSupported = () => typeof navigator !== "undefined" && "wakeLock" in navigator;
const isWanted = () => getString(STORAGE_KEYS.keepAwake) === "1";

async function acquire() {
  if (!isSupported() || sentinel || document.visibilityState !== "visible") return;
  try {
    sentinel = await navigator.wakeLock.request("screen");
    sentinel.addEventListener("release", () => {
      sentinel = null;
      onChange?.();
    });
  } catch (err) {
    // Refused by the browser (e.g. battery saver); the status line tells the user.
    console.warn("Screen wake lock unavailable:", err);
    sentinel = null;
  }
  onChange?.();
}

async function release() {
  const held = sentinel;
  sentinel = null;
  if (held) await held.release().catch(() => {});
  onChange?.();
}

/** Call once at boot: restores the saved choice and survives tab switches. */
export function initKeepAwake() {
  if (!isSupported()) return;
  document.addEventListener("visibilitychange", () => {
    if (isWanted() && document.visibilityState === "visible") acquire();
  });
  if (isWanted()) acquire();
}

export function mount(root, ui = {}) {
  root.replaceChildren();
  const card = document.createElement("div");
  card.className = "tool-card";

  const title = document.createElement("h3");
  title.className = "tool-title";
  title.textContent = ui.title || "Keep screen on";

  const intro = document.createElement("p");
  intro.className = "tool-intro";
  intro.textContent = ui.intro || "Stop your phone from dimming or locking while the cheat sheet sits next to the board.";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "tool-btn keep-awake-toggle";
  toggle.setAttribute("role", "switch");

  const status = document.createElement("p");
  status.className = "tool-intro keep-awake-status";
  status.setAttribute("aria-live", "polite");

  const refresh = () => {
    const wanted = isWanted();
    toggle.setAttribute("aria-checked", String(wanted));
    toggle.classList.toggle("tool-btn-accent", wanted);
    toggle.textContent = wanted ? `🔆 ${ui.turnOff || "Screen stays on — tap to turn off"}` : `🌙 ${ui.turnOn || "Keep the screen on"}`;
    if (!isSupported()) status.textContent = ui.unsupported || "This browser can't keep the screen on. Raise the auto-lock time in your phone's settings instead.";
    else if (wanted && !sentinel) status.textContent = ui.blocked || "Your browser is not allowing it right now (battery saver?).";
    else status.textContent = wanted ? ui.on || "The screen will stay on while this page is open." : "";
  };

  toggle.disabled = !isSupported();
  toggle.addEventListener("click", async () => {
    const next = !isWanted();
    setString(STORAGE_KEYS.keepAwake, next ? "1" : "0");
    if (next) await acquire();
    else await release();
    refresh();
  });

  onChange = refresh;
  card.append(title, intro, toggle, status);
  root.appendChild(card);
  refresh();
}
