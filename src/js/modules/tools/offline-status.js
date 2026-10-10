// "Use offline" tool: shows whether the site is saved on this device and which
// build is being served. The saving itself is done by sw.js.

import { getBuild, getStatus, onChange } from "../offline.js";

let unsubscribe = null; // the mounted card's listener, if any

export function mount(root, ui = {}) {
  root.replaceChildren();
  const card = document.createElement("div");
  card.className = "tool-card";

  const title = document.createElement("h3");
  title.className = "tool-title";
  title.textContent = ui.title || "Use offline";

  const intro = document.createElement("p");
  intro.className = "tool-intro";
  intro.textContent = ui.intro || "After your first visit the cheat sheet is saved on this device, so it opens even with no signal.";

  const status = document.createElement("p");
  status.className = "offline-status";
  status.setAttribute("aria-live", "polite");

  const version = document.createElement("p");
  version.className = "tool-intro offline-version";

  const tip = document.createElement("p");
  tip.className = "tool-intro";
  tip.textContent = `💡 ${ui.tip || "Tip: open it once while you have a connection before a trip, so the latest version is saved."}`;

  const texts = {
    ready: `✅ ${ui.ready || "Saved on this device — opens without a connection."}`,
    saving: `⏳ ${ui.saving || "Saving for offline use…"}`,
    unsupported: `⚠️ ${ui.unsupported || "This browser can't save the site for offline use."}`,
    disabled: "🛠️ Local preview: add ?offline to the address to try offline mode.", // developers only
  };

  const refresh = async () => {
    const state = getStatus();
    status.textContent = texts[state];
    status.dataset.state = state;
    const build = state === "ready" ? await getBuild() : null;
    version.textContent = build ? (ui.version || "Version {build}").replace("{build}", build) : "";
  };

  unsubscribe?.();
  unsubscribe = onChange(refresh);
  card.append(title, intro, status, version, tip);
  root.appendChild(card);
  refresh();
}
