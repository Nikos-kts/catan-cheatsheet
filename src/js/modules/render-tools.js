// Tools-tab renderer. Wires up the three tool modules inside collapsible
// sections. Tools are self-contained (each exposes `mount(el, ui)`), so
// adding/removing tools here is a one-line change.

import { state } from "./state.js";
import { initAccordions } from "./accordions.js";
import * as diceOdds from "./tools/dice-odds.js";
import * as startingSpot from "./tools/starting-spot.js";
import * as robberTimer from "./tools/robber-timer.js";

const TOOLS = [
  { id: "dice-odds", icon: "🎲", uiKey: "diceOdds", module: diceOdds },
  { id: "starting-spot", icon: "📍", uiKey: "startingSpot", module: startingSpot },
  { id: "robber-timer", icon: "🕵️", uiKey: "robberTimer", module: robberTimer },
];

export function renderTools() {
  const main = document.getElementById("content");
  main.innerHTML = "";

  const ui = (state.data.ui && state.data.ui.tools) || {};

  // Heading
  const desc = document.createElement("div");
  desc.className = "game-description";
  const title = document.createElement("div");
  title.className = "game-description-title";
  title.textContent = ui.heading || "Interactive Tools";
  desc.appendChild(title);
  if (ui.subheading) {
    const p = document.createElement("p");
    p.textContent = ui.subheading;
    desc.appendChild(p);
  }
  main.appendChild(desc);

  TOOLS.forEach((tool) => {
    const toolUi = ui[tool.uiKey] || {};
    const details = document.createElement("details");
    details.className = "subcategory-collapsible section-collapsible";
    details.open = false;

    const summary = document.createElement("summary");
    summary.className = "subcategory-summary section-summary";
    summary.innerHTML = `${tool.icon} ${toolUi.title || tool.id}`;
    details.appendChild(summary);

    const body = document.createElement("div");
    body.className = "collapsible-body";
    const mountPoint = document.createElement("div");
    mountPoint.className = "tool-mount";
    body.appendChild(mountPoint);
    details.appendChild(body);

    main.appendChild(details);

    // Mount tool content lazily the first time the section is opened so that
    // closed tools incur zero DOM cost up front.
    let mounted = false;
    details.addEventListener("toggle", () => {
      if (details.open && !mounted) {
        tool.module.mount(mountPoint, toolUi);
        mounted = true;
        // After mounting, recompute accordion heights.
        const accBody = details.querySelector(".collapsible-body");
        if (accBody) accBody.style.maxHeight = accBody.scrollHeight + "px";
      }
    });
  });

  initAccordions();
}
