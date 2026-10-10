// "New version ready" banner. The new build is already saved and verified; a
// reload switches to it. Nothing reloads on its own, so a game is never interrupted.

import { state } from "./state.js";
import { isUpdateReady, onChange } from "./offline.js";

const BANNER_ID = "update-banner";

function show() {
  if (document.getElementById(BANNER_ID)) return;
  const ui = (state.data && state.data.ui && state.data.ui.tools && state.data.ui.tools.offline) || {};

  const banner = document.createElement("div");
  banner.id = BANNER_ID;
  banner.className = "update-banner";
  banner.setAttribute("role", "status");

  const text = document.createElement("span");
  text.textContent = `✨ ${ui.updateReady || "A new version is ready."}`;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "update-banner-btn";
  button.textContent = ui.updateNow || "Update";
  button.addEventListener("click", () => window.location.reload());

  banner.append(text, button);
  document.body.appendChild(banner);
}

/** Call once at boot. */
export function initUpdateBanner() {
  onChange(() => {
    if (isUpdateReady()) show();
  });
}
